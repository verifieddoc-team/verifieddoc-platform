import { CredentialStatus, type Credential, type Organization, type Prisma } from "@prisma/client";

export type SafeClaimValue = string | number | boolean | null;
export type SafeClaims = Record<string, SafeClaimValue>;

export interface CredentialOrganizationSummary {
  id: string;
  name: string;
  slug: string;
}

export interface SafeCredential {
  id: string;
  publicId: string;
  title: string;
  description: string | null;
  credentialType: string;
  referenceNo: string;
  status: CredentialStatus;
  effectiveStatus: CredentialStatus;
  issuedAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  revocationReason: string | null;
  claims: SafeClaims | null;
  organization: CredentialOrganizationSummary;
}

export interface HolderCredentialSummary {
  id: string;
  publicId: string;
  title: string;
  credentialType: string;
  claims: SafeClaims | null;
  organization: Pick<CredentialOrganizationSummary, "name" | "slug">;
  issuedAt: Date;
  expiresAt: Date | null;
  status: CredentialStatus;
  effectiveStatus: CredentialStatus;
}

export interface OrganizationCredentialSummary extends SafeCredential {
  holder: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export function buildEffectiveStatusFilter(
  status: CredentialStatus | undefined,
  now: Date = new Date()
): Prisma.CredentialWhereInput | undefined {
  if (!status) {
    return undefined;
  }

  switch (status) {
    case CredentialStatus.ACTIVE:
      return {
        status: CredentialStatus.ACTIVE,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
      };
    case CredentialStatus.EXPIRED:
      return {
        OR: [
          { status: CredentialStatus.EXPIRED },
          {
            status: CredentialStatus.ACTIVE,
            expiresAt: { lte: now }
          }
        ]
      };
    case CredentialStatus.REVOKED:
      return { status: CredentialStatus.REVOKED };
    default:
      return undefined;
  }
}

export function buildCredentialListWhere(
  base: Prisma.CredentialWhereInput,
  status: CredentialStatus | undefined,
  now: Date = new Date()
): Prisma.CredentialWhereInput {
  const effectiveStatusFilter = buildEffectiveStatusFilter(status, now);

  if (!effectiveStatusFilter) {
    return base;
  }

  return {
    AND: [base, effectiveStatusFilter]
  };
}

export function buildActiveRevocationClaimWhere(
  credentialId: string,
  organizationId: string,
  now: Date
): Prisma.CredentialWhereInput {
  return {
    id: credentialId,
    organizationId,
    status: CredentialStatus.ACTIVE,
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
  };
}

export function computeEffectiveStatus(credential: {
  status: CredentialStatus;
  expiresAt: Date | null;
}): CredentialStatus {
  if (credential.status === CredentialStatus.REVOKED) {
    return CredentialStatus.REVOKED;
  }

  if (
    credential.status === CredentialStatus.ACTIVE &&
    credential.expiresAt &&
    credential.expiresAt <= new Date()
  ) {
    return CredentialStatus.EXPIRED;
  }

  return credential.status;
}

export function isCredentialRevocable(credential: {
  status: CredentialStatus;
  expiresAt: Date | null;
}): boolean {
  if (credential.status !== CredentialStatus.ACTIVE) {
    return false;
  }

  if (credential.expiresAt && credential.expiresAt <= new Date()) {
    return false;
  }

  return true;
}

export function parseSafeClaims(metadata: unknown): SafeClaims | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const claims: SafeClaims = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      claims[key] = value;
    }
  }

  return Object.keys(claims).length > 0 ? claims : null;
}

export function toCredentialOrganizationSummary(organization: Pick<Organization, "id" | "name" | "slug">): CredentialOrganizationSummary {
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug
  };
}

export function toSafeCredential(
  credential: Credential,
  organization: Pick<Organization, "id" | "name" | "slug">
): SafeCredential {
  return {
    id: credential.id,
    publicId: credential.publicId,
    title: credential.title,
    description: credential.description,
    credentialType: credential.credentialType,
    referenceNo: credential.referenceNo,
    status: credential.status,
    effectiveStatus: computeEffectiveStatus(credential),
    issuedAt: credential.issuedAt,
    expiresAt: credential.expiresAt,
    revokedAt: credential.revokedAt,
    revocationReason: credential.revocationReason,
    claims: parseSafeClaims(credential.metadata),
    organization: toCredentialOrganizationSummary(organization)
  };
}

export function toHolderCredentialSummary(
  credential: Credential,
  organization: Pick<Organization, "name" | "slug">
): HolderCredentialSummary {
  return {
    id: credential.id,
    publicId: credential.publicId,
    title: credential.title,
    credentialType: credential.credentialType,
    claims: parseSafeClaims(credential.metadata),
    organization: {
      name: organization.name,
      slug: organization.slug
    },
    issuedAt: credential.issuedAt,
    expiresAt: credential.expiresAt,
    status: credential.status,
    effectiveStatus: computeEffectiveStatus(credential)
  };
}
