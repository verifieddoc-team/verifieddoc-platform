import { OrganizationRole, OrganizationStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import type { Prisma } from "@prisma/client";
import { AppError } from "./errors.js";

export async function assertVerifiedOrganization(organizationId: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, status: true }
  });

  if (!organization) {
    throw new AppError(404, "NOT_FOUND", "Organization not found");
  }

  if (organization.status !== OrganizationStatus.VERIFIED) {
    throw new AppError(403, "ORGANIZATION_NOT_VERIFIED", "Only verified organizations can manage invitations");
  }

  return organization;
}

export async function lockOrganizationRow(
  tx: Prisma.TransactionClient,
  organizationId: string
): Promise<void> {
  const locked = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "Organization" WHERE "id" = ${organizationId} FOR UPDATE
  `;

  if (locked.length !== 1) {
    throw new AppError(404, "NOT_FOUND", "Organization not found");
  }
}

export async function countOrganizationAdmins(
  tx: Prisma.TransactionClient,
  organizationId: string
): Promise<number> {
  return tx.organizationMember.count({
    where: {
      organizationId,
      role: OrganizationRole.ORGANIZATION_ADMIN
    }
  });
}

export async function getOrganizationMembership(organizationId: string, userId: string) {
  return prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId
      }
    }
  });
}

export async function getOrganizationMemberOrThrow(organizationId: string, userId: string) {
  const membership = await getOrganizationMembership(organizationId, userId);

  if (!membership) {
    const organizationExists = await prisma.organization.count({
      where: { id: organizationId }
    });

    if (organizationExists === 0) {
      throw new AppError(404, "NOT_FOUND", "Organization not found");
    }

    throw new AppError(404, "NOT_FOUND", "Organization member not found");
  }

  return membership;
}
