import {
  FraudAlertSeverity,
  FraudAlertStatus,
  FraudAlertType,
  NotificationType,
  PlatformRole,
  VerificationMethod,
  VerificationOutcome
} from "@prisma/client";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import {
  HIGH_RISK_INVALID_THRESHOLD,
  maybeRaiseHighRiskDocumentAlert,
  maybeRaiseMultipleVerificationFailuresAlert,
  raiseFileHashMismatchAlert,
  raiseRevokedCredentialAccessAlert,
  upsertFraudAlert
} from "../src/lib/fraud-alerts.js";
import { prisma } from "../src/lib/prisma.js";
import {
  cleanupTestData,
  createPlatformAdminSession,
  createTestUser,
  disconnectTestDatabase
} from "./helpers/testData.js";

const app = createApp();

describe("Fraud alerts", () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("deduplicates OPEN alerts and notifies PLATFORM_ADMIN on create", async () => {
    const { admin } = await createPlatformAdminSession();
    const actor = await createTestUser({ role: PlatformRole.VERIFIER });

    const first = await upsertFraudAlert(prisma, {
      type: FraudAlertType.SUSPICIOUS_ACTIVITY,
      severity: FraudAlertSeverity.MEDIUM,
      title: "Suspicious activity",
      description: "First sighting",
      actorId: actor.user.id,
      ipAddress: "203.0.113.10"
    });

    const second = await upsertFraudAlert(prisma, {
      type: FraudAlertType.SUSPICIOUS_ACTIVITY,
      severity: FraudAlertSeverity.HIGH,
      title: "Suspicious activity",
      description: "Second sighting",
      actorId: actor.user.id,
      ipAddress: "203.0.113.10"
    });

    expect(second.id).toBe(first.id);
    expect(second.occurrenceCount).toBe(2);

    const openCount = await prisma.fraudAlert.count({
      where: {
        type: FraudAlertType.SUSPICIOUS_ACTIVITY,
        actorId: actor.user.id,
        status: FraudAlertStatus.OPEN
      }
    });
    expect(openCount).toBe(1);

    const adminNotifications = await prisma.notification.findMany({
      where: {
        userId: admin.id,
        type: NotificationType.FRAUD_ALERT,
        resourceId: first.id
      }
    });
    expect(adminNotifications).toHaveLength(1);
  });

  it("implements revoked, file-hash, multiple-failure, and high-risk rules", async () => {
    const verifier = await createTestUser({ role: PlatformRole.VERIFIER });
    const holder = await createTestUser({ role: PlatformRole.HOLDER });
    const issuer = await createTestUser();
    const ip = "198.51.100.44";

    const org = await prisma.organization.create({
      data: {
        name: "Fraud Rule Org",
        slug: `test-org-fraud-${Date.now()}`,
        contactEmail: `fraud-org.${Date.now()}@example.test`,
        country: "Canada"
      }
    });

    const credential = await prisma.credential.create({
      data: {
        title: "Fraud rule credential",
        credentialType: "TEST",
        referenceNo: `FRAUD-${Date.now()}`,
        issuedAt: new Date(),
        organizationId: org.id,
        holderId: holder.user.id,
        issuedById: issuer.user.id
      }
    });

    const revoked = await raiseRevokedCredentialAccessAlert(prisma, {
      credentialId: credential.id,
      actorId: verifier.user.id,
      ipAddress: ip
    });
    expect(revoked.type).toBe(FraudAlertType.REVOKED_CREDENTIAL_ACCESS);

    const mismatch = await raiseFileHashMismatchAlert(prisma, {
      actorId: verifier.user.id,
      ipAddress: ip,
      metadata: { checksumSha256: "abc" }
    });
    expect(mismatch.type).toBe(FraudAlertType.FILE_HASH_MISMATCH);

    for (let i = 0; i < 5; i += 1) {
      await prisma.verificationEvent.create({
        data: {
          verifierId: verifier.user.id,
          ipAddress: ip,
          method: VerificationMethod.PUBLIC_ID,
          result: i % 2 === 0 ? VerificationOutcome.INVALID : VerificationOutcome.NOT_FOUND,
          credentialPublicIdSnapshot: "missing-public-id"
        }
      });
    }

    const multi = await maybeRaiseMultipleVerificationFailuresAlert(prisma, {
      verifierId: verifier.user.id,
      ipAddress: ip
    });
    expect(multi).not.toBeNull();
    expect(multi!.type).toBe(FraudAlertType.MULTIPLE_VERIFICATION_FAILURES);

    const publicId = `high-risk-${Date.now()}`;
    for (let i = 0; i < HIGH_RISK_INVALID_THRESHOLD; i += 1) {
      await prisma.verificationEvent.create({
        data: {
          method: VerificationMethod.PUBLIC_ID,
          result: VerificationOutcome.INVALID,
          credentialPublicIdSnapshot: publicId,
          ipAddress: ip
        }
      });
    }

    const highRisk = await maybeRaiseHighRiskDocumentAlert(prisma, {
      credentialPublicId: publicId,
      ipAddress: ip
    });
    expect(highRisk).not.toBeNull();
    expect(highRisk!.type).toBe(FraudAlertType.HIGH_RISK_DOCUMENT);
  });

  it("lists, gets, and updates fraud alert status with audit", async () => {
    const { accessToken, admin } = await createPlatformAdminSession();
    const alert = await prisma.fraudAlert.create({
      data: {
        type: FraudAlertType.FILE_HASH_MISMATCH,
        severity: FraudAlertSeverity.HIGH,
        status: FraudAlertStatus.OPEN,
        title: "Admin review alert",
        description: "Needs review",
        occurrenceCount: 1
      }
    });

    const list = await request(app)
      .get("/api/v1/admin/fraud-alerts?status=OPEN")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.some((row: { id: string }) => row.id === alert.id)).toBe(true);

    const detail = await request(app)
      .get(`/api/v1/admin/fraud-alerts/${alert.id}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(detail.status).toBe(200);
    expect(detail.body.alert.id).toBe(alert.id);

    const patch = await request(app)
      .patch(`/api/v1/admin/fraud-alerts/${alert.id}/status`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ status: "RESOLVED" });

    expect(patch.status).toBe(200);
    expect(patch.body.alert.status).toBe("RESOLVED");
    expect(patch.body.alert.resolvedById).toBe(admin.id);

    const audit = await prisma.auditLog.findFirst({
      where: { action: "FRAUD_ALERT_STATUS_CHANGED", resourceId: alert.id }
    });
    expect(audit).not.toBeNull();
  });
});
