import { DocumentUploadStatus, OrganizationDocumentType } from "@prisma/client";
import { createHash } from "node:crypto";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { getMemoryStorageAdapter } from "../src/services/storage/index.js";
import { setupVerifiedOrganization } from "./helpers/credentialTestData.js";
import {
  cleanupTestData,
  createPlatformAdminSession,
  createTestUser,
  disconnectTestDatabase
} from "./helpers/testData.js";

const app = createApp();

describe("Organization registration documents", () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("covers upload, complete, list download URL, admin review, and delete lifecycle", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const fileBytes = Buffer.from("%PDF-1.4 fictional registration certificate");

    const uploadUrlResponse = await request(app)
      .post(`/api/v1/organizations/${organizationId}/registration-documents/upload-url`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        documentType: OrganizationDocumentType.REGISTRATION_CERTIFICATE,
        originalFileName: "../../evil/reg cert.pdf",
        mimeType: "application/pdf",
        sizeBytes: fileBytes.byteLength
      });

    expect(uploadUrlResponse.status).toBe(201);
    expect(uploadUrlResponse.body.documentId).toEqual(expect.any(String));
    expect(uploadUrlResponse.body.uploadUrl).toContain("memory://upload/");

    const document = await prisma.organizationDocument.findUniqueOrThrow({
      where: { id: uploadUrlResponse.body.documentId }
    });
    expect(document.originalFileName).toBe("reg cert.pdf");
    expect(document.status).toBe(DocumentUploadStatus.PENDING_UPLOAD);

    const completeMissing = await request(app)
      .post(
        `/api/v1/organizations/${organizationId}/registration-documents/${document.id}/complete`
      )
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({});

    expect(completeMissing.status).toBe(400);
    expect(completeMissing.body.error.code).toBe("UPLOAD_INCOMPLETE");

    await getMemoryStorageAdapter().putObject(document.storagePath, fileBytes, "application/pdf");

    const completeOk = await request(app)
      .post(
        `/api/v1/organizations/${organizationId}/registration-documents/${document.id}/complete`
      )
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({});

    expect(completeOk.status).toBe(200);
    expect(completeOk.body.document.status).toBe(DocumentUploadStatus.UPLOADED);
    expect(completeOk.body.document.downloadUrl).toContain("memory://download/");
    expect(completeOk.body.document.originalFileName).toBe("reg cert.pdf");

    const expectedChecksum = createHash("sha256").update(fileBytes).digest("hex");
    const stored = await prisma.organizationDocument.findUniqueOrThrow({
      where: { id: document.id }
    });
    expect(stored.checksumSha256).toBe(expectedChecksum);

    const listResponse = await request(app)
      .get(`/api/v1/organizations/${organizationId}/registration-documents`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.data[0].downloadUrl).toContain("memory://download/");

    const { accessToken: platformToken } = await createPlatformAdminSession();
    const adminList = await request(app)
      .get(`/api/v1/admin/organizations/${organizationId}/registration-documents`)
      .set("Authorization", `Bearer ${platformToken}`);

    expect(adminList.status).toBe(200);
    expect(adminList.body.data).toHaveLength(1);

    const reviewResponse = await request(app)
      .patch(
        `/api/v1/admin/organizations/${organizationId}/registration-documents/${document.id}/review`
      )
      .set("Authorization", `Bearer ${platformToken}`)
      .send({ decision: "VERIFY" });

    expect(reviewResponse.status).toBe(200);
    expect(reviewResponse.body.document.status).toBe(DocumentUploadStatus.VERIFIED);

    const deleteVerified = await request(app)
      .delete(`/api/v1/organizations/${organizationId}/registration-documents/${document.id}`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(deleteVerified.status).toBe(409);
    expect(deleteVerified.body.error.code).toBe("DOCUMENT_NOT_DELETABLE");
  });

  it("allows deleting non-verified documents and enforces isolation", async () => {
    const first = await setupVerifiedOrganization(app);
    const second = await setupVerifiedOrganization(app);
    const fileContent = "png-bytes";

    const upload = await request(app)
      .post(`/api/v1/organizations/${first.organizationId}/registration-documents/upload-url`)
      .set("Authorization", `Bearer ${first.admin.accessToken}`)
      .send({
        documentType: OrganizationDocumentType.TAX_DOCUMENT,
        originalFileName: "tax.png",
        mimeType: "image/png",
        sizeBytes: fileContent.length
      });

    const complete = await request(app)
      .post(
        `/api/v1/organizations/${first.organizationId}/registration-documents/${upload.body.documentId}/complete`
      )
      .set("Authorization", `Bearer ${first.admin.accessToken}`)
      .send({ fileContent });

    expect(complete.status).toBe(200);

    const crossList = await request(app)
      .get(`/api/v1/organizations/${first.organizationId}/registration-documents`)
      .set("Authorization", `Bearer ${second.admin.accessToken}`);
    expect(crossList.status).toBe(403);

    const outsider = await createTestUser();
    const outsiderList = await request(app)
      .get(`/api/v1/organizations/${first.organizationId}/registration-documents`)
      .set("Authorization", `Bearer ${outsider.accessToken}`);
    expect(outsiderList.status).toBe(403);

    const deleteResponse = await request(app)
      .delete(
        `/api/v1/organizations/${first.organizationId}/registration-documents/${upload.body.documentId}`
      )
      .set("Authorization", `Bearer ${first.admin.accessToken}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.deleted).toBe(true);
  });

  it("rejects unsupported mime types and oversized files", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);

    const mimeRejected = await request(app)
      .post(`/api/v1/organizations/${organizationId}/registration-documents/upload-url`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        documentType: OrganizationDocumentType.OTHER,
        originalFileName: "notes.txt",
        mimeType: "text/plain",
        sizeBytes: 100
      });

    expect(mimeRejected.status).toBe(400);

    const oversized = await request(app)
      .post(`/api/v1/organizations/${organizationId}/registration-documents/upload-url`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        documentType: OrganizationDocumentType.OTHER,
        originalFileName: "big.pdf",
        mimeType: "application/pdf",
        sizeBytes: 11 * 1024 * 1024
      });

    expect(oversized.status).toBe(400);
  });
});
