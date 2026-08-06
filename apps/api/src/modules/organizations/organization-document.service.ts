import { createHash, randomBytes } from "node:crypto";
import {
  DocumentUploadStatus,
  OrganizationDocumentType,
  type OrganizationDocument
} from "@prisma/client";
import { AppError } from "../../lib/errors.js";
import { sanitizeFilename } from "../../lib/filenames.js";
import { prisma } from "../../lib/prisma.js";
import {
  getMemoryStorageAdapter,
  getStorageService
} from "../../services/storage/index.js";
import type {
  RegistrationDocumentUploadUrlInput,
  ReviewRegistrationDocumentInput
} from "./organization.schemas.js";

const UPLOAD_URL_TTL_SECONDS = 15 * 60;
const DOWNLOAD_URL_TTL_SECONDS = 15 * 60;
const STORAGE_PROVIDER = "supabase";

class DocumentReviewClaimError extends Error {
  constructor() {
    super("Registration document review claim failed");
    this.name = "DocumentReviewClaimError";
  }
}

export interface RegistrationDocumentView {
  id: string;
  documentType: OrganizationDocumentType;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentUploadStatus;
  uploadedAt: Date | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  downloadUrl?: string;
  downloadUrlExpiresAt?: Date;
}

function toDocumentView(
  document: OrganizationDocument,
  download?: { downloadUrl: string; expiresAt: Date }
): RegistrationDocumentView {
  return {
    id: document.id,
    documentType: document.documentType,
    originalFileName: document.originalFileName,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    status: document.status,
    uploadedAt: document.uploadedAt,
    reviewedAt: document.reviewedAt,
    rejectionReason: document.rejectionReason,
    createdAt: document.createdAt,
    ...(download
      ? {
          downloadUrl: download.downloadUrl,
          downloadUrlExpiresAt: download.expiresAt
        }
      : {})
  };
}

async function attachDownloadUrl(
  document: OrganizationDocument
): Promise<RegistrationDocumentView> {
  if (
    document.status === DocumentUploadStatus.PENDING_UPLOAD ||
    !(await getStorageService().objectExists(document.storagePath))
  ) {
    return toDocumentView(document);
  }

  const signed = await getStorageService().createSignedDownloadUrl({
    path: document.storagePath,
    expiresInSeconds: DOWNLOAD_URL_TTL_SECONDS
  });

  return toDocumentView(document, signed);
}

function buildRegistrationDocumentPath(
  organizationId: string,
  originalFileName: string
): string {
  const safeName = sanitizeFilename(originalFileName);
  return `organization-documents/${organizationId}/${Date.now()}-${randomBytes(8).toString("hex")}-${safeName}`;
}

export async function createRegistrationDocumentUploadUrl(
  organizationId: string,
  uploadedById: string,
  input: RegistrationDocumentUploadUrlInput
) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true }
  });

  if (!organization) {
    throw new AppError(404, "NOT_FOUND", "Organization not found");
  }

  const originalFileName = sanitizeFilename(input.originalFileName);
  const storagePath = buildRegistrationDocumentPath(organizationId, originalFileName);
  const storage = getStorageService();
  const signed = await storage.createSignedUploadUrl({
    path: storagePath,
    contentType: input.mimeType,
    expiresInSeconds: UPLOAD_URL_TTL_SECONDS
  });

  const document = await prisma.organizationDocument.create({
    data: {
      organizationId,
      documentType: input.documentType,
      originalFileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storageProvider: STORAGE_PROVIDER,
      storagePath: signed.path,
      status: DocumentUploadStatus.PENDING_UPLOAD,
      uploadedById
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

export async function completeRegistrationDocumentUpload(
  organizationId: string,
  documentId: string,
  options: { fileContent?: string | Buffer } = {}
) {
  const document = await prisma.organizationDocument.findFirst({
    where: { id: documentId, organizationId }
  });

  if (!document) {
    throw new AppError(404, "NOT_FOUND", "Document not found");
  }

  if (document.status !== DocumentUploadStatus.PENDING_UPLOAD) {
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

  const exists = await getStorageService().objectExists(document.storagePath);
  if (!exists) {
    throw new AppError(400, "UPLOAD_INCOMPLETE", "Uploaded object was not found in storage");
  }

  const objectBytes = await getStorageService().getObject(document.storagePath);
  const checksumSha256 = createHash("sha256").update(objectBytes).digest("hex");

  const updated = await prisma.organizationDocument.update({
    where: { id: document.id },
    data: {
      status: DocumentUploadStatus.UPLOADED,
      uploadedAt: new Date(),
      checksumSha256
    }
  });

  return {
    document: await attachDownloadUrl(updated)
  };
}

export async function listRegistrationDocuments(organizationId: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true }
  });

  if (!organization) {
    throw new AppError(404, "NOT_FOUND", "Organization not found");
  }

  const documents = await prisma.organizationDocument.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" }
  });

  return {
    data: await Promise.all(documents.map((document) => attachDownloadUrl(document)))
  };
}

