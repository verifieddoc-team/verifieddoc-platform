import {
  FraudAlertSeverity,
  FraudAlertStatus,
  FraudAlertType,
  PlatformRole,
  VerificationMethod,
  VerificationOutcome,
  VerificationRequestStatus
} from "@prisma/client";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
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

const app = createApp();

describe("Admin dashboard and monitoring", () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("requires PLATFORM_ADMIN for dashboard", async () => {
    const holder = await createTestUser({ role: PlatformRole.HOLDER });

    const unauthorized = await request(app).get("/api/v1/admin/dashboard");
    expect(unauthorized.status).toBe(401);

    const forbidden = await request(app)
      .get("/api/v1/admin/dashboard")
      .set("Authorization", `Bearer ${holder.accessToken}`);
    expect(forbidden.status).toBe(403);
  });

  it("returns real aggregate stats, recent requests, and open fraud alerts", async () => {
    const { accessToken } = await createPlatformAdminSession();
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);

    const credentialResponse = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email,
      referenceNo: `NW-ADMIN-DASH-${Date.now()}`
    });
    expect(credentialResponse.status).toBe(201);
    const credentialId = credentialResponse.body.credential.id as string;

    await prisma.verificationEvent.create({
      data: {
        method: VerificationMethod.PUBLIC_ID,
        result: VerificationOutcome.VERIFIED,
        credentialId,
        organizationId,
        credentialPublicIdSnapshot: credentialResponse.body.credential.publicId
      }
    });

    await prisma.verificationRequest.create({
      data: {
        credentialId,
        organizationId,
        holderId: holder.user.id,
        requestedById: holder.user.id,
        status: VerificationRequestStatus.PENDING
      }
    });

    const openAlert = await prisma.fraudAlert.create({
      data: {
        type: FraudAlertType.SUSPICIOUS_ACTIVITY,
        severity: FraudAlertSeverity.MEDIUM,
        status: FraudAlertStatus.OPEN,
        title: "Open alert for dashboard",
        description: "Fictional open alert",
        occurrenceCount: 1
      }
    });

    await prisma.fraudAlert.create({
      data: {
        type: FraudAlertType.SUSPICIOUS_ACTIVITY,
        severity: FraudAlertSeverity.LOW,
        status: FraudAlertStatus.RESOLVED,
        title: "Resolved alert should not appear",
        description: "Fictional resolved alert",
        occurrenceCount: 1,
        resolvedAt: new Date()
      }
    });

    const response = await request(app)
      .get("/api/v1/admin/dashboard")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.stats.totalUsers).toBeGreaterThanOrEqual(1);
    expect(response.body.stats.institutions).toBeGreaterThanOrEqual(1);
    expect(response.body.stats.documents).toBeGreaterThanOrEqual(1);
    expect(response.body.stats.verifications).toBeGreaterThanOrEqual(1);
    expect(response.body.stats.growth).toHaveProperty("usersMoMPercent");
    expect(response.body.stats.growth).toHaveProperty("institutionsMoMPercent");
    expect(response.body.stats.growth).toHaveProperty("documentsMoMPercent");
    expect(response.body.stats.growth).toHaveProperty("verificationsMoMPercent");
    // No fabricated percent when previous period is zero — null is allowed.
    for (const value of Object.values(response.body.stats.growth)) {
      expect(value === null || typeof value === "number").toBe(true);
      if (typeof value === "number") {
        expect(Number.isFinite(value)).toBe(true);
      }
    }

    expect(response.body.recentVerificationRequests.length).toBeGreaterThanOrEqual(1);
    expect(response.body.fraudAlerts.some((alert: { id: string }) => alert.id === openAlert.id)).toBe(
      true
    );
    expect(
      response.body.fraudAlerts.every((alert: { status: string }) => alert.status === "OPEN")
    ).toBe(true);
    expect(JSON.stringify(response.body)).not.toMatch(/passwordHash/i);
  });

  it("lists verifications and verification requests with filters", async () => {
    const { accessToken } = await createPlatformAdminSession();
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);
    const credentialResponse = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.payload.email
    });
    const credentialId = credentialResponse.body.credential.id as string;

    await prisma.verificationEvent.create({
      data: {
        method: VerificationMethod.PUBLIC_ID,
        result: VerificationOutcome.NOT_FOUND,
        organizationId
      }
    });

    await prisma.verificationRequest.create({
      data: {
        credentialId,
        organizationId,
        holderId: holder.user.id,
        requestedById: holder.user.id,
        status: VerificationRequestStatus.PENDING
      }
    });

    const verifications = await request(app)
      .get("/api/v1/admin/verifications?result=NOT_FOUND&page=1&limit=10")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(verifications.status).toBe(200);
    expect(verifications.body.data.length).toBeGreaterThanOrEqual(1);
    expect(verifications.body.data.every((row: { result: string }) => row.result === "NOT_FOUND")).toBe(
      true
    );

    const requests = await request(app)
      .get(`/api/v1/admin/verification-requests?status=PENDING&organizationId=${organizationId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(requests.status).toBe(200);
    expect(requests.body.data.length).toBeGreaterThanOrEqual(1);
    expect(requests.body.data.every((row: { status: string }) => row.status === "PENDING")).toBe(true);
  });

  it("preserves existing admin organization and audit-log routes", async () => {
    const { accessToken } = await createPlatformAdminSession();

    const orgs = await request(app)
      .get("/api/v1/admin/organizations?status=PENDING&page=1&limit=10")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(orgs.status).toBe(200);

    const audits = await request(app)
      .get("/api/v1/admin/audit-logs?page=1&limit=10")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(audits.status).toBe(200);
  });
});
