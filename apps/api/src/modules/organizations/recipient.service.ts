import { NotificationType, OrganizationStatus, type Prisma } from "@prisma/client";
import { AppError } from "../../lib/errors.js";
import { normalizeInvitationEmail } from "../../lib/invitations.js";
import { createNotification } from "../../lib/notifications.js";
import {
  assertVerifiedOrganization,
  lockOrganizationRow
} from "../../lib/organization-access.js";
import { isUniqueConstraintError } from "../../lib/prisma-errors.js";
import { prisma } from "../../lib/prisma.js";
import {
  buildRecipientInvitationActiveKey,
  buildRecipientInvitationPath,
  buildRecipientInvitationUrl,
  isRecipientInvitationPending,
  toSafeRecipientInvitationSummary,
  type CreateRecipientInvitationResponse,
  type SafeRecipientInvitationSummary
} from "../../lib/recipient-invitations.js";
import { generateInvitationToken, hashToken } from "../../lib/tokens.js";
import { toPublicUser } from "../../lib/users.js";
import type { CreateRecipientInvitationInput } from "./recipient.schemas.js";

const publicUserSelect = {
  id: true,
  email: true,
  fullName: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  status: true,
  emailVerifiedAt: true,
  createdAt: true,
  updatedAt: true
} as const;

class InvitationRevocationClaimError extends Error {
  constructor() {
    super("Recipient invitation revocation claim failed");
    this.name = "InvitationRevocationClaimError";
  }
}

class InvitationAcceptanceClaimError extends Error {
  constructor() {
    super("Recipient invitation acceptance claim failed");
    this.name = "InvitationAcceptanceClaimError";
  }
}

class InvitationEmailMismatchError extends Error {
  constructor() {
    super("Recipient invitation email mismatch");
    this.name = "InvitationEmailMismatchError";
  }
}

export interface OrganizationRecipientProfile {
  id: string;
  user: ReturnType<typeof toPublicUser>;
  createdAt: Date;
}

async function retireExpiredActiveRecipientInvitation(
  organizationId: string,
  email: string,
  tx: Prisma.TransactionClient
) {
  const activeKey = buildRecipientInvitationActiveKey(organizationId, email);
  const existingInvitation = await tx.recipientInvitation.findUnique({
    where: { activeKey }
  });

  if (!existingInvitation) {
    return;
  }

  const now = new Date();
  if (isRecipientInvitationPending(existingInvitation, now)) {
    throw new AppError(409, "INVITATION_ALREADY_ACTIVE", "An active invitation already exists for this email");
  }

  if (existingInvitation.activeKey) {
    await tx.recipientInvitation.update({
      where: { id: existingInvitation.id },
      data: { activeKey: null }
    });
  }
}

export async function listOrganizationRecipients(
  organizationId: string
): Promise<OrganizationRecipientProfile[]> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true }
  });

  if (!organization) {
    throw new AppError(404, "NOT_FOUND", "Organization not found");
  }

  const recipients = await prisma.organizationRecipient.findMany({
    where: { organizationId },
    include: {
      user: {
        select: publicUserSelect
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return recipients.map((recipient) => ({
    id: recipient.id,
    user: toPublicUser(recipient.user),
    createdAt: recipient.createdAt
  }));
}

export async function createRecipientInvitation(
  organizationId: string,
  inviterId: string,
  input: CreateRecipientInvitationInput,
  context: { ipAddress?: string; userAgent?: string } = {}
): Promise<CreateRecipientInvitationResponse> {
  await assertVerifiedOrganization(organizationId);

  const normalizedEmail = normalizeInvitationEmail(input.email);

  const existingRecipient = await prisma.user.findFirst({
    where: {
      email: normalizedEmail,
      organizationRecipients: {
        some: { organizationId }
      }
    },
    select: { id: true }
  });

  if (existingRecipient) {
    throw new AppError(409, "RECIPIENT_ALREADY_EXISTS", "This email already belongs to an organization recipient");
  }

  const rawToken = generateInvitationToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000);
  const activeKey = buildRecipientInvitationActiveKey(organizationId, normalizedEmail);

  try {
    const invitation = await prisma.$transaction(async (tx) => {
      await lockOrganizationRow(tx, organizationId);
      await retireExpiredActiveRecipientInvitation(organizationId, normalizedEmail, tx);

      const createdInvitation = await tx.recipientInvitation.create({
        data: {
          organizationId,
          email: normalizedEmail,
          tokenHash,
          activeKey,
          invitedById: inviterId,
          expiresAt
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: inviterId,
          organizationId,
          action: "RECIPIENT_INVITATION_CREATED",
          resourceType: "RecipientInvitation",
          resourceId: createdInvitation.id,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          details: {
            organizationId,
            email: normalizedEmail,
            expiresAt: createdInvitation.expiresAt.toISOString()
          }
        }
      });

      return createdInvitation;
    });

    return {
      invitation: toSafeRecipientInvitationSummary(invitation),
      token: rawToken,
      invitationPath: buildRecipientInvitationPath(rawToken),
      invitationUrl: buildRecipientInvitationUrl(rawToken)
    };
  } catch (error) {
    if (isUniqueConstraintError(error, ["activeKey"])) {
      throw new AppError(409, "INVITATION_ALREADY_ACTIVE", "An active invitation already exists for this email");
    }

    throw error;
  }
}

export async function listRecipientInvitations(
  organizationId: string
): Promise<SafeRecipientInvitationSummary[]> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true }
  });

  if (!organization) {
    throw new AppError(404, "NOT_FOUND", "Organization not found");
  }

  const invitations = await prisma.recipientInvitation.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" }
  });

  return invitations.map((invitation) => toSafeRecipientInvitationSummary(invitation));
}

