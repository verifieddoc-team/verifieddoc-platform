import { createHash } from "node:crypto";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { getMemoryStorageAdapter } from "../src/services/storage/index.js";
import {
  issueCredentialRequest,
  registerHolder,
  setupVerifiedOrganization
} from "./helpers/credentialTestData.js";
import { cleanupTestData, createTestUser, disconnectTestDatabase } from "./helpers/testData.js";

const app = createApp();

describe("Credential artifacts", () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("uploads, completes with backend SHA-256, and lists for holder and issuer", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);

    const issueResponse = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.user.email
    });
    expect(issueResponse.status).toBe(201);
    const credentialId = issueResponse.body.credential.id as string;
    const fileBytes = Buffer.from("%PDF-1.4 credential artifact body");

    const uploadResponse = await request(app)
      .post(`/api/v1/organizations/${organizationId}/credentials/${credentialId}/artifacts/upload-url`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        originalFileName: "../cert.pdf",
        mimeType: "application/pdf",
        sizeBytes: fileBytes.byteLength
      });

    expect(uploadResponse.status).toBe(201);
    expect(uploadResponse.body.artifactId).toEqual(expect.any(String));

    const pending = await prisma.credentialArtifact.findUniqueOrThrow({
      where: { id: uploadResponse.body.artifactId }
    });
    expect(pending.originalFileName).toBe("cert.pdf");
    expect(pending.completedAt).toBeNull();

    await getMemoryStorageAdapter().putObject(pending.storagePath, fileBytes, "application/pdf");

    const completeResponse = await request(app)
      .post(
        `/api/v1/organizations/${organizationId}/credentials/${credentialId}/artifacts/${pending.id}/complete`
      )
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({});

    expect(completeResponse.status).toBe(200);
    const expectedChecksum = createHash("sha256").update(fileBytes).digest("hex");
    expect(completeResponse.body.artifact.checksumSha256).toBe(expectedChecksum);
    expect(completeResponse.body.artifact.completedAt).toBeTruthy();

    const holderList = await request(app)
      .get(`/api/v1/credentials/${credentialId}/artifacts`)
      .set("Authorization", `Bearer ${holder.accessToken}`);

    expect(holderList.status).toBe(200);
    expect(holderList.body.data).toHaveLength(1);
    expect(holderList.body.data[0].downloadUrl).toContain("memory://download/");
    expect(holderList.body.data[0].checksumSha256).toBe(expectedChecksum);

    const issuerList = await request(app)
      .get(`/api/v1/credentials/${credentialId}/artifacts`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(issuerList.status).toBe(200);
    expect(issuerList.body.data).toHaveLength(1);

    const outsider = await createTestUser();
    const outsiderList = await request(app)
      .get(`/api/v1/credentials/${credentialId}/artifacts`)
      .set("Authorization", `Bearer ${outsider.accessToken}`);

    expect(outsiderList.status).toBe(403);
  });

  it("enforces organization isolation for artifact upload", async () => {
    const first = await setupVerifiedOrganization(app);
    const second = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);

    const issueResponse = await issueCredentialRequest(
      app,
      first.organizationId,
      first.admin.accessToken,
      { holderEmail: holder.user.email }
    );
    const credentialId = issueResponse.body.credential.id as string;

    const response = await request(app)
      .post(
        `/api/v1/organizations/${second.organizationId}/credentials/${credentialId}/artifacts/upload-url`
      )
      .set("Authorization", `Bearer ${second.admin.accessToken}`)
      .send({
        originalFileName: "cross.pdf",
        mimeType: "application/pdf",
        sizeBytes: 12
      });

    expect(response.status).toBe(403);
  });
});
