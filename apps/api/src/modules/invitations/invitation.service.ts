import { OrganizationRole, OrganizationStatus, type Prisma } from "@prisma/client";
import { AppError } from "../../lib/errors.js";
import {
  buildInvitationActiveKey,
  buildInvitationPath,
  buildInvitationUrl,
  isInvitationPending,
  normalizeInvitationEmail,
  toSafeInvitationSummary,
  type CreateInvitationResponse,
  type SafeInvitationSummary
} from "../../lib/invitations.js";
import {
  assertVerifiedOrganization,
  lockOrganizationRow
} from "../../lib/organization-access.js";
import { isUniqueConstraintError } from "../../lib/prisma-errors.js";
import { prisma } from "../../lib/prisma.js";
import { generateInvitationToken, hashToken } from "../../lib/tokens.js";
import type { CreateInvitationInput } from "./invitation.schemas.js";

class InvitationRevocationClaimError extends Error {
  constructor() {
    super("Invitation revocation claim failed");
    this.name = "InvitationRevocationClaimError";
  }
}

class InvitationAcceptanceClaimError extends Error {
  constructor() {
    super("Invitation acceptance claim failed");
    this.name = "InvitationAcceptanceClaimError";
  }
}

class InvitationEmailMismatchError extends Error {
  constructor() {
    super("Invitation email mismatch");
    this.name = "InvitationEmailMismatchError";
  }
}

async function retireExpiredActiveInvitation(
  organizationId: string,
  email: string,
  tx: Prisma.TransactionClient
) {
  const activeKey = buildInvitationActiveKey(organizationId, email);
  const existingInvitation = await tx.organizationInvitation.findUnique({
    where: { activeKey }
  });

  if (!existingInvitation) {
    return;
  }

  const now = new Date();
  if (isInvitationPending(existingInvitation, now)) {
    throw new AppError(409, "INVITATION_ALREADY_ACTIVE", "An active invitation already exists for this email");
  }

  if (existingInvitation.activeKey) {
    await tx.organizationInvitation.update({
      where: { id: existingInvitation.id },
      data: { activeKey: null }
    });
  }
}

export async function createOrganizationInvitation(
  organizationId: string,
  inviterId: string,
  input: CreateInvitationInput,
  context: { ipAddress?: string; userAgent?: string } = {}
): Promise<CreateInvitationResponse> {
  await assertVerifiedOrganization(organizationId);

  const normalizedEmail = normalizeInvitationEmail(input.email);
  const existingMember = await prisma.user.findFirst({
    where: {
      email: normalizedEmail,
      memberships: {
        some: { organizationId }
      }
    },
    select: { id: true }
  });

  if (existingMember) {
    throw new AppError(409, "MEMBER_ALREADY_EXISTS", "This email already belongs to an organization member");
  }

  const rawToken = generateInvitationToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000);
  const activeKey = buildInvitationActiveKey(organizationId, normalizedEmail);

  try {
    const invitation = await prisma.$transaction(async (tx) => {
      await lockOrganizationRow(tx, organizationId);
      await retireExpiredActiveInvitation(organizationId, normalizedEmail, tx);

      const createdInvitation = await tx.organizationInvitation.create({
        data: {
          organizationId,
          email: normalizedEmail,
          role: input.role,
          tokenHash,
          activeKey,
          invitedById: inviterId,
          expiresAt
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: inviterId,
          action: "ORGANIZATION_INVITATION_CREATED",
          resourceType: "OrganizationInvitation",
          resourceId: createdInvitation.id,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          details: {
            organizationId,
            email: normalizedEmail,
            role: input.role,
            expiresAt: createdInvitation.expiresAt.toISOString()
          }
        }
      });

      return createdInvitation;
    });

    return {
      invitation: toSafeInvitationSummary(invitation),
      token: rawToken,
      invitationPath: buildInvitationPath(rawToken),
      invitationUrl: buildInvitationUrl(rawToken)
    };
  } catch (error) {
    if (isUniqueConstraintError(error, ["activeKey"])) {
      throw new AppError(409, "INVITATION_ALREADY_ACTIVE", "An active invitation already exists for this email");
    }

    throw error;
  }
}

export async function listOrganizationInvitations(organizationId: string): Promise<SafeInvitationSummary[]> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true }
  });

  if (!organization) {
    throw new AppError(404, "NOT_FOUND", "Organization not found");
  }

  const invitations = await prisma.organizationInvitation.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" }
  });

  return invitations.map((invitation) => toSafeInvitationSummary(invitation));
}

export async function revokeOrganizationInvitation(
  organizationId: string,
  invitationId: string,
  revokerId: string,
  context: { ipAddress?: string; userAgent?: string } = {}
): Promise<SafeInvitationSummary> {
  const invitation = await prisma.organizationInvitation.findUnique({
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
      const claimResult = await tx.organizationInvitation.updateMany({
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
          action: "ORGANIZATION_INVITATION_REVOKED",
          resourceType: "OrganizationInvitation",
          resourceId: invitationId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          details: {
            organizationId
          }
        }
      });

      return tx.organizationInvitation.findUniqueOrThrow({
        where: { id: invitationId }
      });
    });

    return toSafeInvitationSummary(revokedInvitation);
  } catch (error) {
    if (error instanceof InvitationRevocationClaimError) {
      throw new AppError(409, "INVITATION_NOT_REVOCABLE", "This invitation can no longer be revoked");
    }

    throw error;
  }
}

export async function acceptOrganizationInvitation(
  userId: string,
  userEmail: string,
  rawToken: string,
  context: { ipAddress?: string; userAgent?: string } = {}
): Promise<{ organizationId: string; membershipRole: OrganizationRole }> {
  const tokenHash = hashToken(rawToken);
  const normalizedUserEmail = normalizeInvitationEmail(userEmail);
  const now = new Date();

  try {
    return await prisma.$transaction(async (tx) => {
      const invitation = await tx.organizationInvitation.findUnique({
        where: { tokenHash },
        include: {
          organization: {
            select: {
              id: true,
              status: true
            }
          }
        }
      });

      if (!invitation || !isInvitationPending(invitation, now)) {
        throw new InvitationAcceptanceClaimError();
      }

      if (invitation.organization.status !== OrganizationStatus.VERIFIED) {
        throw new InvitationAcceptanceClaimError();
      }

      if (normalizedUserEmail !== invitation.email) {
        throw new InvitationEmailMismatchError();
      }

      await lockOrganizationRow(tx, invitation.organizationId);

      const claimResult = await tx.organizationInvitation.updateMany({
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

      const existingMembership = await tx.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId
          }
        }
      });

      if (existingMembership) {
        throw new AppError(409, "MEMBER_ALREADY_EXISTS", "You are already a member of this organization");
      }

      await tx.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          userId,
          role: invitation.role
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: "ORGANIZATION_INVITATION_ACCEPTED",
          resourceType: "OrganizationInvitation",
          resourceId: invitation.id,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          details: {
            organizationId: invitation.organizationId,
            membershipRole: invitation.role
          }
        }
      });

      return {
        organizationId: invitation.organizationId,
        membershipRole: invitation.role
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
