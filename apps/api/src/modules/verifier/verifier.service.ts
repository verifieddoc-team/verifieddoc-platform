import { createHash, randomBytes } from "node:crypto";
import {
  CredentialStatus,
  NotificationType,
  OrganizationStatus,
  VerificationMethod,
  VerificationOutcome,
  VerificationRequestStatus,
  type Prisma,
  type VerificationEvent
} from "@prisma/client";
import { computeEffectiveStatus } from "../../lib/credentials.js";
import { AppError } from "../../lib/errors.js";
import { sanitizeFilename } from "../../lib/filenames.js";
import { evaluateFailureFraudRules } from "../../lib/fraud-alerts.js";
import { createNotification } from "../../lib/notifications.js";
import { buildPaginationMetadata, type PaginatedResult } from "../../lib/organizations.js";
import { prisma } from "../../lib/prisma.js";
import {
  createFileHashMismatchAlert,
  createRevokedCredentialAccessAlert,
  mapCredentialToOutcome,
  mapOutcomeToVerifierApiResult,
  recordVerificationEvent,
  startOfMonth,
  type VerifierApiResult
} from "../../lib/verification.js";
import {
  getMemoryStorageAdapter,
  getStorageService
} from "../../services/storage/index.js";
import { performShareTokenVerification } from "../share-links/share-link.service.js";
import type {
  CreateVerificationInput,
  CreateVerificationRequestInput,
  FileVerificationUploadUrlInput,
  ListVerificationRequestsQuery,
  ListVerificationsQuery,
  SaveOrganizationInput
} from "./verifier.schemas.js";

const RECENT_VERIFICATION_LIMIT = 10;
const UPLOAD_URL_TTL_SECONDS = 15 * 60;

export interface VerifierVerificationSummary {
  id: string;
  method: VerificationMethod;
  result: VerificationOutcome;
  createdAt: Date;
  credentialPublicIdSnapshot: string | null;
  organization: { id: string; name: string; slug: string } | null;
  credential: {
    publicId: string;
    title: string;
    credentialType: string;
    status: CredentialStatus;
    effectiveStatus: CredentialStatus;
  } | null;
}

export interface PublicCredentialSummary {
  publicId: string;
  title: string;
  credentialType: string;
  status: CredentialStatus;
  effectiveStatus: CredentialStatus;
  issuedAt: Date;
  expiresAt: Date | null;
  organization: {
    name: string;
    slug: string;
  };
}

/**
 * Authenticated verifier verification response.
 * `result` uses VALID|EXPIRED|REVOKED|INVALID|NOT_FOUND for clarity
 * (VERIFIED outcome is exposed as VALID for API compatibility with VerificationResult).
 * Public GET /verify/:token is unchanged and still returns only VALID|EXPIRED|REVOKED
 * with 404 VERIFICATION_UNAVAILABLE for unavailable links.
 */
export interface VerifierVerificationResponse {
  result: VerifierApiResult;
  credential?: PublicCredentialSummary | PublicCredentialSummary & Record<string, unknown>;
  verification: {
    id: string;
    method: VerificationMethod;
    result: VerificationOutcome;
    createdAt: Date;
  };
}

export interface VerifierDashboardResponse {
  stats: {
    totalVerifications: number;
    successful: number;
    failed: number;
    thisMonth: number;
  };
  recentVerifications: VerifierVerificationSummary[];
  savedOrganizationsCount: number;
}

function buildDateRangeFilter(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
  if (!from && !to) {
    return undefined;
  }

  return {
    ...(from ? { gte: new Date(from) } : {}),
    ...(to ? { lte: new Date(to) } : {})
  };
}

function toVerificationSummary(
  event: VerificationEvent & {
    organization: { id: string; name: string; slug: string } | null;
    credential: {
      publicId: string;
      title: string;
      credentialType: string;
      status: CredentialStatus;
      expiresAt: Date | null;
    } | null;
  }
): VerifierVerificationSummary {
  return {
    id: event.id,
    method: event.method,
    result: event.result,
    createdAt: event.createdAt,
    credentialPublicIdSnapshot: event.credentialPublicIdSnapshot,
    organization: event.organization,
    credential: event.credential
      ? {
          publicId: event.credential.publicId,
          title: event.credential.title,
          credentialType: event.credential.credentialType,
          status: event.credential.status,
          effectiveStatus: computeEffectiveStatus(event.credential)
        }
      : null
  };
}

