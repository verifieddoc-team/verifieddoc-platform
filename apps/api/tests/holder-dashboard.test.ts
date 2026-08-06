import { PlatformRole } from "@prisma/client";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import {
  expectNoSensitiveAuthData,
  issueCredentialRequest,
  registerHolder,
  setupVerifiedOrganization
} from "./helpers/credentialTestData.js";
import {
  cleanupTestData,
  createTestUser,
  disconnectTestDatabase
} from "./helpers/testData.js";

const app = createApp();

describe("Holder dashboard", () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await request(app).get("/api/v1/holder/dashboard");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 403 for authenticated VERIFIER users", async () => {
    const verifier = await createTestUser({
      role: PlatformRole.VERIFIER,
      firstName: "Fictional",
      lastName: "Verifier"
    });

    const response = await request(app)
      .get("/api/v1/holder/dashboard")
      .set("Authorization", `Bearer ${verifier.accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("returns 200 for authenticated HOLDER users", async () => {
    const holder = await registerHolder(app);

    const response = await request(app)
      .get("/api/v1/holder/dashboard")
      .set("Authorization", `Bearer ${holder.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.holder).toMatchObject({
      id: holder.user.id,
      email: holder.payload.email,
      firstName: holder.payload.firstName,
      lastName: holder.payload.lastName,
      role: "HOLDER"
    });
    expectNoSensitiveAuthData(response.body);
  });

  it("exposes the shared HolderDashboardResponse contract field names", async () => {
    const holder = await registerHolder(app);

    const response = await request(app)
      .get("/api/v1/holder/dashboard")
      .set("Authorization", `Bearer ${holder.accessToken}`);

    expect(response.status).toBe(200);
    expect(Object.keys(response.body).sort()).toEqual([
      "holder",
      "recentActivity",
      "recentCredentials",
      "stats"
    ]);
    expect(Object.keys(response.body.stats).sort()).toEqual([
      "active",
      "expired",
      "pendingVerifications",
      "revoked",
      "sharedThisMonth",
      "total"
    ]);
    expect(response.body.holder.role).toBe("HOLDER");
    expect(response.body.holder.fullName).toBe("Fictional Holder");
    expect(response.body.holder.firstName).toBe("Fictional");
    expect(response.body.holder.lastName).toBe("Holder");
  });

  it("returns zero counts and an empty recentCredentials array for empty holders", async () => {
    const holder = await registerHolder(app);

    const response = await request(app)
      .get("/api/v1/holder/dashboard")
      .set("Authorization", `Bearer ${holder.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.stats).toEqual({
      total: 0,
      active: 0,
      expired: 0,
      revoked: 0,
      pendingVerifications: 0,
      sharedThisMonth: 0
    });
    expect(response.body.recentCredentials).toEqual([]);
    expect(response.body.recentActivity).toEqual([]);
  });

  it("returns only the authenticated holder's credentials and correct effective counts", async () => {
    const firstOrg = await setupVerifiedOrganization(app);
    const secondOrg = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);
    const otherHolder = await registerHolder(app);

    const activeResponse = await issueCredentialRequest(app, firstOrg.organizationId, firstOrg.admin.accessToken, {
      holderEmail: holder.payload.email,
      referenceNo: `HD-ACTIVE-${Date.now()}`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });
    expect(activeResponse.status).toBe(201);

    const expiredByDateResponse = await issueCredentialRequest(
      app,
      firstOrg.organizationId,
      firstOrg.admin.accessToken,
      {
        holderEmail: holder.payload.email,
        referenceNo: `HD-EXPIRED-${Date.now()}`,
        issuedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
    );
    expect(expiredByDateResponse.status).toBe(201);
    expect(expiredByDateResponse.body.credential.status).toBe("ACTIVE");
    expect(expiredByDateResponse.body.credential.effectiveStatus).toBe("EXPIRED");

    const revokedIssueResponse = await issueCredentialRequest(
      app,
      firstOrg.organizationId,
      firstOrg.admin.accessToken,
      {
        holderEmail: holder.payload.email,
        referenceNo: `HD-REVOKED-${Date.now()}`
      }
    );
    expect(revokedIssueResponse.status).toBe(201);

    const revokeResponse = await request(app)
      .patch(
        `/api/v1/organizations/${firstOrg.organizationId}/credentials/${revokedIssueResponse.body.credential.id}/revoke`
      )
      .set("Authorization", `Bearer ${firstOrg.admin.accessToken}`)
      .send({ reason: "Fictional revocation for holder dashboard test." });
    expect(revokeResponse.status).toBe(200);

    const otherHolderCredential = await issueCredentialRequest(
      app,
      secondOrg.organizationId,
      secondOrg.admin.accessToken,
      {
        holderEmail: otherHolder.payload.email,
        referenceNo: `HD-OTHER-${Date.now()}`
      }
    );
    expect(otherHolderCredential.status).toBe(201);

    const response = await request(app)
      .get("/api/v1/holder/dashboard")
      .set("Authorization", `Bearer ${holder.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.stats).toMatchObject({
      total: 3,
      active: 1,
      expired: 1,
      revoked: 1,
      pendingVerifications: 0,
      sharedThisMonth: 0
    });
    expect(response.body.recentCredentials).toHaveLength(3);
    expect(response.body.recentActivity.length).toBeGreaterThan(0);
    expect(
      response.body.recentActivity.every((item: { type: string }) =>
        ["CREDENTIAL_ISSUED", "SHARE_LINK_CREATED", "VERIFICATION_EVENT", "VERIFICATION_REQUEST"].includes(
          item.type
        )
      )
    ).toBe(true);
    expect(
      response.body.recentCredentials.every(
        (credential: { id: string }) => credential.id !== otherHolderCredential.body.credential.id
      )
    ).toBe(true);
    expect(
      response.body.recentCredentials.some(
        (credential: { effectiveStatus: string; status: string }) =>
          credential.status === "ACTIVE" && credential.effectiveStatus === "EXPIRED"
      )
    ).toBe(true);
    expectNoSensitiveAuthData(response.body);
  });

  it("returns at most five recent credentials sorted newest first", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);
    const issuedIds: string[] = [];

    for (let index = 0; index < 6; index += 1) {
      const issuedAt = new Date(Date.now() - (5 - index) * 60_000).toISOString();
      const response = await issueCredentialRequest(app, organizationId, admin.accessToken, {
        holderEmail: holder.payload.email,
        referenceNo: `HD-RECENT-${index}-${Date.now()}`,
        issuedAt
      });
      expect(response.status).toBe(201);
      issuedIds.push(response.body.credential.id as string);
    }

    const response = await request(app)
      .get("/api/v1/holder/dashboard")
      .set("Authorization", `Bearer ${holder.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.stats.total).toBe(6);
    expect(response.body.recentCredentials).toHaveLength(5);

    const recentIds = response.body.recentCredentials.map(
      (credential: { id: string }) => credential.id
    );
    expect(recentIds).toEqual(issuedIds.slice().reverse().slice(0, 5));

    const issuedAtValues = response.body.recentCredentials.map(
      (credential: { issuedAt: string }) => new Date(credential.issuedAt).getTime()
    );
    expect(issuedAtValues).toEqual([...issuedAtValues].sort((left, right) => right - left));
  });

  it("lists holder activity and personal documents", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);

    const issued = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email
    });
    expect(issued.status).toBe(201);

    const activityResponse = await request(app)
      .get("/api/v1/holder/activity")
      .set("Authorization", `Bearer ${holder.accessToken}`);

    expect(activityResponse.status).toBe(200);
    expect(activityResponse.body.data.length).toBeGreaterThan(0);
    expect(activityResponse.body.data[0]).toMatchObject({
      type: "CREDENTIAL_ISSUED",
      title: expect.stringContaining("Credential issued")
    });

    const uploadResponse = await request(app)
      .post("/api/v1/holder/documents/upload-url")
      .set("Authorization", `Bearer ${holder.accessToken}`)
      .send({
        title: "Passport scan",
        documentType: "IDENTITY",
        originalFileName: "passport.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024
      });

    expect(uploadResponse.status).toBe(201);
    expect(uploadResponse.body.documentId).toEqual(expect.any(String));
    expect(uploadResponse.body.uploadUrl).toEqual(expect.any(String));

    const completeResponse = await request(app)
      .post(`/api/v1/holder/documents/${uploadResponse.body.documentId}/complete`)
      .set("Authorization", `Bearer ${holder.accessToken}`)
      .send({ fileContent: "personal-doc-bytes" });

    expect(completeResponse.status).toBe(200);
    expect(completeResponse.body.document.uploadedAt).toEqual(expect.any(String));

    const listResponse = await request(app)
      .get("/api/v1/holder/documents")
      .set("Authorization", `Bearer ${holder.accessToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);
    expect(JSON.stringify(listResponse.body)).not.toMatch(/storagePath/i);

    const deleteResponse = await request(app)
      .delete(`/api/v1/holder/documents/${uploadResponse.body.documentId}`)
      .set("Authorization", `Bearer ${holder.accessToken}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.deleted).toBe(true);
  });
});
