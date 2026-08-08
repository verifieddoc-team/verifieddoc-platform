import {
  VerificationMethod,
  VerificationOutcome,
  type VerificationEvent
} from "@prisma/client";
import { AppError } from "../../lib/errors.js";
import {
  buildPublicVerifiedCredential,
  buildVerificationPath,
  buildVerificationUrl,
  computeShareLinkState,
  getCredentialClaimKeys,
  toSafeShareLinkSummary,
  type CreateShareLinkResponse,
  type PublicVerificationResponse,
  type SafeShareLinkSummary
} from "../../lib/share-links.js";
import { evaluateFailureFraudRules } from "../../lib/fraud-alerts.js";
import {
  createRevokedCredentialAccessAlert,
  mapPublicResultToOutcome,
  mapOutcomeToVerifierApiResult,
  notifyHolderShareLinkUsed,
  recordVerificationEvent,
  type VerifierApiResult
} from "../../lib/verification.js";
import { generateShareToken, hashToken } from "../../lib/tokens.js";
import { prisma } from "../../lib/prisma.js";
import { assertCredentialHolder, getShareLinkForCredential } from "./share-link.access.js";
import type { CreateShareLinkInput } from "./share-link.schemas.js";

class ShareLinkRevocationClaimError extends Error {
  constructor() {
    super("Share link revocation claim failed");
    this.name = "ShareLinkRevocationClaimError";
  }
}

class ShareLinkViewClaimError extends Error {
  constructor() {
    super("Share link view claim failed");
    this.name = "ShareLinkViewClaimError";
  }
}

const shareLinkCredentialInclude = {
  credential: {
    include: {
      organization: {
        select: {
          name: true,
          slug: true
        }
      },
      holder: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    }
  }
} as const;

export interface ShareTokenVerificationOptions {
  ipAddress?: string;
  userAgent?: string;
  verifierId?: string | null;
  /** Defaults to SHARE_TOKEN. Verifier QR verification passes QR. */
  method?: typeof VerificationMethod.SHARE_TOKEN | typeof VerificationMethod.QR;
}

/**
 * Internal share-token verification result.
 * Public GET /verify/:token still returns only PublicVerificationResponse and 404s
 * when shareLinkUnavailable is true. Verifier endpoints expose the wider result set.
 */
export interface ShareTokenVerificationResult {
  shareLinkUnavailable: boolean;
  /** Present when the share link was successfully claimed (public 200 path). */
  publicResponse: PublicVerificationResponse | null;
  result: VerifierApiResult;
  outcome: VerificationOutcome;
  verificationEvent: VerificationEvent;
}

function validateDisclosedClaims(credentialMetadata: unknown, disclosedClaims: string[]) {
  if (disclosedClaims.length === 0) {
    return;
  }

  const availableClaimKeys = new Set(getCredentialClaimKeys(credentialMetadata));
  const missingClaims = disclosedClaims.filter((claimKey) => !availableClaimKeys.has(claimKey));

  if (missingClaims.length > 0) {
    throw new AppError(
      400,
      "INVALID_DISCLOSED_CLAIMS",
      `The following disclosed claims are not present on this credential: ${missingClaims.join(", ")}`
    );
  }
}

export async function createShareLink(
  userId: string,
  credentialId: string,
  input: CreateShareLinkInput,
  context: { ipAddress?: string; userAgent?: string } = {}
): Promise<CreateShareLinkResponse> {
  const credential = await assertCredentialHolder(userId, credentialId);
  validateDisclosedClaims(credential.metadata, input.disclosedClaims);

  const rawToken = generateShareToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000);

  const shareLink = await prisma.$transaction(async (tx) => {
    const createdShareLink = await tx.shareLink.create({
      data: {
        tokenHash,
        credentialId,
        createdById: userId,
        expiresAt,
        maxViews: input.maxViews ?? null,
        disclosedClaims: input.disclosedClaims,
        includeHolderName: input.includeHolderName,
        includeReferenceNo: input.includeReferenceNo
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        organizationId: credential.organizationId,
        action: "SHARE_LINK_CREATED",
        resourceType: "ShareLink",
        resourceId: createdShareLink.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        details: {
          credentialId,
          expiresAt: createdShareLink.expiresAt.toISOString(),
          maxViews: createdShareLink.maxViews,
          disclosedClaims: createdShareLink.disclosedClaims,
          includeHolderName: createdShareLink.includeHolderName,
          includeReferenceNo: createdShareLink.includeReferenceNo
        }
      }
    });

    return createdShareLink;
  });

  return {
    shareLink: toSafeShareLinkSummary(shareLink),
    token: rawToken,
    verificationPath: buildVerificationPath(rawToken),
    verificationUrl: buildVerificationUrl(rawToken)
  };
}

