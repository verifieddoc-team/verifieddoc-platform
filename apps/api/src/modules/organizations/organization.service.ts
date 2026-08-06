import { NotificationType, OrganizationRole, OrganizationStatus } from "@prisma/client";
import { AppError } from "../../lib/errors.js";
import { createNotification } from "../../lib/notifications.js";
import {
  buildPaginationMetadata,
  toAdminOrganization,
  toPublicOrganization,
  type AdminOrganization,
  type OrganizationMembershipView,
  type PaginatedResult,
  type PublicOrganization
} from "../../lib/organizations.js";
import { normalizePhoneE164 } from "../../lib/phone.js";
import { isUniqueConstraintError } from "../../lib/prisma-errors.js";
import { prisma } from "../../lib/prisma.js";
import { toPublicUser } from "../../lib/users.js";
import type {
  AdminOrganizationListQuery,
  CreateOrganizationInput,
  ReviewOrganizationInput,
  UpdateOrganizationInput
} from "./organization.schemas.js";

class OrganizationReviewClaimError extends Error {
  constructor() {
    super("Organization review claim failed");
    this.name = "OrganizationReviewClaimError";
  }
}

export interface OrganizationApplicationResult {
  organization: PublicOrganization;
  membershipRole: OrganizationRole;
}

export interface OrganizationMemberProfile {
  user: ReturnType<typeof toPublicUser>;
  membershipRole: OrganizationRole;
  joinedAt: Date;
}

export async function applyForOrganization(
  userId: string,
  input: CreateOrganizationInput
): Promise<OrganizationApplicationResult> {
  const existingOrganization = await prisma.organization.findUnique({
    where: { slug: input.slug },
    select: { id: true }
  });

  if (existingOrganization) {
    throw new AppError(409, "SLUG_ALREADY_EXISTS", "An organization with this slug already exists");
  }

  try {
    const organization = await prisma.$transaction(async (tx) => {
      const createdOrganization = await tx.organization.create({
        data: {
          name: input.name,
          slug: input.slug,
          registrationNumber: input.registrationNumber,
          website: input.website,
          contactEmail: input.contactEmail,
          country: input.country,
          description: input.description,
          status: OrganizationStatus.PENDING
        }
      });

      await tx.organizationMember.create({
        data: {
          organizationId: createdOrganization.id,
          userId,
          role: OrganizationRole.ORGANIZATION_ADMIN
        }
      });

      return createdOrganization;
    });

    return {
      organization: toPublicOrganization(organization),
      membershipRole: OrganizationRole.ORGANIZATION_ADMIN
    };
  } catch (error) {
    if (isUniqueConstraintError(error, ["slug"])) {
      throw new AppError(409, "SLUG_ALREADY_EXISTS", "An organization with this slug already exists");
    }

    throw error;
  }
}

export async function listOrganizationsForUser(userId: string): Promise<OrganizationMembershipView[]> {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    include: { organization: true },
    orderBy: { createdAt: "desc" }
  });

  return memberships.map((membership) => ({
    organization: toPublicOrganization(membership.organization),
    membershipRole: membership.role
  }));
}

export async function getOrganizationForMember(
  userId: string,
  organizationId: string
): Promise<OrganizationMembershipView> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId }
  });

  if (!organization) {
    throw new AppError(404, "NOT_FOUND", "Organization not found");
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId
      }
    }
  });

  if (!membership) {
    throw new AppError(403, "FORBIDDEN", "You do not have access to this organization");
  }

  return {
    organization: toPublicOrganization(organization),
    membershipRole: membership.role
  };
}

