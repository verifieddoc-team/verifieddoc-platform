import { AppError } from "../../lib/errors.js";
import {
  buildPublicVerifiedCredential,
  buildVerificationPath,
  buildVerificationUrl,
  getCredentialClaimKeys,
  toSafeShareLinkSummary,
  type CreateShareLinkResponse,
  type SafeShareLinkSummary
} from "../../lib/share-links.js";
import { generateShareToken, hashToken } from "../../lib/tokens.js";
import { prisma } from "../../lib/prisma.js";
import { assertCredentialHolder, getShareLinkForCredential } from "./share-link.access.js";
import type { CreateShareLinkInput } from "./share-link.schemas.js";
import type { PublicVerificationResponse } from "../../lib/share-links.js";

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

export async function verifyCredentialByToken(
  rawToken: string,
  context: { ipAddress?: string; userAgent?: string } = {}
): Promise<PublicVerificationResponse> {
  const tokenHash = hashToken(rawToken);
  const now = new Date();

  try {
    const shareLink = await prisma.$transaction(async (tx) => {
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
        include: {
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
                  firstName: true,
                  lastName: true
                }
              }
            }
          }
        }
      });

      if (!claimedShareLink) {
        throw new ShareLinkViewClaimError();
      }

      await tx.auditLog.create({
        data: {
          actorId: null,
          organizationId: claimedShareLink.credential.organizationId,
          action: "VERIFY_CREDENTIAL",
          resourceType: "Credential",
          resourceId: claimedShareLink.credentialId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          details: {
            shareLinkId: claimedShareLink.id,
            credentialPublicId: claimedShareLink.credential.publicId
          }
        }
      });

      return claimedShareLink;
    });

    return buildPublicVerifiedCredential({
      publicId: shareLink.credential.publicId,
      title: shareLink.credential.title,
      credentialType: shareLink.credential.credentialType,
      status: shareLink.credential.status,
      issuedAt: shareLink.credential.issuedAt,
      expiresAt: shareLink.credential.expiresAt,
      revokedAt: shareLink.credential.revokedAt,
      referenceNo: shareLink.credential.referenceNo,
      metadata: shareLink.credential.metadata,
      organization: shareLink.credential.organization,
      holderFirstName: shareLink.includeHolderName ? shareLink.credential.holder.firstName : undefined,
      holderLastName: shareLink.includeHolderName ? shareLink.credential.holder.lastName : undefined,
      disclosedClaims: shareLink.disclosedClaims,
      includeHolderName: shareLink.includeHolderName,
      includeReferenceNo: shareLink.includeReferenceNo
    });
  } catch (error) {
    if (error instanceof ShareLinkViewClaimError) {
      throw new AppError(
        404,
        "VERIFICATION_UNAVAILABLE",
        "This verification link is invalid or no longer available"
      );
    }

    throw error;
  }
}