export async function listShareLinks(userId: string, credentialId: string): Promise<SafeShareLinkSummary[]> {
  await assertCredentialHolder(userId, credentialId);

  const shareLinks = await prisma.shareLink.findMany({
    where: { credentialId },
    orderBy: { createdAt: "desc" }
  });

  return shareLinks.map((shareLink) => toSafeShareLinkSummary(shareLink));
}

export async function revokeShareLink(
  userId: string,
  credentialId: string,
  shareLinkId: string,
  context: { ipAddress?: string; userAgent?: string } = {}
): Promise<SafeShareLinkSummary> {
  await assertCredentialHolder(userId, credentialId);
  const existingShareLink = await getShareLinkForCredential(credentialId, shareLinkId);

  if (existingShareLink.revokedAt) {
    throw new AppError(409, "SHARE_LINK_ALREADY_REVOKED", "This share link has already been revoked");
  }

  const credential = await prisma.credential.findUniqueOrThrow({
    where: { id: credentialId },
    select: { organizationId: true }
  });

  try {
    const revokedShareLink = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const claimResult = await tx.shareLink.updateMany({
        where: {
          id: shareLinkId,
          credentialId,
          revokedAt: null
        },
        data: {
          revokedAt: now,
          revokedById: userId
        }
      });

      if (claimResult.count !== 1) {
        throw new ShareLinkRevocationClaimError();
      }

      await tx.auditLog.create({
        data: {
          actorId: userId,
          organizationId: credential.organizationId,
          action: "SHARE_LINK_REVOKED",
          resourceType: "ShareLink",
          resourceId: shareLinkId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          details: {
            credentialId
          }
        }
      });

      return tx.shareLink.findUniqueOrThrow({
        where: { id: shareLinkId }
      });
    });

    return toSafeShareLinkSummary(revokedShareLink);
  } catch (error) {
    if (error instanceof ShareLinkRevocationClaimError) {
      throw new AppError(409, "SHARE_LINK_ALREADY_REVOKED", "This share link has already been revoked");
    }

    throw error;
  }
}

function unavailableOutcomeFromShareLinkState(
  state: ReturnType<typeof computeShareLinkState>
): VerificationOutcome {
  switch (state) {
    case "EXPIRED":
      return VerificationOutcome.EXPIRED;
    case "REVOKED":
      return VerificationOutcome.REVOKED;
    case "EXHAUSTED":
      return VerificationOutcome.INVALID;
    default:
      return VerificationOutcome.INVALID;
  }
}

async function recordUnavailableShareTokenEvent(input: {
  method: typeof VerificationMethod.SHARE_TOKEN | typeof VerificationMethod.QR;
  verifierId?: string | null;
  outcome: VerificationOutcome;
  shareLinkId?: string | null;
  credentialId?: string | null;
  organizationId?: string | null;
  credentialPublicIdSnapshot?: string | null;
  ipAddress?: string;
  userAgent?: string;
}): Promise<VerificationEvent> {
  return recordVerificationEvent({
    method: input.method,
    verifierId: input.verifierId ?? null,
    result: input.outcome,
    shareLinkId: input.shareLinkId ?? null,
    credentialId: input.credentialId ?? null,
    organizationId: input.organizationId ?? null,
    credentialPublicIdSnapshot: input.credentialPublicIdSnapshot ?? null,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent
  });
}