function toPublicCredentialSummary(credential: {
  publicId: string;
  title: string;
  credentialType: string;
  status: CredentialStatus;
  issuedAt: Date;
  expiresAt: Date | null;
  organization: { name: string; slug: string };
}): PublicCredentialSummary {
  return {
    publicId: credential.publicId,
    title: credential.title,
    credentialType: credential.credentialType,
    status: credential.status,
    effectiveStatus: computeEffectiveStatus(credential),
    issuedAt: credential.issuedAt,
    expiresAt: credential.expiresAt,
    organization: {
      name: credential.organization.name,
      slug: credential.organization.slug
    }
  };
}

export async function getVerifierDashboard(verifierId: string): Promise<VerifierDashboardResponse> {
  const monthStart = startOfMonth();
  const verifierFilter = { verifierId };

  const [
    totalVerifications,
    successful,
    failed,
    thisMonth,
    recentEvents,
    savedOrganizationsCount
  ] = await Promise.all([
    prisma.verificationEvent.count({ where: verifierFilter }),
    prisma.verificationEvent.count({
      where: { ...verifierFilter, result: VerificationOutcome.VERIFIED }
    }),
    prisma.verificationEvent.count({
      where: {
        ...verifierFilter,
        result: {
          in: [
            VerificationOutcome.INVALID,
            VerificationOutcome.NOT_FOUND,
            VerificationOutcome.EXPIRED,
            VerificationOutcome.REVOKED
          ]
        }
      }
    }),
    prisma.verificationEvent.count({
      where: { ...verifierFilter, createdAt: { gte: monthStart } }
    }),
    prisma.verificationEvent.findMany({
      where: verifierFilter,
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        credential: {
          select: {
            publicId: true,
            title: true,
            credentialType: true,
            status: true,
            expiresAt: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: RECENT_VERIFICATION_LIMIT
    }),
    prisma.savedOrganization.count({ where: { verifierId } })
  ]);

  return {
    stats: {
      totalVerifications,
      successful,
      failed,
      thisMonth
    },
    recentVerifications: recentEvents.map((event) => toVerificationSummary(event)),
    savedOrganizationsCount
  };
}

async function verifyByPublicId(
  verifierId: string,
  publicId: string,
  context: { ipAddress?: string; userAgent?: string }
): Promise<VerifierVerificationResponse> {
  const credential = await prisma.credential.findUnique({
    where: { publicId },
    include: {
      organization: {
        select: { id: true, name: true, slug: true }
      }
    }
  });

  if (!credential) {
    const event = await recordVerificationEvent({
      verifierId,
      method: VerificationMethod.PUBLIC_ID,
      result: VerificationOutcome.NOT_FOUND,
      credentialPublicIdSnapshot: publicId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    await evaluateFailureFraudRules(prisma, {
      result: VerificationOutcome.NOT_FOUND,
      verifierId,
      ipAddress: context.ipAddress,
      verificationEventId: event.id,
      credentialPublicId: publicId
    });

    return {
      result: "NOT_FOUND",
      verification: {
        id: event.id,
        method: event.method,
        result: event.result,
        createdAt: event.createdAt
      }
    };
  }

  const outcome = mapCredentialToOutcome(credential);
  const event = await recordVerificationEvent({
    verifierId,
    method: VerificationMethod.PUBLIC_ID,
    result: outcome,
    credentialId: credential.id,
    organizationId: credential.organizationId,
    credentialPublicIdSnapshot: credential.publicId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });

  if (outcome === VerificationOutcome.REVOKED) {
    await createRevokedCredentialAccessAlert({
      credentialId: credential.id,
      verificationEventId: event.id,
      actorId: verifierId,
      ipAddress: context.ipAddress,
      metadata: {
        method: VerificationMethod.PUBLIC_ID,
        credentialPublicId: credential.publicId
      }
    });
  }

  await evaluateFailureFraudRules(prisma, {
    result: outcome,
    verifierId,
    ipAddress: context.ipAddress,
    verificationEventId: event.id,
    credentialPublicId: credential.publicId,
    organizationId: credential.organizationId,
    credentialId: credential.id
  });

  return {
    result: mapOutcomeToVerifierApiResult(outcome),
    credential: toPublicCredentialSummary(credential),
    verification: {
      id: event.id,
      method: event.method,
      result: event.result,
      createdAt: event.createdAt
    }
  };
}

export async function createVerification(
  verifierId: string,
  input: CreateVerificationInput,
  context: { ipAddress?: string; userAgent?: string } = {}
): Promise<VerifierVerificationResponse> {
  if (input.method === VerificationMethod.PUBLIC_ID) {
    return verifyByPublicId(verifierId, input.publicId, context);
  }

  const shareResult = await performShareTokenVerification(input.token, {
    verifierId,
    method: input.method,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent
  });

  const credential = shareResult.publicResponse
    ? {
        publicId: shareResult.publicResponse.credential.publicId,
        title: shareResult.publicResponse.credential.title,
        credentialType: shareResult.publicResponse.credential.credentialType,
        status: shareResult.publicResponse.credential.effectiveStatus,
        effectiveStatus: shareResult.publicResponse.credential.effectiveStatus,
        issuedAt: shareResult.publicResponse.credential.issuedAt,
        expiresAt: shareResult.publicResponse.credential.expiresAt,
        organization: shareResult.publicResponse.credential.organization,
        ...(shareResult.publicResponse.credential.holderName
          ? { holderName: shareResult.publicResponse.credential.holderName }
          : {}),
        ...(shareResult.publicResponse.credential.referenceNo
          ? { referenceNo: shareResult.publicResponse.credential.referenceNo }
          : {}),
        ...(shareResult.publicResponse.credential.claims
          ? { claims: shareResult.publicResponse.credential.claims }
          : {}),
        ...(shareResult.publicResponse.credential.revokedAt
          ? { revokedAt: shareResult.publicResponse.credential.revokedAt }
          : {})
      }
    : undefined;

  return {
    result: shareResult.result,
    ...(credential ? { credential } : {}),
    verification: {
      id: shareResult.verificationEvent.id,
      method: shareResult.verificationEvent.method,
      result: shareResult.verificationEvent.result,
      createdAt: shareResult.verificationEvent.createdAt
    }
  };
}

export async function listVerifications(
  verifierId: string,
  query: ListVerificationsQuery
): Promise<PaginatedResult<VerifierVerificationSummary>> {
  const createdAt = buildDateRangeFilter(query.from, query.to);
  const where: Prisma.VerificationEventWhereInput = {
    verifierId,
    ...(query.result ? { result: query.result } : {}),
    ...(query.method ? { method: query.method } : {}),
    ...(query.organizationId ? { organizationId: query.organizationId } : {}),
    ...(createdAt ? { createdAt } : {})
  };

  const skip = (query.page - 1) * query.limit;
  const [total, events] = await prisma.$transaction([
    prisma.verificationEvent.count({ where }),
    prisma.verificationEvent.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        credential: {
          select: {
            publicId: true,
            title: true,
            credentialType: true,
            status: true,
            expiresAt: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit
    })
  ]);

  return {
    data: events.map((event) => toVerificationSummary(event)),
    pagination: buildPaginationMetadata(query.page, query.limit, total)
  };
}

export async function getVerification(
  verifierId: string,
  verificationId: string
): Promise<VerifierVerificationSummary> {
  const event = await prisma.verificationEvent.findFirst({
    where: { id: verificationId, verifierId },
    include: {
      organization: { select: { id: true, name: true, slug: true } },
      credential: {
        select: {
          publicId: true,
          title: true,
          credentialType: true,
          status: true,
          expiresAt: true
        }
      }
    }
  });

  if (!event) {
    throw new AppError(404, "NOT_FOUND", "Verification event not found");
  }

  return toVerificationSummary(event);
}

export async function listSavedOrganizations(verifierId: string) {
  const saved = await prisma.savedOrganization.findMany({
    where: { verifierId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          country: true,
          status: true,
          website: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return {
    data: saved.map((entry) => ({
      id: entry.id,
      organizationId: entry.organizationId,
      createdAt: entry.createdAt,
      organization: entry.organization
    }))
  };
}

export async function saveOrganization(verifierId: string, input: SaveOrganizationInput) {
  const organization = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      country: true,
      status: true,
      website: true
    }
  });

  if (!organization) {
    throw new AppError(404, "NOT_FOUND", "Organization not found");
  }

  if (organization.status !== OrganizationStatus.VERIFIED) {
    throw new AppError(400, "ORGANIZATION_NOT_VERIFIED", "Only verified organizations can be saved");
  }

  try {
    const saved = await prisma.savedOrganization.create({
      data: {
        verifierId,
        organizationId: organization.id
      }
    });

    return {
      id: saved.id,
      organizationId: saved.organizationId,
      createdAt: saved.createdAt,
      organization
    };
  } catch {
    throw new AppError(409, "ALREADY_SAVED", "Organization is already saved");
  }
}

export async function removeSavedOrganization(verifierId: string, organizationId: string) {
  const deleted = await prisma.savedOrganization.deleteMany({
    where: { verifierId, organizationId }
  });

  if (deleted.count === 0) {
    throw new AppError(404, "NOT_FOUND", "Saved organization not found");
  }

  return { deleted: true };
}

function toVerificationRequestSummary(request: {
  id: string;
  status: VerificationRequestStatus;
  requesterNote: string | null;
  reviewNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  credential: {
    id: string;
    publicId: string;
    title: string;
    credentialType: string;
    status: CredentialStatus;
    expiresAt: Date | null;
  };
  organization: { id: string; name: string; slug: string };
  holder: { id: string; firstName: string; lastName: string };
  requestedBy: { id: string; firstName: string; lastName: string };
}) {
  return {
    id: request.id,
    status: request.status,
    requesterNote: request.requesterNote,
    reviewNote: request.reviewNote,
    reviewedAt: request.reviewedAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    credential: {
      id: request.credential.id,
      publicId: request.credential.publicId,
      title: request.credential.title,
      credentialType: request.credential.credentialType,
      status: request.credential.status,
      effectiveStatus: computeEffectiveStatus(request.credential)
    },
    organization: request.organization,
    holder: {
      id: request.holder.id,
      firstName: request.holder.firstName,
      lastName: request.holder.lastName
    },
    requestedBy: {
      id: request.requestedBy.id,
      firstName: request.requestedBy.firstName,
      lastName: request.requestedBy.lastName
    }
  };
}

const verificationRequestInclude = {
  credential: {
    select: {
      id: true,
      publicId: true,
      title: true,
      credentialType: true,
      status: true,
      expiresAt: true
    }
  },
  organization: { select: { id: true, name: true, slug: true } },
  holder: { select: { id: true, firstName: true, lastName: true } },
  requestedBy: { select: { id: true, firstName: true, lastName: true } }
} as const;

export async function createVerificationRequest(
  verifierId: string,
  input: CreateVerificationRequestInput
) {
  const credential = input.credentialPublicId
    ? await prisma.credential.findUnique({
        where: { publicId: input.credentialPublicId },
        select: {
          id: true,
          title: true,
          holderId: true,
          organizationId: true,
          organization: { select: { status: true, name: true } }
        }
      })
    : await prisma.credential.findUnique({
        where: { id: input.credentialId! },
        select: {
          id: true,
          title: true,
          holderId: true,
          organizationId: true,
          organization: { select: { status: true, name: true } }
        }
      });

  if (!credential) {
    throw new AppError(404, "NOT_FOUND", "Credential not found");
  }

  if (credential.organization.status !== OrganizationStatus.VERIFIED) {
    throw new AppError(
      400,
      "ORGANIZATION_NOT_VERIFIED",
      "Cannot request verification for credentials from unverified organizations"
    );
  }

  const requesterNote = input.note ?? input.requesterNote;

  const request = await prisma.$transaction(async (tx) => {
    const created = await tx.verificationRequest.create({
      data: {
        credentialId: credential.id,
        organizationId: credential.organizationId,
        holderId: credential.holderId,
        requestedById: verifierId,
        requesterNote,
        status: VerificationRequestStatus.PENDING
      },
      include: verificationRequestInclude
    });

    await createNotification(tx, {
      userId: credential.holderId,
      type: NotificationType.VERIFICATION_REQUEST_SUBMITTED,
      title: "Verification request received",
      message: `A verifier requested access related to "${credential.title}".`,
      resourceType: "VerificationRequest",
      resourceId: created.id
    });

    return created;
  });

  return { request: toVerificationRequestSummary(request) };
}

export async function listVerificationRequests(
  verifierId: string,
  query: ListVerificationRequestsQuery
) {
  const where: Prisma.VerificationRequestWhereInput = {
    requestedById: verifierId,
    ...(query.status ? { status: query.status } : {})
  };

  const skip = (query.page - 1) * query.limit;
  const [total, requests] = await prisma.$transaction([
    prisma.verificationRequest.count({ where }),
    prisma.verificationRequest.findMany({
      where,
      include: verificationRequestInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit
    })
  ]);

  return {
    data: requests.map((request) => toVerificationRequestSummary(request)),
    pagination: buildPaginationMetadata(query.page, query.limit, total)
  };
}

export async function getVerificationRequest(verifierId: string, requestId: string) {
  const request = await prisma.verificationRequest.findFirst({
    where: { id: requestId, requestedById: verifierId },
    include: verificationRequestInclude
  });

  if (!request) {
    throw new AppError(404, "NOT_FOUND", "Verification request not found");
  }

  return { request: toVerificationRequestSummary(request) };
}

export async function cancelVerificationRequest(verifierId: string, requestId: string) {
  const existing = await prisma.verificationRequest.findFirst({
    where: { id: requestId, requestedById: verifierId },
    select: { id: true, status: true }
  });

  if (!existing) {
    throw new AppError(404, "NOT_FOUND", "Verification request not found");
  }

  if (existing.status !== VerificationRequestStatus.PENDING) {
    throw new AppError(
      409,
      "REQUEST_NOT_PENDING",
      "Only pending verification requests can be cancelled"
    );
  }

  const claimed = await prisma.verificationRequest.updateMany({
    where: {
      id: requestId,
      requestedById: verifierId,
      status: VerificationRequestStatus.PENDING
    },
    data: {
      status: VerificationRequestStatus.CANCELLED,
      reviewedAt: new Date(),
      reviewedById: verifierId,
      reviewNote: "Cancelled by verifier"
    }
  });

  if (claimed.count !== 1) {
    throw new AppError(
      409,
      "REQUEST_NOT_PENDING",
      "Only pending verification requests can be cancelled"
    );
  }

  const request = await prisma.verificationRequest.findFirstOrThrow({
    where: { id: requestId, requestedById: verifierId },
    include: verificationRequestInclude
  });

  return { request: toVerificationRequestSummary(request) };
}

function buildUploadStoragePath(prefix: string, originalFileName: string): string {
  const safeName = sanitizeFilename(originalFileName);
  return `${prefix}/${Date.now()}-${randomBytes(8).toString("hex")}-${safeName}`;
}

export async function createFileVerificationUploadUrl(
  verifierId: string,
  input: FileVerificationUploadUrlInput
) {
  const storagePath = buildUploadStoragePath(
    `verification-uploads/${verifierId}`,
    input.originalFileName
  );
  const storage = getStorageService();
  const signed = await storage.createSignedUploadUrl({
    path: storagePath,
    contentType: input.mimeType,
    expiresInSeconds: UPLOAD_URL_TTL_SECONDS
  });

  const upload = await prisma.verificationUpload.create({
    data: {
      verifierId,
      storagePath: signed.path,
      originalFileName: input.originalFileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      expiresAt: signed.expiresAt
    }
  });

  return {
    uploadId: upload.id,
    uploadUrl: signed.uploadUrl,
    storagePath: signed.path,
    expiresAt: signed.expiresAt,
    headers: {
      "Content-Type": input.mimeType
    }
  };
}

/**
 * Completes a file-hash verification.
 * For local/test memory adapter, optional `fileContent` can be supplied to stage bytes
 * before hashing (production clients upload to the signed URL first).
 */
export async function completeFileVerification(
  verifierId: string,
  uploadId: string,
  context: { ipAddress?: string; userAgent?: string; fileContent?: string | Buffer } = {}
): Promise<VerifierVerificationResponse> {
  const upload = await prisma.verificationUpload.findFirst({
    where: { id: uploadId, verifierId }
  });

  if (!upload) {
    throw new AppError(404, "NOT_FOUND", "Verification upload not found");
  }

  if (upload.completedAt) {
    throw new AppError(409, "UPLOAD_ALREADY_COMPLETED", "This upload has already been completed");
  }

  if (upload.expiresAt.getTime() <= Date.now()) {
    throw new AppError(410, "UPLOAD_EXPIRED", "The upload URL has expired");
  }

  if (context.fileContent !== undefined) {
    await getMemoryStorageAdapter().putObject(
      upload.storagePath,
      Buffer.isBuffer(context.fileContent)
        ? context.fileContent
        : Buffer.from(context.fileContent),
      upload.mimeType
    );
  }

  const storage = getStorageService();
  const objectExists = await storage.objectExists(upload.storagePath);
  if (!objectExists) {
    throw new AppError(400, "UPLOAD_INCOMPLETE", "Uploaded object was not found in storage");
  }

  const objectBytes = await storage.getObject(upload.storagePath);
  if (objectBytes.byteLength > upload.sizeBytes && objectBytes.byteLength > 10 * 1024 * 1024) {
    throw new AppError(400, "FILE_TOO_LARGE", "Uploaded object exceeds the allowed size");
  }

  const checksumSha256 = createHash("sha256").update(objectBytes).digest("hex");

  const artifact = await prisma.credentialArtifact.findFirst({
    where: {
      checksumSha256,
      completedAt: { not: null }
    },
    include: {
      credential: {
        include: {
          organization: {
            select: { name: true, slug: true, id: true }
          }
        }
      }
    }
  });

  const outcome = artifact ? mapCredentialToOutcome(artifact.credential) : VerificationOutcome.NOT_FOUND;

  const event = await prisma.$transaction(async (tx) => {
    const claimed = await tx.verificationUpload.updateMany({
      where: {
        id: upload.id,
        verifierId,
        completedAt: null
      },
      data: {
        checksumSha256,
        sizeBytes: objectBytes.byteLength,
        completedAt: new Date()
      }
    });

    if (claimed.count !== 1) {
      throw new AppError(409, "UPLOAD_ALREADY_COMPLETED", "This upload has already been completed");
    }

    const createdEvent = await recordVerificationEvent(
      {
        verifierId,
        method: VerificationMethod.FILE_HASH,
        result: outcome,
        credentialId: artifact?.credentialId ?? null,
        organizationId: artifact?.credential.organizationId ?? null,
        credentialPublicIdSnapshot: artifact?.credential.publicId ?? null,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      },
      tx
    );

    if (!artifact) {
      await createFileHashMismatchAlert({
        verificationEventId: createdEvent.id,
        actorId: verifierId,
        ipAddress: context.ipAddress,
        metadata: {
          uploadId: upload.id,
          checksumSha256
        },
        tx
      });
    } else if (outcome === VerificationOutcome.REVOKED) {
      await createRevokedCredentialAccessAlert({
        credentialId: artifact.credentialId,
        verificationEventId: createdEvent.id,
        actorId: verifierId,
        ipAddress: context.ipAddress,
        metadata: {
          method: VerificationMethod.FILE_HASH,
          uploadId: upload.id,
          checksumSha256
        },
        tx
      });
    }

    await evaluateFailureFraudRules(tx, {
      result: outcome,
      verifierId,
      ipAddress: context.ipAddress,
      verificationEventId: createdEvent.id,
      credentialPublicId: artifact?.credential.publicId ?? null,
      organizationId: artifact?.credential.organizationId ?? null,
      checksumSha256,
      credentialId: artifact?.credentialId ?? null
    });

    return createdEvent;
  });

  return {
    result: mapOutcomeToVerifierApiResult(outcome),
    ...(artifact
      ? {
          credential: toPublicCredentialSummary(artifact.credential)
        }
      : {}),
    verification: {
      id: event.id,
      method: event.method,
      result: event.result,
      createdAt: event.createdAt
    }
  };
}
