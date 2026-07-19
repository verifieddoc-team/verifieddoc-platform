import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { createEnvSchema } from "../src/config/env.js";
import { sanitizeAuditDetails } from "../src/lib/audit.js";
import { prisma } from "../src/lib/prisma.js";
import { validateAdminBootstrapInput } from "../prisma/bootstrap-admin.js";
import { validateDemoSeedInput } from "../prisma/demo-seed-policy.js";
import {
  addOrganizationIssuer,
  issueCredentialRequest,
  registerHolder,
  setupVerifiedOrganization
} from "./helpers/credentialTestData.js";
import {
  cleanupTestData,
  createPlatformAdminSession,
  createTestUser,
  disconnectTestDatabase
} from "./helpers/testData.js";

const app = createApp();

describe("Platform operations and audit access", () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("returns ready when the database responds", async () => {
    const response = await request(app).get("/api/v1/ready");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: "ready", service: "verifieddoc-api" });
    expect(JSON.stringify(response.body)).not.toMatch(/postgres|password|stack|trace/i);
  });

  it("returns unavailable from ready without leaking internal errors", async () => {
    const queryRaw = vi.spyOn(prisma, "$queryRaw").mockRejectedValueOnce(new Error("connection refused"));
    const response = await request(app).get("/api/v1/ready");

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ status: "unavailable", service: "verifieddoc-api" });
    expect(JSON.stringify(response.body)).not.toMatch(/connection refused|postgres|password|stack|trace/i);

    queryRaw.mockRestore();
  });

  it("allows organization admins to list tenant-scoped audit logs", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);
    await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email,
      referenceNo: `NW-AUDIT-${Date.now()}`
    });

    const response = await request(app)
      .get(`/api/v1/organizations/${organizationId}/audit-logs`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data.every((entry: { organizationId: string | null }) => entry.organizationId === organizationId)).toBe(true);
    expect(response.body.pagination.total).toBeGreaterThan(0);
  });

  it("enforces organization audit tenant isolation by organizationId", async () => {
    const firstOrg = await setupVerifiedOrganization(app);
    const secondOrg = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);

    await issueCredentialRequest(app, firstOrg.organizationId, firstOrg.admin.accessToken, {
      holderEmail: holder.payload.email,
      referenceNo: `NW-TENANT-A-${Date.now()}`
    });
    await issueCredentialRequest(app, secondOrg.organizationId, secondOrg.admin.accessToken, {
      holderEmail: holder.payload.email,
      referenceNo: `NW-TENANT-B-${Date.now()}`
    });

    const response = await request(app)
      .get(`/api/v1/organizations/${firstOrg.organizationId}/audit-logs?action=CREDENTIAL_ISSUED`)
      .set("Authorization", `Bearer ${firstOrg.admin.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data.every((entry: { organizationId: string | null }) => entry.organizationId === firstOrg.organizationId)).toBe(true);
    expect(response.body.data.some((entry: { organizationId: string | null }) => entry.organizationId === secondOrg.organizationId)).toBe(false);
  });

  it("rejects organization audit access for issuers and outsiders", async () => {
    const { organizationId } = await setupVerifiedOrganization(app);
    const issuer = await addOrganizationIssuer(organizationId, app);
    const outsider = await createTestUser();

    const issuerResponse = await request(app)
      .get(`/api/v1/organizations/${organizationId}/audit-logs`)
      .set("Authorization", `Bearer ${issuer.accessToken}`);

    const outsiderResponse = await request(app)
      .get(`/api/v1/organizations/${organizationId}/audit-logs`)
      .set("Authorization", `Bearer ${outsider.accessToken}`);

    expect(issuerResponse.status).toBe(403);
    expect(outsiderResponse.status).toBe(403);
  });

  it("allows platform admins to query audit logs with filters and pagination", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const { accessToken: platformToken, admin: platformAdmin } = await createPlatformAdminSession(app);
    const holder = await registerHolder(app);

    await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email,
      referenceNo: `NW-PLATFORM-${Date.now()}`
    });

    const response = await request(app)
      .get(
        `/api/v1/admin/audit-logs?organizationId=${organizationId}&action=CREDENTIAL_ISSUED&resourceType=Credential&page=1&limit=10`
      )
      .set("Authorization", `Bearer ${platformToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data[0]).toMatchObject({
      action: "CREDENTIAL_ISSUED",
      resourceType: "Credential",
      organizationId
    });
    expect(response.body.pagination).toMatchObject({
      page: 1,
      limit: 10,
      total: expect.any(Number),
      totalPages: expect.any(Number)
    });
    expect(response.body.data.some((entry: { actor: { id: string } | null }) => entry.actor?.id === admin.user.id)).toBe(true);
    expect(response.body.data.some((entry: { actor: { id: string } | null }) => entry.actor?.id === platformAdmin.id)).toBe(false);
  });

  it("rejects platform audit access for non-admin users", async () => {
    const holder = await createTestUser();
    const response = await request(app)
      .get("/api/v1/admin/audit-logs")
      .set("Authorization", `Bearer ${holder.accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("never exposes sensitive audit fields in API responses", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);

    await prisma.auditLog.create({
      data: {
        actorId: admin.user.id,
        organizationId,
        action: "CREDENTIAL_ISSUED",
        resourceType: "Credential",
        resourceId: "sensitive-audit-resource",
        details: {
          passwordHash: "secret-hash",
          token: "raw-token-value",
          authorization: "Bearer secret",
          requestBody: { password: "hidden" },
          referenceNo: "SAFE-REF"
        }
      }
    });

    const response = await request(app)
      .get(`/api/v1/organizations/${organizationId}/audit-logs?action=CREDENTIAL_ISSUED`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    const serialized = JSON.stringify(response.body);
    expect(response.status).toBe(200);
    expect(serialized).not.toMatch(/secret-hash|raw-token-value|Bearer secret|"password"/i);
    expect(response.body.data[0].details).toMatchObject({ referenceNo: "SAFE-REF" });
  });

  it("validates admin bootstrap helpers", () => {
    expect(() =>
      validateAdminBootstrapInput({
        allowBootstrap: false,
        email: "admin@example.test",
        password: "TestPass1!"
      })
    ).toThrow(/disabled/i);

    expect(() =>
      validateAdminBootstrapInput({
        allowBootstrap: true,
        email: "not-an-email",
        password: "TestPass1!"
      })
    ).toThrow();

    expect(
      validateAdminBootstrapInput({
        allowBootstrap: true,
        email: "Admin@Example.Test",
        password: "TestPass1!"
      })
    ).toEqual({
      email: "admin@example.test",
      password: "TestPass1!"
    });
  });

  it("validates demo seed safety helpers", () => {
    expect(() =>
      validateDemoSeedInput({
        nodeEnv: "production",
        allowDemoSeed: true,
        demoPassword: "TestPass1!"
      })
    ).toThrow(/production/i);

    expect(() =>
      validateDemoSeedInput({
        nodeEnv: "development",
        allowDemoSeed: false,
        demoPassword: "TestPass1!"
      })
    ).toThrow(/disabled/i);

    expect(
      validateDemoSeedInput({
        nodeEnv: "development",
        allowDemoSeed: true,
        demoPassword: "TestPass1!"
      })
    ).toBe("TestPass1!");
  });

  it("rejects default JWT secrets and wildcard CORS in production", () => {
    expect(() =>
      createEnvSchema().parse({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://verifieddoc:verifieddoc@localhost:5432/verifieddoc",
        JWT_ACCESS_SECRET: "development-access-secret-change-me-now",
        JWT_REFRESH_SECRET: "ci-refresh-secret-with-at-least-32-characters",
        CORS_ORIGINS: "https://app.example.test",
        PUBLIC_WEB_URL: "https://app.example.test"
      })
    ).toThrow();

    expect(() =>
      createEnvSchema().parse({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://verifieddoc:verifieddoc@localhost:5432/verifieddoc",
        JWT_ACCESS_SECRET: "production-access-secret-with-32-characters",
        JWT_REFRESH_SECRET: "production-refresh-secret-with-32-characters",
        CORS_ORIGINS: "*",
        PUBLIC_WEB_URL: "https://app.example.test"
      })
    ).toThrow(/wildcard/i);
  });

  it("sanitizes sensitive audit detail keys", () => {
    expect(
      sanitizeAuditDetails({
        referenceNo: "SAFE-REF",
        passwordHash: "hidden",
        token: "hidden",
        nested: {
          authorization: "hidden",
          note: "visible"
        }
      })
    ).toEqual({
      referenceNo: "SAFE-REF",
      nested: {
        note: "visible"
      }
    });
  });
});
