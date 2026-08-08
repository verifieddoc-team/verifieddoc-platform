import { createHash, randomUUID } from "node:crypto";
import { PlatformRole, VerificationOutcome } from "@prisma/client";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import {
  expectNoSensitiveAuthData,
  registerHolder,
  setupVerifiedOrganization
} from "./helpers/credentialTestData.js";
import {
  createShareLinkRequest,
  setupHolderCredential
} from "./helpers/shareLinkTestData.js";
import {
  cleanupTestData,
  createTestUser,
  disconnectTestDatabase
} from "./helpers/testData.js";

const app = createApp();

async function createVerifier() {
  return createTestUser({
    role: PlatformRole.VERIFIER,
    firstName: "Fictional",
    lastName: "Verifier"
  });
}

describe("Verifier module", () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("rejects non-verifier access to dashboard", async () => {
    const holder = await registerHolder(app);

    const response = await request(app)
      .get("/api/v1/verifier/dashboard")
      .set("Authorization", `Bearer ${holder.accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("returns empty dashboard stats for a new verifier", async () => {
    const verifier = await createVerifier();

    const response = await request(app)
      .get("/api/v1/verifier/dashboard")
      .set("Authorization", `Bearer ${verifier.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.stats).toEqual({
      totalVerifications: 0,
      successful: 0,
      failed: 0,
      thisMonth: 0
    });
    expect(response.body.recentVerifications).toEqual([]);
    expect(response.body.savedOrganizationsCount).toBe(0);
    expectNoSensitiveAuthData(response.body);
  });

  it("verifies via SHARE_TOKEN and records a VerificationEvent for the verifier", async () => {
    const { holder, credentialId, credential } = await setupHolderCredential(app);
    const share = await createShareLinkRequest(app, credentialId, holder.accessToken, {
      disclosedClaims: ["trainingSite"]
    });
    const verifier = await createVerifier();

    const response = await request(app)
      .post("/api/v1/verifier/verifications")
      .set("Authorization", `Bearer ${verifier.accessToken}`)
      .send({
        method: "SHARE_TOKEN",
        token: share.body.token
      });

    expect(response.status).toBe(200);
    expect(response.body.result).toBe("VALID");
    expect(response.body.credential.publicId).toBe(credential.publicId);
    expect(response.body.verification).toMatchObject({
      method: "SHARE_TOKEN",
      result: "VERIFIED"
    });

    const event = await prisma.verificationEvent.findUnique({
      where: { id: response.body.verification.id }
    });
    expect(event?.verifierId).toBe(verifier.user.id);
    expect(event?.result).toBe(VerificationOutcome.VERIFIED);
    expect(JSON.stringify(event)).not.toContain(share.body.token);

    const dashboard = await request(app)
      .get("/api/v1/verifier/dashboard")
      .set("Authorization", `Bearer ${verifier.accessToken}`);

    expect(dashboard.status).toBe(200);
    expect(dashboard.body.stats.totalVerifications).toBe(1);
    expect(dashboard.body.stats.successful).toBe(1);
    expect(dashboard.body.recentVerifications).toHaveLength(1);
  });

  it("verifies via PUBLIC_ID without exposing holder private fields", async () => {
    const { credential } = await setupHolderCredential(app);
    const verifier = await createVerifier();

    const response = await request(app)
      .post("/api/v1/verifier/verifications")
      .set("Authorization", `Bearer ${verifier.accessToken}`)
      .send({
        method: "PUBLIC_ID",
        publicId: credential.publicId
      });

    expect(response.status).toBe(200);
    expect(response.body.result).toBe("VALID");
    expect(response.body.credential).toMatchObject({
      publicId: credential.publicId,
      title: credential.title,
      organization: {
        name: credential.organization.name,
        slug: credential.organization.slug
      }
    });
    expect(response.body.credential.holderName).toBeUndefined();
    expect(response.body.credential.claims).toBeUndefined();
    expect(response.body.credential.referenceNo).toBeUndefined();
    expectNoSensitiveAuthData(response.body);
  });

  it("returns NOT_FOUND for unknown public IDs and lists history", async () => {
    const verifier = await createVerifier();

    const response = await request(app)
      .post("/api/v1/verifier/verifications")
      .set("Authorization", `Bearer ${verifier.accessToken}`)
      .send({
        method: "PUBLIC_ID",
        publicId: `missing-${randomUUID()}`
      });

    expect(response.status).toBe(200);
    expect(response.body.result).toBe("NOT_FOUND");
    expect(response.body.verification.result).toBe("NOT_FOUND");

    const history = await request(app)
      .get("/api/v1/verifier/verifications")
      .set("Authorization", `Bearer ${verifier.accessToken}`);

    expect(history.status).toBe(200);
    expect(history.body.data).toHaveLength(1);
    expect(history.body.data[0].result).toBe("NOT_FOUND");
  });

  it("creates a fraud alert when verifying a revoked credential by public id", async () => {
    const { admin, organizationId, credentialId, credential } = await setupHolderCredential(app);
    const verifier = await createVerifier();

    await request(app)
      .patch(`/api/v1/organizations/${organizationId}/credentials/${credentialId}/revoke`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ reason: "Fictional revocation for verifier fraud alert." });

    const response = await request(app)
      .post("/api/v1/verifier/verifications")
      .set("Authorization", `Bearer ${verifier.accessToken}`)
      .send({
        method: "PUBLIC_ID",
        publicId: credential.publicId
      });

    expect(response.status).toBe(200);
    expect(response.body.result).toBe("REVOKED");

    const alert = await prisma.fraudAlert.findFirst({
      where: {
        type: "REVOKED_CREDENTIAL_ACCESS",
        credentialId
      }
    });
    expect(alert).not.toBeNull();
  });

  it("supports saved organizations CRUD", async () => {
    const { organizationId, organization } = await setupVerifiedOrganization(app);
    const verifier = await createVerifier();

    const saveResponse = await request(app)
      .post("/api/v1/verifier/saved-organizations")
      .set("Authorization", `Bearer ${verifier.accessToken}`)
      .send({ organizationId });

    expect(saveResponse.status).toBe(201);
    expect(saveResponse.body.savedOrganization.organization.slug).toBe(organization.slug);

    const listResponse = await request(app)
      .get("/api/v1/verifier/saved-organizations")
      .set("Authorization", `Bearer ${verifier.accessToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);

    const deleteResponse = await request(app)
      .delete(`/api/v1/verifier/saved-organizations/${organizationId}`)
      .set("Authorization", `Bearer ${verifier.accessToken}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.deleted).toBe(true);
  });

  it("creates, lists, and cancels verification requests", async () => {
    const { holder, credentialId } = await setupHolderCredential(app);
    const verifier = await createVerifier();

    const createResponse = await request(app)
      .post("/api/v1/verifier/verification-requests")
      .set("Authorization", `Bearer ${verifier.accessToken}`)
      .send({
        credentialId,
        requesterNote: "Please confirm employment eligibility."
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.request.status).toBe("PENDING");

    const holderRequests = await request(app)
      .get("/api/v1/holder/verification-requests")
      .set("Authorization", `Bearer ${holder.accessToken}`);

    expect(holderRequests.status).toBe(200);
    expect(holderRequests.body.data).toHaveLength(1);

    const cancelResponse = await request(app)
      .patch(`/api/v1/verifier/verification-requests/${createResponse.body.request.id}/cancel`)
      .set("Authorization", `Bearer ${verifier.accessToken}`);

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.request.status).toBe("CANCELLED");
  });

  it("matches file hash verifications against completed credential artifacts", async () => {
    const { admin, credentialId } = await setupHolderCredential(app);

    const fileBytes = `artifact-${randomUUID()}`;
    const checksumSha256 = createHash("sha256").update(fileBytes).digest("hex");

    await prisma.credentialArtifact.create({
      data: {
        credentialId,
        originalFileName: "certificate.pdf",
        mimeType: "application/pdf",
        sizeBytes: Buffer.byteLength(fileBytes),
        storagePath: `artifacts/${randomUUID()}.pdf`,
        checksumSha256,
        uploadedById: admin.user.id,
        completedAt: new Date()
      }
    });

    const verifier = await createVerifier();

    const uploadUrlResponse = await request(app)
      .post("/api/v1/verifier/file-verifications/upload-url")
      .set("Authorization", `Bearer ${verifier.accessToken}`)
      .send({
        originalFileName: "check.pdf",
        mimeType: "application/pdf",
        sizeBytes: Buffer.byteLength(fileBytes)
      });

    expect(uploadUrlResponse.status).toBe(201);

    const completeResponse = await request(app)
      .post(`/api/v1/verifier/file-verifications/${uploadUrlResponse.body.uploadId}/complete`)
      .set("Authorization", `Bearer ${verifier.accessToken}`)
      .send({ fileContent: fileBytes });

    expect(completeResponse.status).toBe(200);
    expect(completeResponse.body.result).toBe("VALID");
    expect(completeResponse.body.verification.method).toBe("FILE_HASH");
    expect(completeResponse.body.verification.result).toBe("VERIFIED");
  });

  it("creates FILE_HASH_MISMATCH fraud alerts when hashes do not match", async () => {
    const verifier = await createVerifier();

    const uploadUrlResponse = await request(app)
      .post("/api/v1/verifier/file-verifications/upload-url")
      .set("Authorization", `Bearer ${verifier.accessToken}`)
      .send({
        originalFileName: "unknown.pdf",
        mimeType: "application/pdf",
        sizeBytes: 32
      });

    const completeResponse = await request(app)
      .post(`/api/v1/verifier/file-verifications/${uploadUrlResponse.body.uploadId}/complete`)
      .set("Authorization", `Bearer ${verifier.accessToken}`)
      .send({ fileContent: `mismatch-${randomUUID()}` });

    expect(completeResponse.status).toBe(200);
    expect(completeResponse.body.result).toBe("NOT_FOUND");

    const alert = await prisma.fraudAlert.findFirst({
      where: {
        type: "FILE_HASH_MISMATCH",
        verificationEventId: completeResponse.body.verification.id
      }
    });
    expect(alert).not.toBeNull();
  });
});
