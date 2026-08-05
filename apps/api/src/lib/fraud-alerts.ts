import {
  FraudAlertSeverity,
  FraudAlertStatus,
  FraudAlertType,
  VerificationMethod,
  VerificationOutcome,
  type FraudAlert,
  type Prisma
} from "@prisma/client";
import { notifyPlatformAdminsOfFraudAlert } from "./notifications.js";
import { prisma } from "./prisma.js";

export type FraudAlertDbClient = Prisma.TransactionClient | typeof prisma;

const MULTIPLE_FAILURE_WINDOW_MS = 15 * 60 * 1000;
const MULTIPLE_FAILURE_THRESHOLD = 5;

/** Configurable threshold for HIGH_RISK_DOCUMENT (repeated invalids). */
export const HIGH_RISK_INVALID_THRESHOLD = Math.max(
  2,
  Number.parseInt(process.env.FRAUD_HIGH_RISK_INVALID_THRESHOLD ?? "8", 10) || 8
);
const HIGH_RISK_WINDOW_MS = 60 * 60 * 1000;

export interface UpsertFraudAlertInput {
  type: FraudAlertType;
  severity: FraudAlertSeverity;
  title: string;
  description: string;
  credentialId?: string | null;
  verificationEventId?: string | null;
  actorId?: string | null;
  ipAddress?: string | null;
  metadata?: Prisma.InputJsonValue;
}

function buildOpenAlertWhere(
  type: FraudAlertType,
  input: Pick<UpsertFraudAlertInput, "actorId" | "ipAddress" | "credentialId"> & {
    metadataKey?: string;
    metadataValue?: string;
  }
): Prisma.FraudAlertWhereInput {
  const where: Prisma.FraudAlertWhereInput = {
    type,
    status: FraudAlertStatus.OPEN
  };

  if (input.credentialId) {
    where.credentialId = input.credentialId;
  } else if (input.actorId) {
    where.actorId = input.actorId;
  } else if (input.ipAddress) {
    where.ipAddress = input.ipAddress;
  }

  return where;
}

async function upsertFraudAlertInClient(
  db: FraudAlertDbClient,
  input: UpsertFraudAlertInput
): Promise<{ alert: FraudAlert; created: boolean }> {
  const existing = await db.fraudAlert.findFirst({
    where: buildOpenAlertWhere(input.type, input),
    orderBy: { lastSeenAt: "desc" }
  });

  const now = new Date();

  if (existing) {
    const alert = await db.fraudAlert.update({
      where: { id: existing.id },
      data: {
        occurrenceCount: { increment: 1 },
        lastSeenAt: now,
        description: input.description,
        verificationEventId: input.verificationEventId ?? existing.verificationEventId,
        metadata: input.metadata ?? existing.metadata ?? undefined,
        severity: input.severity
      }
    });
    return { alert, created: false };
  }

  const alert = await db.fraudAlert.create({
    data: {
      type: input.type,
      severity: input.severity,
      status: FraudAlertStatus.OPEN,
      title: input.title,
      description: input.description,
      credentialId: input.credentialId ?? null,
      verificationEventId: input.verificationEventId ?? null,
      actorId: input.actorId ?? null,
      ipAddress: input.ipAddress ?? null,
      metadata: input.metadata,
      occurrenceCount: 1,
      firstSeenAt: now,
      lastSeenAt: now
    }
  });

  return { alert, created: true };
}

/**
 * Deduplicate OPEN alerts by type + credential/actor/IP.
 * Uses a Serializable transaction when called outside an existing tx to reduce
 * concurrent duplicate OPEN rows under load.
 */
export async function upsertFraudAlert(
  db: FraudAlertDbClient,
  input: UpsertFraudAlertInput
): Promise<FraudAlert> {
  const run = async (client: FraudAlertDbClient) => {
    const { alert, created } = await upsertFraudAlertInClient(client, input);
    if (created) {
      await notifyPlatformAdminsOfFraudAlert(client, {
        id: alert.id,
        type: alert.type,
        title: alert.title,
        severity: alert.severity
      });
    }
    return alert;
  };

  // Nested transactions are not supported; reuse the provided client when already transactional.
  if (db !== prisma) {
    return run(db);
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction((tx) => run(tx), {
        isolationLevel: "Serializable"
      });
    } catch (error) {
      const code =
        typeof error === "object" && error && "code" in error
          ? String((error as { code?: string }).code)
          : "";
      if (code === "P2034" && attempt < 2) {
        continue;
      }
      throw error;
    }
  }

  return run(prisma);
}

