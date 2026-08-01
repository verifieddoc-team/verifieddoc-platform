import {
  CredentialStatus,
  OrganizationRole,
  OrganizationStatus
} from "@prisma/client";
import { AppError } from "../../lib/errors.js";
import {
  buildActiveRevocationClaimWhere,
  buildCredentialListWhere,
  isCredentialRevocable,
  toHolderCredentialSummary,
  toSafeCredential,
  type HolderCredentialSummary,
  type OrganizationCredentialSummary,
  type SafeCredential
} from "../../lib/credentials.js";
import { buildPaginationMetadata, type PaginatedResult } from "../../lib/organizations.js";
import { isUniqueConstraintError } from "../../lib/prisma-errors.js";
import { prisma } from "../../lib/prisma.js";
import type {
  HolderCredentialListQuery,
  IssueCredentialInput,
  OrganizationCredentialListQuery,
  RevokeCredentialInput
} from "./credential.schemas.js";

class CredentialRevocationClaimError extends Error {
  constructor() {
    super("Credential revocation claim failed");
    this.name = "CredentialRevocationClaimError";
  }
}

async function getOrganizationMembership(userId: string, organizationId: string) {
  return prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId
      }
    }
  });
}

async function assertOrganizationIssuerAccess(userId: string, organizationId: string) {
  const membership = await getOrganizationMembership(userId, organizationId);

  if (!membership) {
    const organizationExists = await prisma.organization.count({
      where: { id: organizationId }
    });

    if (organizationExists === 0) {
      throw new AppError(404, "NOT_FOUND", "Organization not found");
    }

    throw new AppError(403, "FORBIDDEN", "You do not have access to this organization");
  }

  if (
    membership.role !== OrganizationRole.ORGANIZATION_ADMIN &&
    membership.role !== OrganizationRole.ORGANIZATION_ISSUER
  ) {
    throw new AppError(403, "FORBIDDEN", "Insufficient organization permissions");
  }

  return membership;
}

export async function issueCredential(
  organizationId: string,
  issuerId: string,
  input: IssueCredentialInput,
  context: { ipAddress?: string; userAgent?: string } = {}
): Promise<SafeCredential> {
  await assertOrganizationIssuerAccess(issuerId, organizationId);
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId }
  });

  if (organization.status !== OrganizationStatus.VERIFIED) {
    throw new AppError(403, "ORGANIZATION_NOT_VERIFIED", "Only verified organizations can issue credentials");
  }

  const holder = await prisma.user.findUnique({
    where: { email: input.holderEmail },
    select: { id: true }
  });

  if (!holder) {
    throw new AppError(404, "HOLDER_NOT_FOUND", "No registered holder was found for this email");
  }

  try {
    const credential = await prisma.$transaction(async (tx) => {
      const createdCredential = await tx.credential.create({
        data: {
          title: input.title,
          description: input.description,
          credentialType: input.credentialType,
          referenceNo: input.referenceNo,
          issuedAt: input.issuedAt,
          expiresAt: input.expiresAt,
          metadata: input.claims ?? undefined,
          organizationId,
          holderId: holder.id,
          issuedById: issuerId,
          status: CredentialStatus.ACTIVE
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: issuerId,
          organizationId,
          action: "CREDENTIAL_ISSUED",
          resourceType: "Credential",
          resourceId: createdCredential.id,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          details: {
            organizationId,
            holderId: holder.id,
            referenceNo: input.referenceNo
          }
        }
      });

      return createdCredential;
    });

    return toSafeCredential(credential, organization);
  } catch (error) {
    if (isUniqueConstraintError(error, ["organizationId", "referenceNo"])) {
      throw new AppError(409, "REFERENCE_ALREADY_EXISTS", "A credential with this reference number already exists for the organization");
    }

    throw error;
  }
}

export async function listHolderCredentials(
  holderId: string,
  query: HolderCredentialListQuery
): Promise<PaginatedResult<HolderCredentialSummary>> {
  const where = buildCredentialListWhere({ holderId }, query.status);
  const skip = (query.page - 1) * query.limit;

  const [total, credentials] = await prisma.$transaction([
    prisma.credential.count({ where }),
    prisma.credential.findMany({
      where,
      include: {
        organization: {
          select: {
            name: true,
            slug: true
          }
        }
      },
      orderBy: { issuedAt: "desc" },
      skip,
      take: query.limit
    })
  ]);

  return {
    data: credentials.map((credential) => toHolderCredentialSummary(credential, credential.organization)),
    pagination: buildPaginationMetadata(query.page, query.limit, total)
  };
}

