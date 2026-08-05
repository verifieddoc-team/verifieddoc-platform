import { createHash, randomBytes } from "node:crypto";
import {
  CredentialStatus,
  PlatformRole,
  VerificationRequestStatus,
  type Prisma
} from "@prisma/client";
import {
  buildCredentialListWhere,
  toHolderCredentialSummary,
  type HolderCredentialSummary
} from "../../lib/credentials.js";
import { AppError } from "../../lib/errors.js";
import { sanitizeFilename } from "../../lib/filenames.js";
import { joinNames } from "../../lib/names.js";
import { buildPaginationMetadata, type PaginatedResult } from "../../lib/organizations.js";
import { prisma } from "../../lib/prisma.js";
import { startOfMonth } from "../../lib/verification.js";
import {
  getMemoryStorageAdapter,
  getStorageService
} from "../../services/storage/index.js";
import type {
  HolderActivityQuery,
  HolderActivityType,
  HolderVerificationRequestsQuery,
  PersonalDocumentUploadUrlInput
} from "./holder-dashboard.schemas.js";

const RECENT_CREDENTIAL_LIMIT = 5;
const RECENT_ACTIVITY_LIMIT = 10;
const UPLOAD_URL_TTL_SECONDS = 15 * 60;

export interface HolderDashboardHolder {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  /** Additive convenience field; firstName/lastName remain canonical. */
  fullName: string;
  role: typeof PlatformRole.HOLDER;
}

export interface HolderDashboardStats {
  total: number;
  active: number;
  expired: number;
  revoked: number;
  /** Additive: pending verification requests for this holder. */
  pendingVerifications: number;
  /** Additive: share links created by this holder in the current UTC month. */
  sharedThisMonth: number;
}