export async function revokeRecipientInvitation(
  organizationId: string,
  invitationId: string,
  revokerId: string,
  context: { ipAddress?: string; userAgent?: string } = {}
): Promise<SafeRecipientInvitationSummary> {
  const invitation = await prisma.recipientInvitation.findUnique({
    where: { id: invitationId }
  });

  if (!invitation || invitation.organizationId !== organizationId) {
    throw new AppError(404, "NOT_FOUND", "Invitation not found");
  }

  const now = new Date();
  if (invitation.acceptedAt) {
    throw new AppError(409, "INVITATION_NOT_REVOCABLE", "Accepted invitations cannot be revoked");
  }

  if (invitation.revokedAt) {
    throw new AppError(409, "INVITATION_NOT_REVOCABLE", "This invitation has already been revoked");
  }

  if (invitation.expiresAt.getTime() <= now.getTime()) {
    throw new AppError(409, "INVITATION_NOT_REVOCABLE", "Expired invitations cannot be revoked");
  }

  try {
    const revokedInvitation = await prisma.$transaction(async (tx) => {
      const claimResult = await tx.recipientInvitation.updateMany({
        where: {
          id: invitationId,
          organizationId,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: now }
        },
        data: {
          revokedAt: now,
          revokedById: revokerId,
          activeKey: null
        }
      });

      if (claimResult.count !== 1) {
        throw new InvitationRevocationClaimError();
      }

      await tx.auditLog.create({
        data: {
          actorId: revokerId,
          organizationId,
          action: "RECIPIENT_INVITATION_REVOKED",
          resourceType: "RecipientInvitation",
          resourceId: invitationId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          details: {
            organizationId
          }
        }
      });

      return tx.recipientInvitation.findUniqueOrThrow({
        where: { id: invitationId }
      });
    });

    return toSafeRecipientInvitationSummary(revokedInvitation);
  } catch (error) {
    if (error instanceof InvitationRevocationClaimError) {
      throw new AppError(409, "INVITATION_NOT_REVOCABLE", "This invitation can no longer be revoked");
    }

    throw error;
  }
}

export async function acceptRecipientInvitation(
  userId: string,
  userEmail: string,
  rawToken: string,
  context: { ipAddress?: string; userAgent?: string } = {}
): Promise<{ organizationId: string; recipientId: string }> {
  const tokenHash = hashToken(rawToken);
  const normalizedUserEmail = normalizeInvitationEmail(userEmail);
  const now = new Date();

  try {
    return await prisma.$transaction(async (tx) => {
      const invitation = await tx.recipientInvitation.findUnique({
        where: { tokenHash },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              status: true
            }
          }
        }
      });

      if (!invitation || !isRecipientInvitationPending(invitation, now)) {
        throw new InvitationAcceptanceClaimError();
      }

      if (invitation.organization.status !== OrganizationStatus.VERIFIED) {
        throw new InvitationAcceptanceClaimError();
      }

      if (normalizedUserEmail !== invitation.email) {
        throw new InvitationEmailMismatchError();
      }

      await lockOrganizationRow(tx, invitation.organizationId);

      const claimResult = await tx.recipientInvitation.updateMany({
        where: {
          id: invitation.id,
          tokenHash,
          acceptedAt: null,
          revokedAt: null,
          activeKey: { not: null },
          expiresAt: { gt: now }
        },
        data: {
          acceptedAt: now,
          acceptedById: userId,
          activeKey: null
        }
      });

      if (claimResult.count !== 1) {
        throw new InvitationAcceptanceClaimError();
      }

      const existingRecipient = await tx.organizationRecipient.findUnique({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId
          }
        }
      });

      if (existingRecipient) {
        throw new AppError(409, "RECIPIENT_ALREADY_EXISTS", "You are already a recipient of this organization");
      }

      // Explicitly create recipient only — never OrganizationMember membership.
      const recipient = await tx.organizationRecipient.create({
        data: {
          organizationId: invitation.organizationId,
          userId
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          organizationId: invitation.organizationId,
          action: "RECIPIENT_INVITATION_ACCEPTED",
          resourceType: "RecipientInvitation",
          resourceId: invitation.id,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          details: {
            organizationId: invitation.organizationId,
            recipientId: recipient.id
          }
        }
      });

      await createNotification(tx, {
        userId,
        type: NotificationType.RECIPIENT_INVITATION,
        title: "Recipient invitation accepted",
        message: `You are now a credential recipient for ${invitation.organization.name}.`,
        resourceType: "OrganizationRecipient",
        resourceId: recipient.id
      });

      return {
        organizationId: invitation.organizationId,
        recipientId: recipient.id
      };
    });
  } catch (error) {
    if (error instanceof InvitationEmailMismatchError) {
      throw new AppError(403, "FORBIDDEN", "You are not authorized to accept this invitation");
    }

    if (error instanceof InvitationAcceptanceClaimError) {
      throw new AppError(404, "INVITATION_UNAVAILABLE", "This invitation is invalid or no longer available");
    }

    if (isUniqueConstraintError(error, ["organizationId", "userId"])) {
      throw new AppError(404, "INVITATION_UNAVAILABLE", "This invitation is invalid or no longer available");
    }

    throw error;
  }
}
