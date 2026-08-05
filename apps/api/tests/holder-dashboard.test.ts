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
      revoked: 0
    });
    expect(response.body.recentCredentials).toEqual([]);
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
    expect(response.body.stats).toEqual({
      total: 3,
      active: 1,
      expired: 1,
      revoked: 1
    });
    expect(response.body.recentCredentials).toHaveLength(3);
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
});