/**
 * Core share-token / QR verification used by public and verifier flows.
 * Never stores the raw token. Always records a VerificationEvent.
 * Preserves atomic viewCount increment for valid claims.
 */
export async function performShareTokenVerification(
  rawToken: string,
  options: ShareTokenVerificationOptions = {}
): Promise<ShareTokenVerificationResult> {
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const method = options.method ?? VerificationMethod.SHARE_TOKEN;
  const verifierId = options.verifierId ?? null;

  const existingShareLink = await prisma.shareLink.findUnique({
    where: { tokenHash },
    include: shareLinkCredentialInclude
  });

  if (!existingShareLink) {
    const verificationEvent = await recordUnavailableShareTokenEvent({
      method,
      verifierId,
      outcome: VerificationOutcome.NOT_FOUND,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent
    });

    await evaluateFailureFraudRules(prisma, {
      result: VerificationOutcome.NOT_FOUND,
      verifierId,
      ipAddress: options.ipAddress,
      verificationEventId: verificationEvent.id
    });

    return {
      shareLinkUnavailable: true,
      publicResponse: null,
      result: "NOT_FOUND",
      outcome: VerificationOutcome.NOT_FOUND,
      verificationEvent
    };
  }

  const linkState = computeShareLinkState(existingShareLink, now);
  if (linkState !== "ACTIVE") {
    const outcome = unavailableOutcomeFromShareLinkState(linkState);
    const verificationEvent = await recordUnavailableShareTokenEvent({
      method,
      verifierId,
      outcome,
      shareLinkId: existingShareLink.id,
      credentialId: existingShareLink.credentialId,
      organizationId: existingShareLink.credential.organizationId,
      credentialPublicIdSnapshot: existingShareLink.credential.publicId,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent
    });

    await evaluateFailureFraudRules(prisma, {
      result: outcome,
      verifierId,
      ipAddress: options.ipAddress,
      verificationEventId: verificationEvent.id,
      credentialPublicId: existingShareLink.credential.publicId,
      organizationId: existingShareLink.credential.organizationId,
      credentialId: existingShareLink.credentialId
    });

    return {
      shareLinkUnavailable: true,
      publicResponse: null,
      result: mapOutcomeToVerifierApiResult(outcome),
      outcome,
      verificationEvent
    };
  }

  try {
    const { publicResponse, verificationEvent, outcome } = await prisma.$transaction(async (tx) => {
      const claimResult = await tx.$executeRaw`
        UPDATE "ShareLink"
        SET "viewCount" = "viewCount" + 1,
            "lastViewedAt" = ${now}
        WHERE "tokenHash" = ${tokenHash}
          AND "revokedAt" IS NULL
          AND "expiresAt" > ${now}
          AND ("maxViews" IS NULL OR "viewCount" < "maxViews")
      `;

      if (claimResult !== 1) {
        throw new ShareLinkViewClaimError();
      }

      const claimedShareLink = await tx.shareLink.findUnique({
        where: { tokenHash },
        include: shareLinkCredentialInclude
      });

      if (!claimedShareLink) {
        throw new ShareLinkViewClaimError();
      }

      const built = buildPublicVerifiedCredential({
        publicId: claimedShareLink.credential.publicId,
        title: claimedShareLink.credential.title,
        credentialType: claimedShareLink.credential.credentialType,
        status: claimedShareLink.credential.status,
        issuedAt: claimedShareLink.credential.issuedAt,
        expiresAt: claimedShareLink.credential.expiresAt,
        revokedAt: claimedShareLink.credential.revokedAt,
        referenceNo: claimedShareLink.credential.referenceNo,
        metadata: claimedShareLink.credential.metadata,
        organization: claimedShareLink.credential.organization,
        holderFirstName: claimedShareLink.includeHolderName
          ? claimedShareLink.credential.holder.firstName
          : undefined,
        holderLastName: claimedShareLink.includeHolderName
          ? claimedShareLink.credential.holder.lastName
          : undefined,
        disclosedClaims: claimedShareLink.disclosedClaims,
        includeHolderName: claimedShareLink.includeHolderName,
        includeReferenceNo: claimedShareLink.includeReferenceNo
      });

      const eventOutcome = mapPublicResultToOutcome(built.result);

      const event = await recordVerificationEvent(
        {
          method,
          verifierId,
          result: eventOutcome,
          shareLinkId: claimedShareLink.id,
          credentialId: claimedShareLink.credentialId,
          organizationId: claimedShareLink.credential.organizationId,
          credentialPublicIdSnapshot: claimedShareLink.credential.publicId,
          ipAddress: options.ipAddress,
          userAgent: options.userAgent
        },
        tx
      );

      await tx.auditLog.create({
        data: {
          actorId: verifierId,
          organizationId: claimedShareLink.credential.organizationId,
          action: "VERIFY_CREDENTIAL",
          resourceType: "Credential",
          resourceId: claimedShareLink.credentialId,
          ipAddress: options.ipAddress,
          userAgent: options.userAgent,
          details: {
            shareLinkId: claimedShareLink.id,
            credentialPublicId: claimedShareLink.credential.publicId,
            verificationEventId: event.id,
            method,
            result: eventOutcome
          }
        }
      });

      if (eventOutcome === VerificationOutcome.REVOKED) {
        await createRevokedCredentialAccessAlert({
          credentialId: claimedShareLink.credentialId,
          verificationEventId: event.id,
          actorId: verifierId,
          ipAddress: options.ipAddress,
          metadata: {
            method,
            shareLinkId: claimedShareLink.id,
            credentialPublicId: claimedShareLink.credential.publicId
          },
          tx
        });
      }

      if (built.result === "VALID") {
        await notifyHolderShareLinkUsed({
          holderId: claimedShareLink.credential.holder.id,
          shareLinkId: claimedShareLink.id,
          credentialTitle: claimedShareLink.credential.title,
          tx
        });
      }

      return {
        publicResponse: built,
        verificationEvent: event,
        outcome: eventOutcome
      };
    });

    return {
      shareLinkUnavailable: false,
      publicResponse,
      result: mapOutcomeToVerifierApiResult(outcome),
      outcome,
      verificationEvent
    };
  } catch (error) {
    if (!(error instanceof ShareLinkViewClaimError)) {
      throw error;
    }

    // Race: link became unavailable between pre-check and atomic claim.
    const refreshed = await prisma.shareLink.findUnique({
      where: { tokenHash },
      include: shareLinkCredentialInclude
    });

    const outcome = refreshed
      ? unavailableOutcomeFromShareLinkState(computeShareLinkState(refreshed, new Date()))
      : VerificationOutcome.NOT_FOUND;

    const verificationEvent = await recordUnavailableShareTokenEvent({
      method,
      verifierId,
      outcome,
      shareLinkId: refreshed?.id,
      credentialId: refreshed?.credentialId,
      organizationId: refreshed?.credential.organizationId,
      credentialPublicIdSnapshot: refreshed?.credential.publicId,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent
    });

    return {
      shareLinkUnavailable: true,
      publicResponse: null,
      result: mapOutcomeToVerifierApiResult(outcome),
      outcome,
      verificationEvent
    };
  }
}

export async function verifyCredentialByToken(
  rawToken: string,
  context: ShareTokenVerificationOptions = {}
): Promise<PublicVerificationResponse> {
  const result = await performShareTokenVerification(rawToken, {
    ...context,
    method: context.method ?? VerificationMethod.SHARE_TOKEN,
    verifierId: context.verifierId ?? null
  });

  if (result.shareLinkUnavailable || !result.publicResponse) {
    throw new AppError(
      404,
      "VERIFICATION_UNAVAILABLE",
      "This verification link is invalid or no longer available"
    );
  }

  return result.publicResponse;
}
