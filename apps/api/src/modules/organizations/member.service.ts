import { OrganizationRole } from "@prisma/client";
import { AppError } from "../../lib/errors.js";
import {
  countOrganizationAdmins,
  getOrganizationMemberOrThrow,
  lockOrganizationRow
} from "../../lib/organization-access.js";
import { prisma } from "../../lib/prisma.js";
import { toPublicUser } from "../../lib/users.js";
import type { OrganizationMemberProfile } from "./organization.service.js";
import type { UpdateMemberRoleInput } from "./member.schemas.js";

class FinalAdminProtectionError extends Error {
  constructor() {
    super("Final organization admin protection triggered");
    this.name = "FinalAdminProtectionError";
  }
}

class MemberRoleUpdateClaimError extends Error {
  constructor() {
    super("Member role update claim failed");
    this.name = "MemberRoleUpdateClaimError";
  }
}

class MemberRemovalClaimError extends Error {
  constructor() {
    super("Member removal claim failed");
    this.name = "MemberRemovalClaimError";
  }
}

export async function updateOrganizationMemberRole(
  organizationId: string,
  targetUserId: string,
  actorId: string,
  input: UpdateMemberRoleInput,
  context: { ipAddress?: string; userAgent?: string } = {}
): Promise<OrganizationMemberProfile> {
  const membership = await getOrganizationMemberOrThrow(organizationId, targetUserId);

  if (membership.role === input.role) {
    const member = await prisma.organizationMember.findUniqueOrThrow({
      where: {
        organizationId_userId: {
          organizationId,
          userId: targetUserId
        }
      },
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
            createdAt: true,
            updatedAt: true
          }
        }
      }
    });

    return {
      user: toPublicUser(member.user),
      membershipRole: member.role,
      joinedAt: member.createdAt
    };
  }

  try {
    const updatedMember = await prisma.$transaction(async (tx) => {
      await lockOrganizationRow(tx, organizationId);

      const currentMembership = await tx.organizationMember.findUniqueOrThrow({
        where: {
          organizationId_userId: {
            organizationId,
            userId: targetUserId
          }
        }
      });

      if (
        currentMembership.role === OrganizationRole.ORGANIZATION_ADMIN &&
        input.role !== OrganizationRole.ORGANIZATION_ADMIN
      ) {
        const adminCount = await countOrganizationAdmins(tx, organizationId);
        if (adminCount <= 1) {
          throw new FinalAdminProtectionError();
        }
      }

      const claimResult = await tx.organizationMember.updateMany({
        where: {
          organizationId,
          userId: targetUserId,
          role: currentMembership.role
        },
        data: {
          role: input.role
        }
      });

      if (claimResult.count !== 1) {
        throw new MemberRoleUpdateClaimError();
      }

      await tx.auditLog.create({
        data: {
          actorId,
          organizationId,
          action: "ORGANIZATION_MEMBER_ROLE_UPDATED",
          resourceType: "OrganizationMember",
          resourceId: currentMembership.id,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          details: {
            organizationId,
            userId: targetUserId,
            previousRole: currentMembership.role,
            nextRole: input.role
          }
        }
      });

      return tx.organizationMember.findUniqueOrThrow({
        where: {
          organizationId_userId: {
            organizationId,
            userId: targetUserId
          }
        },
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
              createdAt: true,
              updatedAt: true
            }
          }
        }
      });
    });

    return {
      user: toPublicUser(updatedMember.user),
      membershipRole: updatedMember.role,
      joinedAt: updatedMember.createdAt
    };
  } catch (error) {
    if (error instanceof FinalAdminProtectionError) {
      throw new AppError(409, "FINAL_ADMIN_REQUIRED", "The organization must retain at least one admin");
    }

    if (error instanceof MemberRoleUpdateClaimError) {
      throw new AppError(409, "MEMBER_UPDATE_CONFLICT", "The member role could not be updated");
    }

    throw error;
  }
}

export async function removeOrganizationMember(
  organizationId: string,
  targetUserId: string,
  actorId: string,
  context: { ipAddress?: string; userAgent?: string } = {}
): Promise<void> {
  await getOrganizationMemberOrThrow(organizationId, targetUserId);

  try {
    await prisma.$transaction(async (tx) => {
      await lockOrganizationRow(tx, organizationId);

      const currentMembership = await tx.organizationMember.findUniqueOrThrow({
        where: {
          organizationId_userId: {
            organizationId,
            userId: targetUserId
          }
        }
      });

      if (currentMembership.role === OrganizationRole.ORGANIZATION_ADMIN) {
        const adminCount = await countOrganizationAdmins(tx, organizationId);
        if (adminCount <= 1) {
          throw new FinalAdminProtectionError();
        }
      }

      const claimResult = await tx.organizationMember.deleteMany({
        where: {
          organizationId,
          userId: targetUserId,
          role: currentMembership.role
        }
      });

      if (claimResult.count !== 1) {
        throw new MemberRemovalClaimError();
      }

      await tx.auditLog.create({
        data: {
          actorId,
          organizationId,
          action: "ORGANIZATION_MEMBER_REMOVED",
          resourceType: "OrganizationMember",
          resourceId: currentMembership.id,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          details: {
            organizationId,
            userId: targetUserId,
            removedRole: currentMembership.role
          }
        }
      });
    });
  } catch (error) {
    if (error instanceof FinalAdminProtectionError) {
      throw new AppError(409, "FINAL_ADMIN_REQUIRED", "The organization must retain at least one admin");
    }

    if (error instanceof MemberRemovalClaimError) {
      throw new AppError(409, "MEMBER_REMOVAL_CONFLICT", "The member could not be removed");
    }

    throw error;
  }
}
