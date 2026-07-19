import { randomUUID } from "node:crypto";
import { CredentialStatus, OrganizationStatus } from "@prisma/client";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import {
  addOrganizationIssuer,
  createGlobalPlatformAdminHolder,
  createIssueCredentialPayload,
  expectNoSensitiveAuthData,
  issueCredentialRequest,
  registerHolder,
  setOrganizationStatus,
  setupVerifiedOrganization
} from "./helpers/credentialTestData.js";
import { cleanupTestData, applyForOrganization, disconnectTestDatabase } from "./helpers/testData.js";

const app = createApp();

describe("Credential lifecycle", () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("allows verified organization admins to issue credentials", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);

    const response = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email
    });

    expect(response.status).toBe(201);
    expect(response.body.credential).toMatchObject({
      title: expect.any(String),
      status: "ACTIVE",
      effectiveStatus: "ACTIVE",
      organization: { id: organizationId }
    });
    expectNoSensitiveAuthData(response.body);
  });

  it("allows verified organization issuers to issue credentials", async () => {
    const { organizationId } = await setupVerifiedOrganization(app);
    const issuer = await addOrganizationIssuer(organizationId, app);
    const holder = await registerHolder(app);

    const response = await issueCredentialRequest(app, organizationId, issuer.accessToken, {
      holderEmail: holder.payload.email
    });

    expect(response.status).toBe(201);
    expect(response.body.credential.status).toBe("ACTIVE");
  });

  it("prevents pending organizations from issuing credentials", async () => {
    const admin = await registerHolder(app);
    const { response: application } = await applyForOrganization(app, admin.accessToken);
    const organizationId = application.body.organization.id as string;
    const holder = await registerHolder(app);

    const response = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ORGANIZATION_NOT_VERIFIED");
  });

  it("prevents rejected organizations from issuing credentials", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    await setOrganizationStatus(organizationId, OrganizationStatus.REJECTED);
    const holder = await registerHolder(app);

    const response = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ORGANIZATION_NOT_VERIFIED");
  });

  it("prevents suspended organizations from issuing credentials", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    await setOrganizationStatus(organizationId, OrganizationStatus.SUSPENDED);
    const holder = await registerHolder(app);

    const response = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ORGANIZATION_NOT_VERIFIED");
  });

  it("prevents holders without organization membership from issuing credentials", async () => {
    const { organizationId } = await setupVerifiedOrganization(app);
    const outsider = await registerHolder(app);

    const response = await issueCredentialRequest(app, organizationId, outsider.accessToken, {
      holderEmail: outsider.payload.email
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("prevents cross-organization issuers from issuing credentials", async () => {
    const firstOrg = await setupVerifiedOrganization(app);
    const secondOrg = await setupVerifiedOrganization(app);
    const crossOrgIssuer = await addOrganizationIssuer(firstOrg.organizationId, app);
    const holder = await registerHolder(app);

    const response = await issueCredentialRequest(app, secondOrg.organizationId, crossOrgIssuer.accessToken, {
      holderEmail: holder.payload.email
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("returns 404 when the holder email is not registered", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);

    const response = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: `missing.holder.${randomUUID()}@example.test`
    });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("HOLDER_NOT_FOUND");
  });

  it("returns 409 for duplicate reference numbers", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);
    const referenceNo = `NW-DUP-${randomUUID().slice(0, 8)}`;

    const firstResponse = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email,
      referenceNo
    });
    expect(firstResponse.status).toBe(201);

    const duplicateResponse = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email,
      referenceNo
    });

    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body.error.code).toBe("REFERENCE_ALREADY_EXISTS");
  });

  it("handles concurrent duplicate issuance safely", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);
    const referenceNo = `NW-CONC-${randomUUID().slice(0, 8)}`;
    const payload = createIssueCredentialPayload({
      holderEmail: holder.payload.email,
      referenceNo
    });

    const [firstResponse, secondResponse] = await Promise.all([
      request(app)
        .post(`/api/v1/organizations/${organizationId}/credentials`)
        .set("Authorization", `Bearer ${admin.accessToken}`)
        .send(payload),
      request(app)
        .post(`/api/v1/organizations/${organizationId}/credentials`)
        .set("Authorization", `Bearer ${admin.accessToken}`)
        .send(payload)
    ]);

    const statuses = [firstResponse.status, secondResponse.status];
    expect(statuses).toContain(201);
    expect(statuses).toContain(409);
    expect(statuses.every((status) => status !== 500)).toBe(true);
  });

  it("rejects invalid credential date ranges", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);
    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() - 60_000).toISOString();

    const response = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email,
      issuedAt,
      expiresAt
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects unsafe or oversized claims", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);

    const nestedClaimsResponse = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email,
      claims: {
        level: {
          nested: "not-allowed"
        }
      }
    });
    expect(nestedClaimsResponse.status).toBe(400);

    const oversizedClaims = Object.fromEntries(
      Array.from({ length: 21 }, (_, index) => [`claim${index}`, `value-${index}`])
    );
    const oversizedResponse = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email,
      claims: oversizedClaims
    });
    expect(oversizedResponse.status).toBe(400);
  });

  it("rejects prohibited claim keys", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);

    for (const prohibitedKey of ["__proto__", "prototype", "constructor"]) {
      const response = await issueCredentialRequest(app, organizationId, admin.accessToken, {
        holderEmail: holder.payload.email,
        referenceNo: `NW-KEY-${prohibitedKey}-${randomUUID().slice(0, 6)}`,
        claims: {
          [prohibitedKey]: "fictional-value"
        }
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("filters holder wallet credentials by effective ACTIVE status", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);

    const activeResponse = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email,
      referenceNo: `NW-ACTIVE-${randomUUID().slice(0, 8)}`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });
    expect(activeResponse.status).toBe(201);

    await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email,
      referenceNo: `NW-EFFECTIVE-EXP-${randomUUID().slice(0, 8)}`,
      issuedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    });

    const revokedResponse = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email,
      referenceNo: `NW-REVOKED-${randomUUID().slice(0, 8)}`
    });
    await request(app)
      .patch(`/api/v1/organizations/${organizationId}/credentials/${revokedResponse.body.credential.id}/revoke`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ reason: "Fictional revocation for filter test." });

    const response = await request(app)
      .get("/api/v1/credentials?status=ACTIVE")
      .set("Authorization", `Bearer ${holder.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(activeResponse.body.credential.id);
    expect(response.body.data[0].effectiveStatus).toBe("ACTIVE");
  });

  it("filters holder wallet credentials by effective EXPIRED status", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);

    const effectiveExpiredResponse = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email,
      referenceNo: `NW-EFFECTIVE-EXP-${randomUUID().slice(0, 8)}`,
      issuedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    });
    expect(effectiveExpiredResponse.status).toBe(201);

    const storedExpired = await prisma.credential.create({
      data: {
        title: "Stored Expired Credential",
        credentialType: "WORKPLACE_SAFETY",
        referenceNo: `NW-STORED-EXP-${randomUUID().slice(0, 8)}`,
        issuedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        status: CredentialStatus.EXPIRED,
        organizationId,
        holderId: holder.user.id,
        issuedById: admin.user.id
      }
    });

    await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email,
      referenceNo: `NW-STILL-ACTIVE-${randomUUID().slice(0, 8)}`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });

    const response = await request(app)
      .get("/api/v1/credentials?status=EXPIRED")
      .set("Authorization", `Bearer ${holder.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data.map((item: { id: string }) => item.id).sort()).toEqual(
      [effectiveExpiredResponse.body.credential.id, storedExpired.id].sort()
    );
    expect(response.body.data.every((item: { effectiveStatus: string }) => item.effectiveStatus === "EXPIRED")).toBe(
      true
    );
  });

  it("filters holder wallet credentials by REVOKED status", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);

    const revokedResponse = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email,
      referenceNo: `NW-REVOKED-${randomUUID().slice(0, 8)}`
    });
    await request(app)
      .patch(`/api/v1/organizations/${organizationId}/credentials/${revokedResponse.body.credential.id}/revoke`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ reason: "Fictional revocation for filter test." });

    await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email,
      referenceNo: `NW-ACTIVE-${randomUUID().slice(0, 8)}`
    });

    const response = await request(app)
      .get("/api/v1/credentials?status=REVOKED")
      .set("Authorization", `Bearer ${holder.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(revokedResponse.body.credential.id);
    expect(response.body.data[0].status).toBe("REVOKED");
  });

  it("filters organization credentials by effective status consistently", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);

    await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email,
      referenceNo: `NW-ORG-ACTIVE-${randomUUID().slice(0, 8)}`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });

    const effectiveExpiredResponse = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email,
      referenceNo: `NW-ORG-EXP-${randomUUID().slice(0, 8)}`,
      issuedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    });

    const expiredListResponse = await request(app)
      .get(`/api/v1/organizations/${organizationId}/credentials?status=EXPIRED`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(expiredListResponse.status).toBe(200);
    expect(expiredListResponse.body.data).toHaveLength(1);
    expect(expiredListResponse.body.data[0].id).toBe(effectiveExpiredResponse.body.credential.id);
    expect(expiredListResponse.body.data[0].effectiveStatus).toBe("EXPIRED");
  });

  it("writes an audit log entry when issuing a credential", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);

    const response = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email
    });

    expect(response.status).toBe(201);

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        actorId: admin.user.id,
        action: "CREDENTIAL_ISSUED",
        resourceType: "Credential",
        resourceId: response.body.credential.id
      }
    });

    expect(auditLog).not.toBeNull();
  });

  it("returns only the authenticated holder wallet credentials", async () => {
    const firstOrg = await setupVerifiedOrganization(app);
    const secondOrg = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);

    await issueCredentialRequest(app, firstOrg.organizationId, firstOrg.admin.accessToken, {
      holderEmail: holder.payload.email,
      referenceNo: `NW-H1-${randomUUID().slice(0, 8)}`
    });
    await issueCredentialRequest(app, secondOrg.organizationId, secondOrg.admin.accessToken, {
      holderEmail: holder.payload.email,
      referenceNo: `NW-H2-${randomUUID().slice(0, 8)}`
    });

    const otherHolder = await registerHolder(app);
    await issueCredentialRequest(app, firstOrg.organizationId, firstOrg.admin.accessToken, {
      holderEmail: otherHolder.payload.email,
      referenceNo: `NW-OTHER-${randomUUID().slice(0, 8)}`
    });

    const walletResponse = await request(app)
      .get("/api/v1/credentials")
      .set("Authorization", `Bearer ${holder.accessToken}`);

    expect(walletResponse.status).toBe(200);
    expect(walletResponse.body.data).toHaveLength(2);
    expect(walletResponse.body.pagination.total).toBe(2);
    expectNoSensitiveAuthData(walletResponse.body);
  });

  it("computes effective expiration without mutating stored status", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);
    const issuedAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const expiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const issueResponse = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email,
      issuedAt,
      expiresAt,
      referenceNo: `NW-EXP-${randomUUID().slice(0, 8)}`
    });
    expect(issueResponse.status).toBe(201);

    const storedCredential = await prisma.credential.findUniqueOrThrow({
      where: { id: issueResponse.body.credential.id }
    });
    expect(storedCredential.status).toBe(CredentialStatus.ACTIVE);

    const walletResponse = await request(app)
      .get("/api/v1/credentials")
      .set("Authorization", `Bearer ${holder.accessToken}`);

    expect(walletResponse.status).toBe(200);
    expect(walletResponse.body.data[0].status).toBe("ACTIVE");
    expect(walletResponse.body.data[0].effectiveStatus).toBe("EXPIRED");
  });

  it("allows holders to view their own credential detail", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);
    const issueResponse = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email
    });

    const detailResponse = await request(app)
      .get(`/api/v1/credentials/${issueResponse.body.credential.id}`)
      .set("Authorization", `Bearer ${holder.accessToken}`);

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.credential.publicId).toBe(issueResponse.body.credential.publicId);
    expectNoSensitiveAuthData(detailResponse.body);
  });

  it("allows organization issuers to view organization credential detail", async () => {
    const { organizationId } = await setupVerifiedOrganization(app);
    const issuer = await addOrganizationIssuer(organizationId, app);
    const holder = await registerHolder(app);
    const issueResponse = await issueCredentialRequest(app, organizationId, issuer.accessToken, {
      holderEmail: holder.payload.email
    });

    const detailResponse = await request(app)
      .get(`/api/v1/credentials/${issueResponse.body.credential.id}`)
      .set("Authorization", `Bearer ${issuer.accessToken}`);

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.credential.referenceNo).toBe(issueResponse.body.credential.referenceNo);
  });

  it("forbids outsiders from viewing credential detail", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);
    const outsider = await registerHolder(app);
    const issueResponse = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email
    });

    const detailResponse = await request(app)
      .get(`/api/v1/credentials/${issueResponse.body.credential.id}`)
      .set("Authorization", `Bearer ${outsider.accessToken}`);

    expect(detailResponse.status).toBe(403);
    expect(detailResponse.body.error.code).toBe("FORBIDDEN");
  });

  it("scopes organization credential listing to the route organization", async () => {
    const firstOrg = await setupVerifiedOrganization(app);
    const secondOrg = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);

    await issueCredentialRequest(app, firstOrg.organizationId, firstOrg.admin.accessToken, {
      holderEmail: holder.payload.email,
      referenceNo: `NW-L1-${randomUUID().slice(0, 8)}`
    });
    const secondIssue = await issueCredentialRequest(app, secondOrg.organizationId, secondOrg.admin.accessToken, {
      holderEmail: holder.payload.email,
      referenceNo: `NW-L2-${randomUUID().slice(0, 8)}`
    });

    const listResponse = await request(app)
      .get(`/api/v1/organizations/${firstOrg.organizationId}/credentials`)
      .set("Authorization", `Bearer ${firstOrg.admin.accessToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.data[0].id).not.toBe(secondIssue.body.credential.id);
    expectNoSensitiveAuthData(listResponse.body);
  });

  it("revokes active credentials successfully", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);
    const issueResponse = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email
    });

    const revokeResponse = await request(app)
      .patch(`/api/v1/organizations/${organizationId}/credentials/${issueResponse.body.credential.id}/revoke`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ reason: "Fictional compliance review failed." });

    expect(revokeResponse.status).toBe(200);
    expect(revokeResponse.body.credential).toMatchObject({
      status: "REVOKED",
      effectiveStatus: "REVOKED",
      revocationReason: "Fictional compliance review failed."
    });
  });

  it("allows exactly one concurrent revocation to succeed", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);
    const issueResponse = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email
    });
    const credentialId = issueResponse.body.credential.id as string;

    const [firstResponse, secondResponse] = await Promise.all([
      request(app)
        .patch(`/api/v1/organizations/${organizationId}/credentials/${credentialId}/revoke`)
        .set("Authorization", `Bearer ${admin.accessToken}`)
        .send({ reason: "Fictional concurrent revocation attempt." }),
      request(app)
        .patch(`/api/v1/organizations/${organizationId}/credentials/${credentialId}/revoke`)
        .set("Authorization", `Bearer ${admin.accessToken}`)
        .send({ reason: "Fictional concurrent revocation attempt." })
    ]);

    const statuses = [firstResponse.status, secondResponse.status].sort((a, b) => a - b);
    expect(statuses).toEqual([200, 409]);
  });

  it("returns 409 when revoking a credential repeatedly", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);
    const issueResponse = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email
    });
    const credentialId = issueResponse.body.credential.id as string;

    const firstRevoke = await request(app)
      .patch(`/api/v1/organizations/${organizationId}/credentials/${credentialId}/revoke`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ reason: "Fictional first revocation." });
    expect(firstRevoke.status).toBe(200);

    const secondRevoke = await request(app)
      .patch(`/api/v1/organizations/${organizationId}/credentials/${credentialId}/revoke`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ reason: "Fictional repeated revocation." });

    expect(secondRevoke.status).toBe(409);
    expect(secondRevoke.body.error.code).toBe("CREDENTIAL_NOT_ACTIVE");
  });

  it("forbids cross-organization revocation without leaking credential data", async () => {
    const firstOrg = await setupVerifiedOrganization(app);
    const secondOrg = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);
    const issueResponse = await issueCredentialRequest(app, firstOrg.organizationId, firstOrg.admin.accessToken, {
      holderEmail: holder.payload.email
    });

    const revokeResponse = await request(app)
      .patch(`/api/v1/organizations/${secondOrg.organizationId}/credentials/${issueResponse.body.credential.id}/revoke`)
      .set("Authorization", `Bearer ${secondOrg.admin.accessToken}`)
      .send({ reason: "Fictional cross-organization revoke attempt." });

    expect(revokeResponse.status).toBe(403);
    expect(revokeResponse.body.error.code).toBe("FORBIDDEN");
  });

  it("writes an audit log entry when revoking a credential", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);
    const issueResponse = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email
    });
    const credentialId = issueResponse.body.credential.id as string;

    const revokeResponse = await request(app)
      .patch(`/api/v1/organizations/${organizationId}/credentials/${credentialId}/revoke`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ reason: "Fictional audit log revocation." });

    expect(revokeResponse.status).toBe(200);

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        actorId: admin.user.id,
        action: "CREDENTIAL_REVOKED",
        resourceType: "Credential",
        resourceId: credentialId
      }
    });

    expect(auditLog).not.toBeNull();
  });

  it("does not revoke expired credentials as active", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);
    const issueResponse = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email,
      issuedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      referenceNo: `NW-NOREV-${randomUUID().slice(0, 8)}`
    });
    expect(issueResponse.status).toBe(201);

    const revokeResponse = await request(app)
      .patch(`/api/v1/organizations/${organizationId}/credentials/${issueResponse.body.credential.id}/revoke`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ reason: "Fictional attempt to revoke expired credential." });

    expect(revokeResponse.status).toBe(409);
    expect(revokeResponse.body.error.code).toBe("CREDENTIAL_NOT_ACTIVE");
  });

  it("does not allow global platform admins to issue without organization membership", async () => {
    const { organizationId } = await setupVerifiedOrganization(app);
    const platformAdmin = await createGlobalPlatformAdminHolder(app);
    const holder = await registerHolder(app);

    const response = await issueCredentialRequest(app, organizationId, platformAdmin.accessToken, {
      holderEmail: holder.payload.email
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });
});