export async function raiseRevokedCredentialAccessAlert(
  db: FraudAlertDbClient,
  input: {
    credentialId: string;
    actorId?: string | null;
    ipAddress?: string | null;
    verificationEventId?: string | null;
  }
): Promise<FraudAlert> {
  return upsertFraudAlert(db, {
    type: FraudAlertType.REVOKED_CREDENTIAL_ACCESS,
    severity: FraudAlertSeverity.HIGH,
    title: "Revoked credential access attempt",
    description: "A verification attempt targeted a revoked credential",
    credentialId: input.credentialId,
    actorId: input.actorId,
    ipAddress: input.ipAddress,
    verificationEventId: input.verificationEventId
  });
}

export async function raiseFileHashMismatchAlert(
  db: FraudAlertDbClient,
  input: {
    credentialId?: string | null;
    actorId?: string | null;
    ipAddress?: string | null;
    verificationEventId?: string | null;
    metadata?: Prisma.InputJsonValue;
  }
): Promise<FraudAlert> {
  return upsertFraudAlert(db, {
    type: FraudAlertType.FILE_HASH_MISMATCH,
    severity: FraudAlertSeverity.HIGH,
    title: "File hash mismatch",
    description: "An uploaded file hash did not match a known credential artifact",
    credentialId: input.credentialId,
    actorId: input.actorId,
    ipAddress: input.ipAddress,
    verificationEventId: input.verificationEventId,
    metadata: input.metadata
  });
}

export async function raiseHighRiskDocumentAlert(
  db: FraudAlertDbClient,
  input: {
    credentialId?: string | null;
    actorId?: string | null;
    ipAddress?: string | null;
    description?: string;
    metadata?: Prisma.InputJsonValue;
  }
): Promise<FraudAlert> {
  return upsertFraudAlert(db, {
    type: FraudAlertType.HIGH_RISK_DOCUMENT,
    severity: FraudAlertSeverity.CRITICAL,
    title: "High risk document detected",
    description: input.description ?? "A document was flagged as high risk",
    credentialId: input.credentialId,
    actorId: input.actorId,
    ipAddress: input.ipAddress,
    metadata: input.metadata
  });
}

export async function maybeRaiseMultipleVerificationFailuresAlert(
  db: FraudAlertDbClient,
  input: {
    verifierId?: string | null;
    ipAddress?: string | null;
    verificationEventId?: string | null;
  }
): Promise<FraudAlert | null> {
  if (!input.verifierId && !input.ipAddress) {
    return null;
  }

  const since = new Date(Date.now() - MULTIPLE_FAILURE_WINDOW_MS);
  const failureFilter: Prisma.VerificationEventWhereInput = {
    createdAt: { gte: since },
    result: { in: [VerificationOutcome.INVALID, VerificationOutcome.NOT_FOUND] },
    OR: [
      ...(input.verifierId ? [{ verifierId: input.verifierId }] : []),
      ...(input.ipAddress ? [{ ipAddress: input.ipAddress }] : [])
    ]
  };

  const failureCount = await db.verificationEvent.count({
    where: failureFilter
  });

  if (failureCount < MULTIPLE_FAILURE_THRESHOLD) {
    return null;
  }

  return upsertFraudAlert(db, {
    type: FraudAlertType.MULTIPLE_VERIFICATION_FAILURES,
    severity: FraudAlertSeverity.MEDIUM,
    title: "Multiple verification failures",
    description: `${failureCount} INVALID/NOT_FOUND verification attempts within 15 minutes`,
    actorId: input.verifierId,
    ipAddress: input.ipAddress,
    verificationEventId: input.verificationEventId,
    metadata: {
      failureCount,
      windowMinutes: 15
    }
  });
}

/**
 * HIGH_RISK_DOCUMENT: repeated INVALID/NOT_FOUND against the same publicId,
 * organization, or file hash within a configurable window.
 */