export interface HolderActivityItem {
  id: string;
  type: HolderActivityType;
  title: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface HolderDashboardResponse {
  holder: HolderDashboardHolder;
  stats: HolderDashboardStats;
  recentCredentials: HolderCredentialSummary[];
  /** Additive recent activity feed. */
  recentActivity: HolderActivityItem[];
}

function resolveFullName(holder: {
  fullName: string;
  firstName: string;
  lastName: string;
}): string {
  if (holder.fullName.trim().length > 0) {
    return holder.fullName.trim();
  }

  return joinNames(holder.firstName, holder.lastName).fullName;
}

async function loadRecentActivity(
  holderId: string,
  limit: number
): Promise<HolderActivityItem[]> {
  const [credentials, shareLinks, verificationEvents, verificationRequests] = await Promise.all([
    prisma.credential.findMany({
      where: { holderId },
      select: {
        id: true,
        title: true,
        createdAt: true,
        publicId: true,
        organization: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" },
      take: limit
    }),
    prisma.shareLink.findMany({
      where: { createdById: holderId },
      select: {
        id: true,
        createdAt: true,
        credential: { select: { title: true, publicId: true } }
      },
      orderBy: { createdAt: "desc" },
      take: limit
    }),
    prisma.verificationEvent.findMany({
      where: { credential: { holderId } },
      select: {
        id: true,
        createdAt: true,
        method: true,
        result: true,
        credential: { select: { title: true, publicId: true } }
      },
      orderBy: { createdAt: "desc" },
      take: limit
    }),
    prisma.verificationRequest.findMany({
      where: { holderId },
      select: {
        id: true,
        createdAt: true,
        status: true,
        credential: { select: { title: true, publicId: true } },
        organization: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" },
      take: limit
    })
  ]);

  const items: HolderActivityItem[] = [
    ...credentials.map((credential) => ({
      id: `credential:${credential.id}`,
      type: "CREDENTIAL_ISSUED" as const,
      title: `Credential issued: ${credential.title}`,
      createdAt: credential.createdAt,
      metadata: {
        credentialId: credential.id,
        publicId: credential.publicId,
        organizationName: credential.organization.name
      }
    })),
    ...shareLinks.map((shareLink) => ({
      id: `share-link:${shareLink.id}`,
      type: "SHARE_LINK_CREATED" as const,
      title: `Share link created for ${shareLink.credential.title}`,
      createdAt: shareLink.createdAt,
      metadata: {
        shareLinkId: shareLink.id,
        publicId: shareLink.credential.publicId
      }
    })),
    ...verificationEvents.map((event) => ({
      id: `verification-event:${event.id}`,
      type: "VERIFICATION_EVENT" as const,
      title: `Credential verified: ${event.credential?.title ?? "Unknown"}`,
      createdAt: event.createdAt,
      metadata: {
        verificationEventId: event.id,
        method: event.method,
        result: event.result,
        publicId: event.credential?.publicId
      }
    })),
    ...verificationRequests.map((request) => ({
      id: `verification-request:${request.id}`,
      type: "VERIFICATION_REQUEST" as const,
      title: `Verification request for ${request.credential.title}`,
      createdAt: request.createdAt,
      metadata: {
        verificationRequestId: request.id,
        status: request.status,
        organizationName: request.organization.name,
        publicId: request.credential.publicId
      }
    }))
  ];

  items.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  return items.slice(0, limit);
}

export async function getHolderDashboard(holderId: string): Promise<HolderDashboardResponse> {
  const holder = await prisma.user.findUnique({
    where: { id: holderId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      fullName: true,
      role: true
    }
  });

  if (!holder || holder.role !== PlatformRole.HOLDER) {
    throw new AppError(403, "FORBIDDEN", "Insufficient permissions");
  }

  const now = new Date();
  const monthStart = startOfMonth(now);
  const holderFilter = { holderId: holder.id };

  const [
    total,
    active,
    expired,
    revoked,
    pendingVerifications,
    sharedThisMonth,
    recentCredentials,
    recentActivity
  ] = await Promise.all([
    prisma.credential.count({ where: holderFilter }),
    prisma.credential.count({
      where: buildCredentialListWhere(holderFilter, CredentialStatus.ACTIVE, now)
    }),
    prisma.credential.count({
      where: buildCredentialListWhere(holderFilter, CredentialStatus.EXPIRED, now)
    }),
    prisma.credential.count({
      where: buildCredentialListWhere(holderFilter, CredentialStatus.REVOKED, now)
    }),
    prisma.verificationRequest.count({
      where: { holderId: holder.id, status: VerificationRequestStatus.PENDING }
    }),
    prisma.shareLink.count({
      where: { createdById: holder.id, createdAt: { gte: monthStart } }
    }),
    prisma.credential.findMany({
      where: holderFilter,
      include: {
        organization: {
          select: {
            name: true,
            slug: true
          }
        }
      },
      orderBy: { issuedAt: "desc" },
      take: RECENT_CREDENTIAL_LIMIT
    }),
    loadRecentActivity(holder.id, RECENT_ACTIVITY_LIMIT)
  ]);

  return {
    holder: {
      id: holder.id,
      email: holder.email,
      firstName: holder.firstName,
      lastName: holder.lastName,
      fullName: resolveFullName(holder),
      role: PlatformRole.HOLDER
    },
    stats: {
      total,
      active,
      expired,
      revoked,
      pendingVerifications,
      sharedThisMonth
    },
    recentCredentials: recentCredentials.map((credential) =>
      toHolderCredentialSummary(credential, credential.organization)
    ),
    recentActivity
  };
}

function activityInRange(createdAt: Date, from?: string, to?: string): boolean {
  if (from && createdAt.getTime() < new Date(from).getTime()) {
    return false;
  }
  if (to && createdAt.getTime() > new Date(to).getTime()) {
    return false;
  }
  return true;
}

export async function listHolderActivity(
  holderId: string,
  query: HolderActivityQuery
): Promise<PaginatedResult<HolderActivityItem>> {
  const holder = await prisma.user.findUnique({
    where: { id: holderId },
    select: { id: true, role: true }
  });

  if (!holder || holder.role !== PlatformRole.HOLDER) {
    throw new AppError(403, "FORBIDDEN", "Insufficient permissions");
  }

  // Fetch a bounded working set per source, then filter/paginate in memory.
  const fetchLimit = Math.min(Math.max(query.page * query.limit, 50), 200);
  let items = await loadRecentActivity(holderId, fetchLimit);

  if (query.type) {
    items = items.filter((item) => item.type === query.type);
  }

  items = items.filter((item) => activityInRange(item.createdAt, query.from, query.to));

  const total = items.length;
  const skip = (query.page - 1) * query.limit;

  return {
    data: items.slice(skip, skip + query.limit),
    pagination: buildPaginationMetadata(query.page, query.limit, total)
  };
}

export async function listHolderVerificationRequests(
  holderId: string,
  query: HolderVerificationRequestsQuery
) {
  const where: Prisma.VerificationRequestWhereInput = { holderId };
  const skip = (query.page - 1) * query.limit;

  const [total, requests] = await prisma.$transaction([
    prisma.verificationRequest.count({ where }),
    prisma.verificationRequest.findMany({
      where,
      include: {
        credential: {
          select: {
            id: true,
            publicId: true,
            title: true,
            credentialType: true,
            status: true
          }
        },
        organization: { select: { id: true, name: true, slug: true } },
        requestedBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit
    })
  ]);

  return {
    data: requests.map((request) => ({
      id: request.id,
      status: request.status,
      requesterNote: request.requesterNote,
      reviewNote: request.reviewNote,
      reviewedAt: request.reviewedAt,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      credential: request.credential,
      organization: request.organization,
      requestedBy: request.requestedBy
    })),
    pagination: buildPaginationMetadata(query.page, query.limit, total)
  };
}

export async function listPersonalDocuments(holderId: string) {
  const documents = await prisma.personalDocument.findMany({
    where: { holderId },
    orderBy: { createdAt: "desc" }
  });

  return {
    data: documents.map((document) => ({
      id: document.id,
      title: document.title,
      documentType: document.documentType,
      originalFileName: document.originalFileName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      uploadedAt: document.uploadedAt,
      createdAt: document.createdAt
      // Intentionally omit storagePath / checksum — personal docs are never public.
    }))
  };
}

function buildPersonalDocumentPath(holderId: string, originalFileName: string): string {
  const safeName = sanitizeFilename(originalFileName);
  return `personal-documents/${holderId}/${Date.now()}-${randomBytes(8).toString("hex")}-${safeName}`;
}

export async function createPersonalDocumentUploadUrl(
  holderId: string,
  input: PersonalDocumentUploadUrlInput
) {
  const storagePath = buildPersonalDocumentPath(holderId, input.originalFileName);
  const storage = getStorageService();
  const signed = await storage.createSignedUploadUrl({
    path: storagePath,
    contentType: input.mimeType,
    expiresInSeconds: UPLOAD_URL_TTL_SECONDS
  });

  const document = await prisma.personalDocument.create({
    data: {
      holderId,
      title: input.title,
      documentType: input.documentType,
      originalFileName: input.originalFileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storagePath: signed.path
    }
  });

  return {
    documentId: document.id,
    uploadUrl: signed.uploadUrl,
    storagePath: signed.path,
    expiresAt: signed.expiresAt,
    headers: {
      "Content-Type": input.mimeType
    }
  };
}

export async function completePersonalDocumentUpload(
  holderId: string,
  documentId: string,
  options: { fileContent?: string | Buffer } = {}
) {
  const document = await prisma.personalDocument.findFirst({
    where: { id: documentId, holderId }
  });

  if (!document) {
    throw new AppError(404, "NOT_FOUND", "Document not found");
  }

  if (document.uploadedAt) {
    throw new AppError(409, "DOCUMENT_ALREADY_UPLOADED", "This document has already been uploaded");
  }

  if (options.fileContent !== undefined) {
    await getMemoryStorageAdapter().putObject(
      document.storagePath,
      Buffer.isBuffer(options.fileContent)
        ? options.fileContent
        : Buffer.from(options.fileContent),
      document.mimeType
    );
  }

  const storage = getStorageService();
  const exists = await storage.objectExists(document.storagePath);
  if (!exists) {
    throw new AppError(400, "UPLOAD_INCOMPLETE", "Uploaded object was not found in storage");
  }

  const objectBytes = await storage.getObject(document.storagePath);
  if (objectBytes.byteLength > 10 * 1024 * 1024) {
    throw new AppError(400, "FILE_TOO_LARGE", "Uploaded object exceeds the allowed size");
  }

  const checksumSha256 = createHash("sha256").update(objectBytes).digest("hex");

  const claimed = await prisma.personalDocument.updateMany({
    where: {
      id: document.id,
      holderId,
      uploadedAt: null
    },
    data: {
      uploadedAt: new Date(),
      checksumSha256,
      sizeBytes: objectBytes.byteLength
    }
  });

  if (claimed.count !== 1) {
    throw new AppError(409, "DOCUMENT_ALREADY_UPLOADED", "This document has already been uploaded");
  }

  const updated = await prisma.personalDocument.findFirstOrThrow({
    where: { id: document.id, holderId }
  });

  return {
    document: {
      id: updated.id,
      title: updated.title,
      documentType: updated.documentType,
      originalFileName: updated.originalFileName,
      mimeType: updated.mimeType,
      sizeBytes: updated.sizeBytes,
      uploadedAt: updated.uploadedAt,
      createdAt: updated.createdAt
    }
  };
}

export async function deletePersonalDocument(holderId: string, documentId: string) {
  const document = await prisma.personalDocument.findFirst({
    where: { id: documentId, holderId },
    select: { id: true, storagePath: true }
  });

  if (!document) {
    throw new AppError(404, "NOT_FOUND", "Document not found");
  }

  const deleted = await prisma.personalDocument.deleteMany({
    where: { id: documentId, holderId }
  });

  if (deleted.count === 0) {
    throw new AppError(404, "NOT_FOUND", "Document not found");
  }

  try {
    await getStorageService().deleteObject(document.storagePath);
  } catch {
    // Best-effort storage cleanup; DB ownership was already removed.
  }

  return { deleted: true };
}
