import { CredentialStatus, type ShareLink } from "@prisma/client";
import { env } from "../config/env.js";
import { computeEffectiveStatus, parseSafeClaims, type SafeClaims } from "./credentials.js";

export type ShareLinkState = "ACTIVE" | "EXPIRED" | "REVOKED" | "EXHAUSTED";
export type VerificationResult = "VALID" | "EXPIRED" | "REVOKED";

export interface SafeShareLinkSummary {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  maxViews: number | null;
  viewCount: number;
  lastViewedAt: Date | null;
  disclosedClaims: string[];
  includeHolderName: boolean;
  includeReferenceNo: boolean;
  state: ShareLinkState;
}

export interface CreateShareLinkResponse {
  shareLink: SafeShareLinkSummary;
  token: string;
  verificationPath: string;
  verificationUrl: string;
}

export interface PublicVerifiedCredential {
  publicId: string;
  title: string;
  credentialType: string;
  effectiveStatus: CredentialStatus;
  issuedAt: Date;
  expiresAt: Date | null;
  revokedAt?: Date;
  organization: {
    name: string;
    slug: string;
  };
  holderName?: string;
  referenceNo?: string;
  claims?: SafeClaims;
}

export interface PublicVerificationResponse {
  result: VerificationResult;
  credential: PublicVerifiedCredential;
}

export function buildVerificationPath(token: string): string {
  return `/verify/${token}`;
}

export function buildVerificationUrl(token: string): string {
  const baseUrl = env.PUBLIC_WEB_URL.replace(/\/$/, "");
  return `${baseUrl}${buildVerificationPath(token)}`;
}

export function computeShareLinkState(
  shareLink: Pick<ShareLink, "revokedAt" | "expiresAt" | "maxViews" | "viewCount">,
  now: Date = new Date()
): ShareLinkState {
  if (shareLink.revokedAt) {
    return "REVOKED";
  }

  if (shareLink.expiresAt.getTime() <= now.getTime()) {
    return "EXPIRED";
  }

  if (shareLink.maxViews !== null && shareLink.viewCount >= shareLink.maxViews) {
    return "EXHAUSTED";
  }

  return "ACTIVE";
}

export function toSafeShareLinkSummary(
  shareLink: ShareLink,
  now: Date = new Date()
): SafeShareLinkSummary {
  return {
    id: shareLink.id,
    createdAt: shareLink.createdAt,
    expiresAt: shareLink.expiresAt,
    revokedAt: shareLink.revokedAt,
    maxViews: shareLink.maxViews,
    viewCount: shareLink.viewCount,
    lastViewedAt: shareLink.lastViewedAt,
    disclosedClaims: shareLink.disclosedClaims,
    includeHolderName: shareLink.includeHolderName,
    includeReferenceNo: shareLink.includeReferenceNo,
    state: computeShareLinkState(shareLink, now)
  };
}

export function computeVerificationResult(effectiveStatus: CredentialStatus): VerificationResult {
  if (effectiveStatus === CredentialStatus.REVOKED) {
    return "REVOKED";
  }

  if (effectiveStatus === CredentialStatus.EXPIRED) {
    return "EXPIRED";
  }

  return "VALID";
}

export function buildPublicVerifiedCredential(input: {
  publicId: string;
  title: string;
  credentialType: string;
  status: CredentialStatus;
  issuedAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  referenceNo: string;
  metadata: unknown;
  organization: { name: string; slug: string };
  holderFirstName?: string;
  holderLastName?: string;
  disclosedClaims: string[];
  includeHolderName: boolean;
  includeReferenceNo: boolean;
}): PublicVerificationResponse {
  const effectiveStatus = computeEffectiveStatus({
    status: input.status,
    expiresAt: input.expiresAt
  });
  const allClaims = parseSafeClaims(input.metadata) ?? {};
  const disclosedClaims: SafeClaims = {};

  for (const claimKey of input.disclosedClaims) {
    if (Object.prototype.hasOwnProperty.call(allClaims, claimKey)) {
      disclosedClaims[claimKey] = allClaims[claimKey] as SafeClaims[string];
    }
  }

  const credential: PublicVerifiedCredential = {
    publicId: input.publicId,
    title: input.title,
    credentialType: input.credentialType,
    effectiveStatus,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
    organization: {
      name: input.organization.name,
      slug: input.organization.slug
    }
  };

  if (effectiveStatus === CredentialStatus.REVOKED && input.revokedAt) {
    credential.revokedAt = input.revokedAt;
  }

  if (input.includeHolderName && input.holderFirstName && input.holderLastName) {
    credential.holderName = `${input.holderFirstName} ${input.holderLastName}`;
  }

  if (input.includeReferenceNo) {
    credential.referenceNo = input.referenceNo;
  }

  if (Object.keys(disclosedClaims).length > 0) {
    credential.claims = disclosedClaims;
  }

  return {
    result: computeVerificationResult(effectiveStatus),
    credential
  };
}

export function getCredentialClaimKeys(metadata: unknown): string[] {
  const claims = parseSafeClaims(metadata);
  return claims ? Object.keys(claims) : [];
}