export async function maybeRaiseHighRiskDocumentAlert(
  db: FraudAlertDbClient,
  input: {
    credentialPublicId?: string | null;
    organizationId?: string | null;
    checksumSha256?: string | null;
    credentialId?: string | null;
    actorId?: string | null;
    ipAddress?: string | null;
    verificationEventId?: string | null;
  }
): Promise<FraudAlert | null> {
  const since = new Date(Date.now() - HIGH_RISK_WINDOW_MS);
  const scopes: Array<{ label: string; where: Prisma.VerificationEventWhereInput; key: string; value: string }> =
    [];

  if (input.credentialPublicId) {
    scopes.push({
      label: "publicId",
      key: "credentialPublicId",
      value: input.credentialPublicId,
      where: {
        createdAt: { gte: since },
        result: { in: [VerificationOutcome.INVALID, VerificationOutcome.NOT_FOUND] },
        credentialPublicIdSnapshot: input.credentialPublicId
      }
    });
  }

  if (input.organizationId) {
    scopes.push({
      label: "organizationId",
      key: "organizationId",
      value: input.organizationId,
      where: {
        createdAt: { gte: since },
        result: { in: [VerificationOutcome.INVALID, VerificationOutcome.NOT_FOUND] },
        organizationId: input.organizationId
      }
    });
  }

  if (input.checksumSha256) {
    scopes.push({
      label: "checksumSha256",
      key: "checksumSha256",
      value: input.checksumSha256,
      where: {
        createdAt: { gte: since },
        result: { in: [VerificationOutcome.INVALID, VerificationOutcome.NOT_FOUND] },
        method: VerificationMethod.FILE_HASH
      }
    });
  }

  for (const scope of scopes) {
    let failureCount = await db.verificationEvent.count({ where: scope.where });

    // Hash scope cannot filter by checksum in VerificationEvent columns; use metadata-linked count via credentialId when available.
    if (scope.key === "checksumSha256" && input.credentialId) {
      failureCount = await db.verificationEvent.count({
        where: {
          createdAt: { gte: since },
          result: { in: [VerificationOutcome.INVALID, VerificationOutcome.NOT_FOUND] },
          credentialId: input.credentialId
        }
      });
    } else if (scope.key === "checksumSha256" && !input.credentialId) {
      // Without a persisted checksum column on VerificationEvent, skip weak actor/IP proxies
      // for HIGH_RISK (FILE_HASH_MISMATCH already covers unmatched uploads).
      continue;
    }

    if (failureCount < HIGH_RISK_INVALID_THRESHOLD) {
      continue;
    }

    return raiseHighRiskDocumentAlert(db, {
      credentialId: input.credentialId,
      actorId: input.actorId,
      ipAddress: input.ipAddress,
      description: `${failureCount} INVALID/NOT_FOUND attempts for the same ${scope.label} within 60 minutes`,
      metadata: {
        scope: scope.key,
        scopeValue: scope.value,
        failureCount,
        threshold: HIGH_RISK_INVALID_THRESHOLD,
        windowMinutes: 60,
        verificationEventId: input.verificationEventId ?? null
      }
    });
  }

  return null;
}

/** Run post-verification fraud rules for INVALID/NOT_FOUND outcomes. */
export async function evaluateFailureFraudRules(
  db: FraudAlertDbClient,
  input: {
    result: VerificationOutcome;
    verifierId?: string | null;
    ipAddress?: string | null;
    verificationEventId?: string | null;
    credentialPublicId?: string | null;
    organizationId?: string | null;
    checksumSha256?: string | null;
    credentialId?: string | null;
  }
): Promise<void> {
  if (
    input.result !== VerificationOutcome.INVALID &&
    input.result !== VerificationOutcome.NOT_FOUND
  ) {
    return;
  }

  await maybeRaiseMultipleVerificationFailuresAlert(db, {
    verifierId: input.verifierId,
    ipAddress: input.ipAddress,
    verificationEventId: input.verificationEventId
  });

  await maybeRaiseHighRiskDocumentAlert(db, {
    credentialPublicId: input.credentialPublicId,
    organizationId: input.organizationId,
    checksumSha256: input.checksumSha256,
    credentialId: input.credentialId,
    actorId: input.verifierId,
    ipAddress: input.ipAddress,
    verificationEventId: input.verificationEventId
  });
}
