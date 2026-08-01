import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { hashToken } from "../src/lib/tokens.js";
import { expectNoSensitiveAuthData, registerHolder } from "./helpers/credentialTestData.js";
import {
  createShareLinkRequest,
  listShareLinksRequest,
  revokeShareLinkRequest,
  setupHolderCredential,
  verifyShareTokenRequest
} from "./helpers/shareLinkTestData.js";
import { cleanupTestData, disconnectTestDatabase } from "./helpers/testData.js";

const app = createApp();

function expectNoShareSecrets(body: unknown) {
  const serialized = JSON.stringify(body);
  expect(serialized).not.toMatch(/tokenHash/i);
  expectNoSensitiveAuthData(body);
}

function expectNoVerificationSecrets(body: unknown, rawToken?: string) {
  const serialized = JSON.stringify(body);
  expect(serialized).not.toMatch(/tokenHash/i);
  expect(serialized).not.toMatch(/holderId/i);
  expect(serialized).not.toMatch(/organizationId/i);
  expect(serialized).not.toMatch(/credentialId/i);
  expect(serialized).not.toMatch(/shareLinkId/i);
  expect(serialized).not.toMatch(/revocationReason/i);
  expect(serialized).not.toMatch(/@example\.test/i);
  expect(serialized).not.toMatch(/email/i);
  if (rawToken) {
    expect(serialized).not.toContain(rawToken);
  }
}