export async function getCredentialForAuthorizedUser(
  userId: string,
  credentialId: string
): Promise<SafeCredential> {
  const credential = await prisma.credential.findUnique({
    where: { id: credentialId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  });

  if (!credential) {
    throw new AppError(404, "NOT_FOUND", "Credential not found");
  }

  if (credential.holderId === userId) {
    return toSafeCredential(credential, credential.organization);
  }

  const membership = await getOrganizationMembership(userId, credential.organizationId);
  if (
    membership &&
    (membership.role === OrganizationRole.ORGANIZATION_ADMIN ||
      membership.role === OrganizationRole.ORGANIZATION_ISSUER)
  ) {
    return toSafeCredential(credential, credential.organization);
  }

  throw new AppError(403, "FORBIDDEN", "You do not have access to this credential");
}

export async function listOrganizationCredentials(
  userId: string,
  organizationId: string,
  query: OrganizationCredentialListQuery
): Promise<PaginatedResult<OrganizationCredentialSummary>> {
  await assertOrganizationIssuerAccess(userId, organizationId);

  const where = buildCredentialListWhere(
    {
      organizationId,
      ...(query.holderId ? { holderId: query.holderId } : {})
    },
    query.status
  );
  const skip = (query.page - 1) * query.limit;

  const [total, credentials] = await prisma.$transaction([
    prisma.credential.count({ where }),
    prisma.credential.findMany({
      where,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        holder: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { issuedAt: "desc" },
      skip,
      take: query.limit
    })
  ]);

  return {
    data: credentials.map((credential) => ({
      ...toSafeCredential(credential, credential.organization),
      holder: {
        id: credential.holder.id,
        email: credential.holder.email,
        firstName: credential.holder.firstName,
        lastName: credential.holder.lastName
      }
    })),
    pagination: buildPaginationMetadata(query.page, query.limit, total)
  };
}

async function getCredentialForOrganizationAction(credentialId: string, organizationId: string) {
  const credential = await prisma.credential.findUnique({
    where: { id: credentialId }
  });

  if (!credential) {
    throw new AppError(404, "NOT_FOUND", "Credential not found");
  }

  if (credential.organizationId !== organizationId) {
    throw new AppError(403, "FORBIDDEN", "You do not have access to this credential");
  }

  return credential;
}

export async function revokeCredential(
  userId: string,
  organizationId: string,
  credentialId: string,
  input: RevokeCredentialInput,
  context: { ipAddress?: string; userAgent?: string } = {}
): Promise<SafeCredential> {
  await assertOrganizationIssuerAccess(userId, organizationId);

  const existingCredential = await getCredentialForOrganizationAction(credentialId, organizationId);

  if (!isCredentialRevocable(existingCredential)) {
    throw new AppError(409, "CREDENTIAL_NOT_ACTIVE", "Only active, unexpired credentials may be revoked");
  }

  try {
    const revokedCredential = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const claimResult = await tx.credential.updateMany({
        where: buildActiveRevocationClaimWhere(credentialId, organizationId, now),
        data: {
          status: CredentialStatus.REVOKED,
          revokedAt: now,
          revokedById: userId,
          revocationReason: input.reason
        }
      });

      if (claimResult.count !== 1) {
        throw new CredentialRevocationClaimError();
      }

      await tx.auditLog.create({
        data: {
          actorId: userId,
          organizationId,
          action: "CREDENTIAL_REVOKED",
          resourceType: "Credential",
          resourceId: credentialId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          details: {
            organizationId,
            reason: input.reason
          }
        }
      });

      return tx.credential.findUniqueOrThrow({
        where: { id: credentialId },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      });
    });

    return toSafeCredential(revokedCredential, revokedCredential.organization);
  } catch (error) {
    if (error instanceof CredentialRevocationClaimError) {
      throw new AppError(409, "CREDENTIAL_NOT_ACTIVE", "Only active, unexpired credentials may be revoked");
    }

    throw error;
  }
}
