import {
  CredentialStatus,
  NotificationType,
  VerificationMethod,
  VerificationOutcome,
  type Prisma,
  type VerificationEvent
} from "@prisma/client";
import {
  raiseFileHashMismatchAlert,
  raiseRevokedCredentialAccessAlert
} from "./fraud-alerts.js";
import { createNotification } from "./notifications.js";
import { computeEffectiveStatus } from "./credentials.js";
import { prisma } from "./prisma.js";
import type { VerificationResult } from "./share-links.js";

/** Verifier-authenticated API result values (superset of public VerificationResult). */
export type VerifierApiResult = "VALID" | "EXPIRED" | "REVOKED" | "INVALID" | "NOT_FOUND";

export function mapPublicResultToOutcome(result: VerificationResult): VerificationOutcome {
  switch (result) {
    case "VALID":
      return VerificationOutcome.VERIFIED;
    case "EXPIRED":
      return VerificationOutcome.EXPIRED;
    case "REVOKED":
      return VerificationOutcome.REVOKED;
    default:
      return VerificationOutcome.INVALID;
  }
}

export function mapOutcomeToVerifierApiResult(outcome: VerificationOutcome): VerifierApiResult {
  switch (outcome) {
    case VerificationOutcome.VERIFIED:
      return "VALID";
    case VerificationOutcome.EXPIRED:
      return "EXPIRED";
    case VerificationOutcome.REVOKED:
      return "REVOKED";
    case VerificationOutcome.INVALID:
      return "INVALID";
    case VerificationOutcome.NOT_FOUND:
      return "NOT_FOUND";
    default:
      return "INVALID";
  }
}

export function mapCredentialToOutcome(credential: {
  status: CredentialStatus;
  expiresAt: Date | null;
}): VerificationOutcome {
  const effective = computeEffectiveStatus(credential);
  if (effective === CredentialStatus.REVOKED) {
    return VerificationOutcome.REVOKED;
  }
  if (effective === CredentialStatus.EXPIRED) {
    return VerificationOutcome.EXPIRED;
  }
  return VerificationOutcome.VERIFIED;
}

export async function recordVerificationEvent(
  input: {
    verifierId?: string | null;
    credentialId?: string | null;
    organizationId?: string | null;
    shareLinkId?: string | null;
    verificationRequestId?: string | null;
    method: VerificationMethod;
    result: VerificationOutcome;
    credentialPublicIdSnapshot?: string | null;
    ipAddress?: string;
    userAgent?: string;
  },
  tx?: Prisma.TransactionClient
): Promise<VerificationEvent> {
  const client = tx ?? prisma;

  return client.verificationEvent.create({
    data: {
      verifierId: input.verifierId ?? null,
      credentialId: input.credentialId ?? null,
      organizationId: input.organizationId ?? null,
      shareLinkId: input.shareLinkId ?? null,
      verificationRequestId: input.verificationRequestId ?? null,
      method: input.method,
      result: input.result,
      credentialPublicIdSnapshot: input.credentialPublicIdSnapshot ?? null,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    }
  });
}

export async function createRevokedCredentialAccessAlert(input: {
  credentialId: string;
  verificationEventId: string;
  actorId?: string | null;
  ipAddress?: string;
  metadata?: Prisma.InputJsonValue;
  tx?: Prisma.TransactionClient;
}) {
  return raiseRevokedCredentialAccessAlert(input.tx ?? prisma, {
    credentialId: input.credentialId,
    verificationEventId: input.verificationEventId,
    actorId: input.actorId,
    ipAddress: input.ipAddress
  });
}

export async function createFileHashMismatchAlert(input: {
  verificationEventId: string;
  actorId?: string | null;
  ipAddress?: string;
  metadata?: Prisma.InputJsonValue;
  tx?: Prisma.TransactionClient;
}) {
  return raiseFileHashMismatchAlert(input.tx ?? prisma, {
    verificationEventId: input.verificationEventId,
    actorId: input.actorId,
    ipAddress: input.ipAddress,
    metadata: input.metadata
  });
}

export async function notifyHolderShareLinkUsed(input: {
  holderId: string;
  shareLinkId: string;
  credentialTitle: string;
  tx?: Prisma.TransactionClient;
}) {
  return createNotification(input.tx ?? prisma, {
    userId: input.holderId,
    type: NotificationType.SHARE_LINK_USED,
    title: "Share link used",
    message: `Your share link for "${input.credentialTitle}" was used for verification.`,
    resourceType: "ShareLink",
    resourceId: input.shareLinkId
  });
}

export function startOfMonth(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}