export async function listOrganizationMembers(organizationId: string): Promise<OrganizationMemberProfile[]> {
  const members = await prisma.organizationMember.findMany({
    where: { organizationId },
    include: {
      user: {
        select: {
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
        }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  return members.map((member) => ({
    user: toPublicUser(member.user),
    membershipRole: member.role,
    joinedAt: member.createdAt
  }));
}

export async function updateOrganizationProfile(
  organizationId: string,
  input: UpdateOrganizationInput,
  actorId: string,
  context: { ipAddress?: string; userAgent?: string } = {}
): Promise<PublicOrganization> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true }
  });

  if (!organization) {
    throw new AppError(404, "NOT_FOUND", "Organization not found");
  }

  let hrContactPhone: string | null | undefined = input.hrContactPhone;
  if (typeof hrContactPhone === "string") {
    hrContactPhone = normalizePhoneE164(hrContactPhone);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.organization.update({
      where: { id: organizationId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.registrationNumber !== undefined
          ? { registrationNumber: input.registrationNumber }
          : {}),
        ...(input.website !== undefined ? { website: input.website } : {}),
        ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail } : {}),
        ...(input.country !== undefined ? { country: input.country } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.industry !== undefined ? { industry: input.industry } : {}),
        ...(input.hrContactName !== undefined ? { hrContactName: input.hrContactName } : {}),
        ...(input.hrContactEmail !== undefined ? { hrContactEmail: input.hrContactEmail } : {}),
        ...(hrContactPhone !== undefined ? { hrContactPhone } : {})
      }
    });

    await tx.auditLog.create({
      data: {
        actorId,
        organizationId,
        action: "ORGANIZATION_UPDATED",
        resourceType: "Organization",
        resourceId: organizationId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        details: {
          updatedFields: Object.keys(input)
        }
      }
    });

    return next;
  });

  return toPublicOrganization(updated);
}

export async function listOrganizationsForAdmin(
  query: AdminOrganizationListQuery
): Promise<PaginatedResult<AdminOrganization>> {
  const where = { status: query.status };
  const skip = (query.page - 1) * query.limit;

  const [total, organizations] = await prisma.$transaction([
    prisma.organization.count({ where }),
    prisma.organization.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip,
      take: query.limit
    })
  ]);

  return {
    data: organizations.map(toAdminOrganization),
    pagination: buildPaginationMetadata(query.page, query.limit, total)
  };
}

export async function reviewOrganization(
  organizationId: string,
  reviewerId: string,
  input: ReviewOrganizationInput,
  context: { ipAddress?: string; userAgent?: string } = {}
): Promise<AdminOrganization> {
  const nextStatus =
    input.decision === "APPROVE" ? OrganizationStatus.VERIFIED : OrganizationStatus.REJECTED;

  try {
    const reviewedOrganization = await prisma.$transaction(async (tx) => {
      const claimResult = await tx.organization.updateMany({
        where: {
          id: organizationId,
          status: OrganizationStatus.PENDING
        },
        data: {
          status: nextStatus,
          reviewedAt: new Date(),
          reviewedById: reviewerId,
          rejectionReason: input.decision === "REJECT" ? input.rejectionReason ?? null : null
        }
      });

      if (claimResult.count !== 1) {
        throw new OrganizationReviewClaimError();
      }

      await tx.auditLog.create({
        data: {
          actorId: reviewerId,
          organizationId,
          action: input.decision === "APPROVE" ? "ORGANIZATION_APPROVED" : "ORGANIZATION_REJECTED",
          resourceType: "Organization",
          resourceId: organizationId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          details: {
            decision: input.decision,
            rejectionReason: input.decision === "REJECT" ? input.rejectionReason : undefined
          }
        }
      });

      const organization = await tx.organization.findUniqueOrThrow({
        where: { id: organizationId }
      });

      const admins = await tx.organizationMember.findMany({
        where: {
          organizationId,
          role: OrganizationRole.ORGANIZATION_ADMIN
        },
        select: { userId: true }
      });

      const notificationType =
        input.decision === "APPROVE"
          ? NotificationType.ORGANIZATION_APPROVED
          : NotificationType.ORGANIZATION_REJECTED;
      const title =
        input.decision === "APPROVE" ? "Organization approved" : "Organization rejected";
      const message =
        input.decision === "APPROVE"
          ? `${organization.name} has been verified and can now issue credentials.`
          : `${organization.name} was rejected${
              input.rejectionReason ? `: ${input.rejectionReason}` : "."
            }`;

      for (const admin of admins) {
        await createNotification(tx, {
          userId: admin.userId,
          type: notificationType,
          title,
          message,
          resourceType: "Organization",
          resourceId: organizationId
        });
      }

      return organization;
    });

    return toAdminOrganization(reviewedOrganization);
  } catch (error) {
    if (error instanceof OrganizationReviewClaimError) {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true }
      });

      if (!organization) {
        throw new AppError(404, "NOT_FOUND", "Organization not found");
      }

      throw new AppError(409, "ORGANIZATION_ALREADY_REVIEWED", "This organization has already been reviewed");
    }

    throw error;
  }
}
