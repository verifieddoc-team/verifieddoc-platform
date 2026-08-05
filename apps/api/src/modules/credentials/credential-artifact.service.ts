import { createHash, randomBytes } from "node:crypto";
import { OrganizationRole } from "@prisma/client";
import { AppError } from "../../lib/errors.js";
import { sanitizeFilename } from "../../lib/filenames.js";
import { isUniqueConstraintError } from "../../lib/prisma-errors.js";
import { prisma } from "../../lib/prisma.js";
import {
  getMemoryStorageAdapter,
  getStorageService
} from "../../services/storage/index.js";
import type { CredentialArtifactUploadUrlInput } from "./credential.schemas.js";

const UPLOAD_URL_TTL_SECONDS = 15 * 60;
const DOWNLOAD_URL_TTL_SECONDS = 15 * 60;

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

function buildArtifactPath(organizationId: string, credentialId: string, originalFileName: string) {
  const safeName = sanitizeFilename(originalFileName);
  return `credential-artifacts/${organizationId}/${credentialId}/${Date.now()}-${randomBytes(8).toString("hex")}-${safeName}`;
}

function pendingChecksumPlaceholder(): string {
  return createHash("sha256")
    .update(`pending:${randomBytes(32).toString("hex")}`)
    .digest("hex");
}

export async function createCredentialArtifactUploadUrl(
  organizationId: string,
  credentialId: string,
  uploadedById: string,
  input: CredentialArtifactUploadUrlInput
) {
  await assertOrganizationIssuerAccess(uploadedById, organizationId);

  const credential = await prisma.credential.findUnique({
    where: { id: credentialId },
    select: { id: true, organizationId: true }
  });

  if (!credential) {
    throw new AppError(404, "NOT_FOUND", "Credential not found");
  }

  if (credential.organizationId !== organizationId) {
    throw new AppError(403, "FORBIDDEN", "You do not have access to this credential");
  }

  const originalFileName = sanitizeFilename(input.originalFileName);
  const storagePath = buildArtifactPath(organizationId, credentialId, originalFileName);
  const storage = getStorageService();
  const signed = await storage.createSignedUploadUrl({
    path: storagePath,
    contentType: input.mimeType,
    expiresInSeconds: UPLOAD_URL_TTL_SECONDS
  });

  const artifact = await prisma.credentialArtifact.create({
    data: {
      credentialId,
      originalFileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storagePath: signed.path,
      checksumSha256: pendingChecksumPlaceholder(),
      uploadedById
    }
  });

  return {
    artifactId: artifact.id,
    uploadUrl: signed.uploadUrl,
    storagePath: signed.path,
    expiresAt: signed.expiresAt,
    headers: {
      "Content-Type": input.mimeType
    }
  };
}

export async function completeCredentialArtifactUpload(
  organizationId: string,
  credentialId: string,
  artifactId: string,
  uploadedById: string,
  options: { fileContent?: string | Buffer } = {}
) {
  await assertOrganizationIssuerAccess(uploadedById, organizationId);

  const artifact = await prisma.credentialArtifact.findFirst({
    where: {
      id: artifactId,
      credentialId,
      credential: { organizationId }
    }
  });

  if (!artifact) {
    throw new AppError(404, "NOT_FOUND", "Artifact not found");
  }

  if (artifact.completedAt) {
    throw new AppError(409, "ARTIFACT_ALREADY_COMPLETED", "This artifact upload has already been completed");
  }

  if (options.fileContent !== undefined) {
    await getMemoryStorageAdapter().putObject(
      artifact.storagePath,
      Buffer.isBuffer(options.fileContent)
        ? options.fileContent
        : Buffer.from(options.fileContent),
      artifact.mimeType
    );
  }

  const exists = await getStorageService().objectExists(artifact.storagePath);
  if (!exists) {
    throw new AppError(400, "UPLOAD_INCOMPLETE", "Uploaded object was not found in storage");
  }

  const objectBytes = await getStorageService().getObject(artifact.storagePath);
  const checksumSha256 = createHash("sha256").update(objectBytes).digest("hex");

  try {
    const updated = await prisma.credentialArtifact.update({
      where: { id: artifact.id },
      data: {
        checksumSha256,
        completedAt: new Date(),
        sizeBytes: objectBytes.byteLength
      }
    });

    return {
      artifact: {
        id: updated.id,
        credentialId: updated.credentialId,
        originalFileName: updated.originalFileName,
        mimeType: updated.mimeType,
        sizeBytes: updated.sizeBytes,
        checksumSha256: updated.checksumSha256,
        completedAt: updated.completedAt,
        createdAt: updated.createdAt
      }
    };
  } catch (error) {
    if (isUniqueConstraintError(error, ["checksumSha256"])) {
      throw new AppError(
        409,
        "ARTIFACT_CHECKSUM_EXISTS",
        "An artifact with this content hash already exists"
      );
    }

    throw error;
  }
}

export async function listCredentialArtifacts(userId: string, credentialId: string) {
  const credential = await prisma.credential.findUnique({
    where: { id: credentialId },
    select: {
      id: true,
      holderId: true,
      organizationId: true
    }
  });

  if (!credential) {
    throw new AppError(404, "NOT_FOUND", "Credential not found");
  }

  const isHolder = credential.holderId === userId;
  let isIssuerMember = false;

  if (!isHolder) {
    const membership = await getOrganizationMembership(userId, credential.organizationId);
    isIssuerMember = Boolean(
      membership &&
        (membership.role === OrganizationRole.ORGANIZATION_ADMIN ||
          membership.role === OrganizationRole.ORGANIZATION_ISSUER)
    );
  }

  if (!isHolder && !isIssuerMember) {
    throw new AppError(403, "FORBIDDEN", "You do not have access to this credential");
  }

  const artifacts = await prisma.credentialArtifact.findMany({
    where: {
      credentialId,
      completedAt: { not: null }
    },
    orderBy: { createdAt: "desc" }
  });

  const storage = getStorageService();
  const data = await Promise.all(
    artifacts.map(async (artifact) => {
      const signed = await storage.createSignedDownloadUrl({
        path: artifact.storagePath,
        expiresInSeconds: DOWNLOAD_URL_TTL_SECONDS
      });

      return {
        id: artifact.id,
        credentialId: artifact.credentialId,
        originalFileName: artifact.originalFileName,
        mimeType: artifact.mimeType,
        sizeBytes: artifact.sizeBytes,
        checksumSha256: artifact.checksumSha256,
        completedAt: artifact.completedAt,
        createdAt: artifact.createdAt,
        downloadUrl: signed.downloadUrl,
        downloadUrlExpiresAt: signed.expiresAt
      };
    })
  );

  return { data };
}