describe("Credential sharing and public verification", () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("allows the credential holder to create a share link", async () => {
    const { holder, credentialId } = await setupHolderCredential(app);

    const response = await createShareLinkRequest(app, credentialId, holder.accessToken, {
      maxViews: 5,
      disclosedClaims: ["trainingSite"]
    });

    expect(response.status).toBe(201);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.verificationPath).toBe(`/verify/${response.body.token}`);
    expect(response.body.verificationUrl).toContain(`/verify/${response.body.token}`);
    expect(response.body.shareLink).toMatchObject({
      maxViews: 5,
      viewCount: 0,
      disclosedClaims: ["trainingSite"],
      includeHolderName: false,
      includeReferenceNo: false,
      state: "ACTIVE"
    });
    expectNoShareSecrets(response.body);
  });

  it("prevents non-holders from creating share links", async () => {
    const { credentialId } = await setupHolderCredential(app);
    const outsider = await registerHolder(app);

    const response = await createShareLinkRequest(app, credentialId, outsider.accessToken);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("returns the raw token once and never exposes tokenHash", async () => {
    const { holder, credentialId } = await setupHolderCredential(app);

    const response = await createShareLinkRequest(app, credentialId, holder.accessToken);

    expect(response.status).toBe(201);
    expect(response.body.token).toBeTruthy();
    expect(response.body.tokenHash).toBeUndefined();
    expect(response.body.shareLink.tokenHash).toBeUndefined();
  });

  it("stores only the SHA-256 hash of the share token", async () => {
    const { holder, credentialId } = await setupHolderCredential(app);

    const response = await createShareLinkRequest(app, credentialId, holder.accessToken);
    const rawToken = response.body.token as string;
    const storedShareLink = await prisma.shareLink.findUnique({
      where: { id: response.body.shareLink.id }
    });

    expect(storedShareLink?.tokenHash).toBe(hashToken(rawToken));
    expect(storedShareLink?.tokenHash).not.toBe(rawToken);
  });

  it("rejects invalid disclosed claims", async () => {
    const { holder, credentialId } = await setupHolderCredential(app);

    const response = await createShareLinkRequest(app, credentialId, holder.accessToken, {
      disclosedClaims: ["missingClaim"]
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_DISCLOSED_CLAIMS");
  });

  it("lists share links without exposing secrets", async () => {
    const { holder, credentialId } = await setupHolderCredential(app);
    const createResponse = await createShareLinkRequest(app, credentialId, holder.accessToken, {
      maxViews: 2
    });
    const rawToken = createResponse.body.token as string;

    const response = await listShareLinksRequest(app, credentialId, holder.accessToken);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      id: createResponse.body.shareLink.id,
      maxViews: 2,
      state: "ACTIVE"
    });
    expectNoShareSecrets(response.body);
    expect(JSON.stringify(response.body)).not.toContain(rawToken);
  });

  it("allows the holder to revoke a share link", async () => {
    const { holder, credentialId } = await setupHolderCredential(app);
    const createResponse = await createShareLinkRequest(app, credentialId, holder.accessToken);
    const shareLinkId = createResponse.body.shareLink.id as string;

    const response = await revokeShareLinkRequest(app, credentialId, shareLinkId, holder.accessToken);

    expect(response.status).toBe(200);
    expect(response.body.shareLink.state).toBe("REVOKED");
    expect(response.body.shareLink.revokedAt).toEqual(expect.any(String));
  });

  it("returns 409 when revoking an already revoked share link", async () => {
    const { holder, credentialId } = await setupHolderCredential(app);
    const createResponse = await createShareLinkRequest(app, credentialId, holder.accessToken);
    const shareLinkId = createResponse.body.shareLink.id as string;

    await revokeShareLinkRequest(app, credentialId, shareLinkId, holder.accessToken);
    const response = await revokeShareLinkRequest(app, credentialId, shareLinkId, holder.accessToken);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("SHARE_LINK_ALREADY_REVOKED");
  });

  it("handles concurrent share-link revocation safely", async () => {
    const { holder, credentialId } = await setupHolderCredential(app);
    const createResponse = await createShareLinkRequest(app, credentialId, holder.accessToken);
    const shareLinkId = createResponse.body.shareLink.id as string;

    const [firstResponse, secondResponse] = await Promise.all([
      revokeShareLinkRequest(app, credentialId, shareLinkId, holder.accessToken),
      revokeShareLinkRequest(app, credentialId, shareLinkId, holder.accessToken)
    ]);

    const statuses = [firstResponse.status, secondResponse.status].sort();
    expect(statuses).toEqual([200, 409]);
  });

  it("returns a generic response for unknown verification tokens", async () => {
    const response = await verifyShareTokenRequest(app, `unknown-${randomUUID()}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("VERIFICATION_UNAVAILABLE");
  });

  it("returns a generic response for expired share links", async () => {
    const { holder, credentialId } = await setupHolderCredential(app);
    const createResponse = await createShareLinkRequest(app, credentialId, holder.accessToken, {
      expiresInHours: 1
    });
    const rawToken = createResponse.body.token as string;

    await prisma.shareLink.update({
      where: { id: createResponse.body.shareLink.id },
      data: { expiresAt: new Date(Date.now() - 60_000) }
    });

    const response = await verifyShareTokenRequest(app, rawToken);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("VERIFICATION_UNAVAILABLE");
  });

  it("returns a generic response for revoked share links", async () => {
    const { holder, credentialId } = await setupHolderCredential(app);
    const createResponse = await createShareLinkRequest(app, credentialId, holder.accessToken);
    const rawToken = createResponse.body.token as string;

    await revokeShareLinkRequest(
      app,
      credentialId,
      createResponse.body.shareLink.id,
      holder.accessToken
    );

    const response = await verifyShareTokenRequest(app, rawToken);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("VERIFICATION_UNAVAILABLE");
  });

  it("enforces share-link view limits", async () => {
    const { holder, credentialId } = await setupHolderCredential(app);
    const createResponse = await createShareLinkRequest(app, credentialId, holder.accessToken, {
      maxViews: 1
    });
    const rawToken = createResponse.body.token as string;

    const firstResponse = await verifyShareTokenRequest(app, rawToken);
    const secondResponse = await verifyShareTokenRequest(app, rawToken);

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(404);
    expect(secondResponse.body.error.code).toBe("VERIFICATION_UNAVAILABLE");
  });

  it("allows exactly one success for concurrent final-view requests", async () => {
    const { holder, credentialId } = await setupHolderCredential(app);
    const createResponse = await createShareLinkRequest(app, credentialId, holder.accessToken, {
      maxViews: 1
    });
    const rawToken = createResponse.body.token as string;

    const [firstResponse, secondResponse] = await Promise.all([
      verifyShareTokenRequest(app, rawToken),
      verifyShareTokenRequest(app, rawToken)
    ]);

    const successCount = [firstResponse, secondResponse].filter((response) => response.status === 200).length;
    const failureCount = [firstResponse, secondResponse].filter((response) => response.status === 404).length;

    expect(successCount).toBe(1);
    expect(failureCount).toBe(1);

    const storedShareLink = await prisma.shareLink.findUnique({
      where: { id: createResponse.body.shareLink.id }
    });
    expect(storedShareLink?.viewCount).toBe(1);
  });

  it("verifies a valid credential through an active share link", async () => {
    const { holder, credentialId, credential } = await setupHolderCredential(app);
    const createResponse = await createShareLinkRequest(app, credentialId, holder.accessToken, {
      disclosedClaims: ["trainingSite", "completionScore"]
    });
    const rawToken = createResponse.body.token as string;

    const response = await verifyShareTokenRequest(app, rawToken);

    expect(response.status).toBe(200);
    expect(response.body.result).toBe("VALID");
    expect(response.body.credential).toMatchObject({
      publicId: credential.publicId,
      title: credential.title,
      effectiveStatus: "ACTIVE",
      organization: {
        name: credential.organization.name,
        slug: credential.organization.slug
      }
    });
    expect(response.body.credential.holderName).toBeUndefined();
    expect(response.body.credential.claims).toEqual({
      trainingSite: "Northwind Campus",
      completionScore: 92
    });
    expectNoVerificationSecrets(response.body, rawToken);
  });

  it("reports expired credentials accurately through an active share link", async () => {
    const { holder, credentialId } = await setupHolderCredential(app, {
      issuedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    });
    const createResponse = await createShareLinkRequest(app, credentialId, holder.accessToken);
    const rawToken = createResponse.body.token as string;

    const response = await verifyShareTokenRequest(app, rawToken);

    expect(response.status).toBe(200);
    expect(response.body.result).toBe("EXPIRED");
    expect(response.body.credential.effectiveStatus).toBe("EXPIRED");
    expectNoVerificationSecrets(response.body, rawToken);
  });

  it("reports revoked credentials accurately through an active share link", async () => {
    const { admin, organizationId, holder, credentialId } = await setupHolderCredential(app);
    const createResponse = await createShareLinkRequest(app, credentialId, holder.accessToken);
    const rawToken = createResponse.body.token as string;

    await request(app)
      .patch(`/api/v1/organizations/${organizationId}/credentials/${credentialId}/revoke`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ reason: "Fictional revocation for verification test." });

    const response = await verifyShareTokenRequest(app, rawToken);

    expect(response.status).toBe(200);
    expect(response.body.result).toBe("REVOKED");
    expect(response.body.credential.effectiveStatus).toBe("REVOKED");
    expect(response.body.credential.revokedAt).toEqual(expect.any(String));
    expect(response.body.credential.revocationReason).toBeUndefined();
    expectNoVerificationSecrets(response.body, rawToken);
  });

  it("omits holder name by default", async () => {
    const { holder, credentialId } = await setupHolderCredential(app);
    const createResponse = await createShareLinkRequest(app, credentialId, holder.accessToken);
    const rawToken = createResponse.body.token as string;

    const response = await verifyShareTokenRequest(app, rawToken);

    expect(response.status).toBe(200);
    expect(response.body.credential.holderName).toBeUndefined();
  });

  it("discloses holder name only when includeHolderName is true", async () => {
    const { holder, credentialId } = await setupHolderCredential(app);
    const createResponse = await createShareLinkRequest(app, credentialId, holder.accessToken, {
      includeHolderName: true
    });
    const rawToken = createResponse.body.token as string;

    const response = await verifyShareTokenRequest(app, rawToken);

    expect(response.status).toBe(200);
    expect(response.body.credential.holderName).toBe("Fictional Holder");
  });

  it("discloses reference number only when includeReferenceNo is true", async () => {
    const { holder, credentialId, credential } = await setupHolderCredential(app);

    const hiddenResponse = await createShareLinkRequest(app, credentialId, holder.accessToken, {
      includeReferenceNo: false
    });
    const hiddenVerify = await verifyShareTokenRequest(app, hiddenResponse.body.token);

    expect(hiddenVerify.status).toBe(200);
    expect(hiddenVerify.body.credential.referenceNo).toBeUndefined();

    const shownResponse = await createShareLinkRequest(app, credentialId, holder.accessToken, {
      includeReferenceNo: true
    });
    const shownVerify = await verifyShareTokenRequest(app, shownResponse.body.token);

    expect(shownVerify.status).toBe(200);
    expect(shownVerify.body.credential.referenceNo).toBe(credential.referenceNo);
  });

  it("discloses only selected claim keys", async () => {
    const { holder, credentialId } = await setupHolderCredential(app);
    const createResponse = await createShareLinkRequest(app, credentialId, holder.accessToken, {
      disclosedClaims: ["trainingSite"]
    });
    const rawToken = createResponse.body.token as string;

    const response = await verifyShareTokenRequest(app, rawToken);

    expect(response.status).toBe(200);
    expect(response.body.credential.claims).toEqual({ trainingSite: "Northwind Campus" });
    expect(response.body.credential.claims.completionScore).toBeUndefined();
  });

  it("never discloses holder email or internal IDs during verification", async () => {
    const { holder, credentialId, credential } = await setupHolderCredential(app);
    const createResponse = await createShareLinkRequest(app, credentialId, holder.accessToken, {
      disclosedClaims: ["trainingSite"],
      includeReferenceNo: true
    });
    const rawToken = createResponse.body.token as string;

    const response = await verifyShareTokenRequest(app, rawToken);

    expect(response.status).toBe(200);
    expect(response.body.credential.publicId).toBe(credential.publicId);
    expect(response.body.credential.id).toBeUndefined();
    expectNoVerificationSecrets(response.body, rawToken);
  });

  it("writes a verification audit entry without raw token values", async () => {
    const { holder, credentialId } = await setupHolderCredential(app);
    const createResponse = await createShareLinkRequest(app, credentialId, holder.accessToken);
    const rawToken = createResponse.body.token as string;

    const verifyResponse = await verifyShareTokenRequest(app, rawToken);
    expect(verifyResponse.status).toBe(200);

    const auditEntry = await prisma.auditLog.findFirst({
      where: {
        action: "VERIFY_CREDENTIAL",
        resourceType: "Credential",
        resourceId: credentialId
      },
      orderBy: { createdAt: "desc" }
    });

    expect(auditEntry).not.toBeNull();
    expect(JSON.stringify(auditEntry?.details ?? {})).not.toContain(rawToken);
    expect(JSON.stringify(auditEntry?.details ?? {})).not.toMatch(/tokenHash/i);
  });

  it("prevents another holder from revoking share links on a foreign credential", async () => {
    const { holder, credentialId } = await setupHolderCredential(app);
    const otherHolder = await registerHolder(app);
    const createResponse = await createShareLinkRequest(app, credentialId, holder.accessToken);

    const response = await revokeShareLinkRequest(
      app,
      credentialId,
      createResponse.body.shareLink.id,
      otherHolder.accessToken
    );

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("marks exhausted share links in listing state", async () => {
    const { holder, credentialId } = await setupHolderCredential(app);
    const createResponse = await createShareLinkRequest(app, credentialId, holder.accessToken, {
      maxViews: 1
    });
    const rawToken = createResponse.body.token as string;

    await verifyShareTokenRequest(app, rawToken);

    const response = await listShareLinksRequest(app, credentialId, holder.accessToken);

    expect(response.status).toBe(200);
    expect(response.body.data[0].state).toBe("EXHAUSTED");
    expect(response.body.data[0].viewCount).toBe(1);
    expect(response.body.data[0].lastViewedAt).toEqual(expect.any(String));
  });
});