export async function deleteRegistrationDocument(organizationId: string, documentId: string) {
  const document = await prisma.organizationDocument.findFirst({
    where: { id: documentId, organizationId }
  });

  if (!document) {
    throw new AppError(404, "NOT_FOUND", "Document not found");
  }

  if (document.status === DocumentUploadStatus.VERIFIED) {
    throw new AppError(409, "DOCUMENT_NOT_DELETABLE", "Verified documents cannot be deleted");
  }

  await prisma.organizationDocument.delete({
    where: { id: document.id }
  });

  try {
    await getStorageService().deleteObject(document.storagePath);
  } catch {
    // Best-effort storage cleanup; DB row is already removed.
  }

  return { deleted: true };
}

export async function adminListRegistrationDocuments(organizationId: string) {
  return listRegistrationDocuments(organizationId);
}

export async function reviewRegistrationDocument(
  organizationId: string,
  documentId: string,
  reviewerId: string,
  input: ReviewRegistrationDocumentInput,
  context: { ipAddress?: string; userAgent?: string } = {}
) {
  const nextStatus =
    input.decision === "VERIFY" ? DocumentUploadStatus.VERIFIED : DocumentUploadStatus.REJECTED;

  try {
    const reviewed = await prisma.$transaction(async (tx) => {
      const claimResult = await tx.organizationDocument.updateMany({
        where: {
          id: documentId,
          organizationId,
          status: {
            in: [DocumentUploadStatus.UPLOADED, DocumentUploadStatus.UNDER_REVIEW]
          }
        },
        data: {
          status: nextStatus,
          reviewedAt: new Date(),
          reviewedById: reviewerId,
          rejectionReason: input.decision === "REJECT" ? input.rejectionReason ?? null : null
        }
      });

      if (claimResult.count !== 1) {
        throw new DocumentReviewClaimError();
      }

      await tx.auditLog.create({
        data: {
          actorId: reviewerId,
          organizationId,
          action:
            input.decision === "VERIFY"
              ? "ORGANIZATION_DOCUMENT_VERIFIED"
              : "ORGANIZATION_DOCUMENT_REJECTED",
          resourceType: "OrganizationDocument",
          resourceId: documentId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          details: {
            decision: input.decision,
            rejectionReason: input.decision === "REJECT" ? input.rejectionReason : undefined
          }
        }
      });

      return tx.organizationDocument.findUniqueOrThrow({
        where: { id: documentId }
      });
    });

    return {
      document: await attachDownloadUrl(reviewed)
    };
  } catch (error) {
    if (error instanceof DocumentReviewClaimError) {
      const existing = await prisma.organizationDocument.findFirst({
        where: { id: documentId, organizationId },
        select: { id: true, status: true }
      });

      if (!existing) {
        throw new AppError(404, "NOT_FOUND", "Document not found");
      }

      throw new AppError(
        409,
        "DOCUMENT_NOT_REVIEWABLE",
        "This document cannot be reviewed in its current state"
      );
    }

    throw error;
  }
}
