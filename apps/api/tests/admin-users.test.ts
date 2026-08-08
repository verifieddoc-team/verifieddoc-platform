import { PlatformRole, UserStatus } from "@prisma/client";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { hashToken } from "../src/lib/tokens.js";
import { prisma } from "../src/lib/prisma.js";
import {
  cleanupTestData,
  createPlatformAdminSession,
  createTestEmail,
  createTestUser,
  disconnectTestDatabase,
  TEST_PASSWORD
} from "./helpers/testData.js";

const app = createApp();

describe("Admin users", () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("lists and gets users with filters without leaking sensitive fields", async () => {
    const { accessToken } = await createPlatformAdminSession();
    const holder = await createTestUser({
      email: createTestEmail("filter-holder"),
      role: PlatformRole.HOLDER,
      firstName: "Ada",
      lastName: "Filter"
    });
    await createTestUser({ role: PlatformRole.VERIFIER });

    const list = await request(app)
      .get("/api/v1/admin/users?role=HOLDER&search=Ada&page=1&limit=10")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(list.status).toBe(200);
    expect(list.body.data.some((user: { id: string }) => user.id === holder.user.id)).toBe(true);
    expect(JSON.stringify(list.body)).not.toMatch(/passwordHash/i);
    expect(JSON.stringify(list.body)).not.toMatch(/refreshToken/i);

    const detail = await request(app)
      .get(`/api/v1/admin/users/${holder.user.id}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(detail.status).toBe(200);
    expect(detail.body.user).toMatchObject({
      id: holder.user.id,
      email: holder.user.email,
      role: "HOLDER",
      status: "ACTIVE"
    });
    expect(detail.body.user.passwordHash).toBeUndefined();
  });

  it("suspends a user, revokes refresh tokens, audits, and blocks self-suspend", async () => {
    const { admin, accessToken } = await createPlatformAdminSession();
    const target = await createTestUser({ role: PlatformRole.HOLDER });

    await prisma.refreshToken.create({
      data: {
        userId: target.user.id,
        tokenHash: hashToken(`refresh-${target.user.id}`),
        expiresAt: new Date(Date.now() + 60_000)
      }
    });

    const selfSuspend = await request(app)
      .patch(`/api/v1/admin/users/${admin.id}/status`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ action: "SUSPEND", reason: "Should fail" });
    expect(selfSuspend.status).toBe(400);
    expect(selfSuspend.body.error.code).toBe("CANNOT_SUSPEND_SELF");

    const suspend = await request(app)
      .patch(`/api/v1/admin/users/${target.user.id}/status`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ action: "SUSPEND", reason: "Policy violation for fictional test user" });

    expect(suspend.status).toBe(200);
    expect(suspend.body.user.status).toBe("SUSPENDED");
    expect(suspend.body.user.suspendedReason).toBe("Policy violation for fictional test user");
    expect(suspend.body.user.passwordHash).toBeUndefined();

    const tokens = await prisma.refreshToken.findMany({ where: { userId: target.user.id } });
    expect(tokens.every((token) => token.revokedAt !== null)).toBe(true);

    const audit = await prisma.auditLog.findFirst({
      where: { action: "USER_SUSPENDED", resourceId: target.user.id }
    });
    expect(audit).not.toBeNull();

    const login = await request(app).post("/api/v1/auth/login").send({
      email: target.payload.email,
      password: TEST_PASSWORD
    });
    expect(login.status).toBe(401);

    const reinstate = await request(app)
      .patch(`/api/v1/admin/users/${target.user.id}/status`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ action: "REINSTATE" });

    expect(reinstate.status).toBe(200);
    expect(reinstate.body.user.status).toBe(UserStatus.ACTIVE);
    expect(reinstate.body.user.suspendedReason).toBeNull();

    const reinstatedAudit = await prisma.auditLog.findFirst({
      where: { action: "USER_REINSTATED", resourceId: target.user.id }
    });
    expect(reinstatedAudit).not.toBeNull();
  });
});
