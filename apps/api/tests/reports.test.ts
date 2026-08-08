import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { escapeCsvCell } from "../src/modules/admin/admin.service.js";
import { prisma } from "../src/lib/prisma.js";
import {
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
import { PlatformRole, VerificationMethod, VerificationOutcome } from "@prisma/client";

const app = createApp();

describe("Admin reports", () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("escapes CSV injection prefixes", () => {
    expect(escapeCsvCell("=CMD()")).toBe("'=CMD()");
    expect(escapeCsvCell("+1234")).toBe("'+1234");
    expect(escapeCsvCell("-danger")).toBe("'-danger");
    expect(escapeCsvCell("@sum")).toBe("'@sum");
    expect(escapeCsvCell("safe")).toBe("safe");
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it("returns summary and exports CSV with audit", async () => {
    const { accessToken } = await createPlatformAdminSession();
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);
    await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email
    });
    await prisma.verificationEvent.create({
      data: {
        method: VerificationMethod.PUBLIC_ID,
        result: VerificationOutcome.VERIFIED,
        organizationId
      }
    });

    const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const to = new Date(Date.now() + 60 * 1000).toISOString();

    const summary = await request(app)
      .get(`/api/v1/admin/reports/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(summary.status).toBe(200);
    expect(summary.body.summary.documentsIssued).toBeGreaterThanOrEqual(1);
    expect(summary.body.summary.verifications).toBeGreaterThanOrEqual(1);

    const exportResponse = await request(app)
      .get(
        `/api/v1/admin/reports/export?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&format=csv`
      )
      .set("Authorization", `Bearer ${accessToken}`);

    expect(exportResponse.status).toBe(200);
    expect(exportResponse.headers["content-type"]).toMatch(/text\/csv/);
    expect(exportResponse.text).toContain("documentsIssued");
    expect(exportResponse.text).toContain("verifications");

    const audit = await prisma.auditLog.findFirst({
      where: { action: "REPORT_EXPORTED" },
      orderBy: { createdAt: "desc" }
    });
    expect(audit).not.toBeNull();
  });

  it("forbids non-admin report access", async () => {
    const holder = await createTestUser({ role: PlatformRole.HOLDER });
    const from = new Date().toISOString();
    const to = new Date().toISOString();

    const response = await request(app)
      .get(`/api/v1/admin/reports/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .set("Authorization", `Bearer ${holder.accessToken}`);

    expect(response.status).toBe(403);
  });
});
