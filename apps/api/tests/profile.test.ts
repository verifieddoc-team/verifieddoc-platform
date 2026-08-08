import { UserStatus } from "@prisma/client";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { getTestOtpForRequest } from "../src/services/email/index.js";
import {
  cleanupTestData,
  createRegisterPayload,
  createTestEmail,
  createTestUser,
  disconnectTestDatabase,
  TEST_PASSWORD
} from "./helpers/testData.js";

const app = createApp();

async function registerAndVerify(payload: Record<string, unknown>) {
  const registerResponse = await request(app).post("/api/v1/auth/register").send(payload);
  expect(registerResponse.status).toBe(201);
  if (!registerResponse.body.verificationRequired) {
    return registerResponse;
  }
  const requestId = registerResponse.body.verificationRequestId as string;
  const otp = getTestOtpForRequest(requestId);
  const verifyResponse = await request(app)
    .post("/api/v1/auth/email-verification/verify")
    .send({ requestId, otp });
  expect(verifyResponse.status).toBe(200);
  return verifyResponse;
}

function uniquePhone() {
  return `+2567${String(Math.floor(Math.random() * 100_000_000)).padStart(8, "0")}`;
}

describe("Profile and password change", () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("updates profile fullName and syncs firstName/lastName", async () => {
    const payload = createRegisterPayload({ firstName: "Ada", lastName: "Lovelace" });
    const registerResponse = await registerAndVerify(payload);

    const response = await request(app)
      .patch("/api/v1/auth/me")
      .set("Authorization", `Bearer ${registerResponse.body.accessToken}`)
      .send({ fullName: "Ada King Lovelace" });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      fullName: "Ada King Lovelace",
      firstName: "Ada",
      lastName: "King Lovelace",
      email: payload.email
    });
    expect(JSON.stringify(response.body)).not.toMatch(/passwordHash/i);

    const audit = await prisma.auditLog.findFirst({
      where: {
        action: "PROFILE_UPDATED",
        actorId: registerResponse.body.user.id
      }
    });
    expect(audit).not.toBeNull();
  });

  it("updates profile via firstName+lastName and phone", async () => {
    const payload = createRegisterPayload();
    const registerResponse = await registerAndVerify(payload);
    const phone = uniquePhone();

    const response = await request(app)
      .patch("/api/v1/auth/me")
      .set("Authorization", `Bearer ${registerResponse.body.accessToken}`)
      .send({
        firstName: "Grace",
        lastName: "Hopper",
        phone
      });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      fullName: "Grace Hopper",
      firstName: "Grace",
      lastName: "Hopper",
      phone
    });
  });

  it("rejects duplicate phone numbers on profile update", async () => {
    const phone = uniquePhone();
    await createTestUser({ email: createTestEmail("phone-owner") }).then(async (session) => {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { phone }
      });
    });

    const payload = createRegisterPayload();
    const registerResponse = await registerAndVerify(payload);

    const response = await request(app)
      .patch("/api/v1/auth/me")
      .set("Authorization", `Bearer ${registerResponse.body.accessToken}`)
      .send({ phone });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("PHONE_ALREADY_EXISTS");
  });

  it("changes password, revokes refresh tokens, and audits PASSWORD_CHANGED", async () => {
    const payload = createRegisterPayload();
    const registerResponse = await registerAndVerify(payload);
    const refreshToken = registerResponse.body.refreshToken as string;
    const nextPassword = "ChangedPass9!";

    const changeResponse = await request(app)
      .patch("/api/v1/auth/me/password")
      .set("Authorization", `Bearer ${registerResponse.body.accessToken}`)
      .send({
        currentPassword: TEST_PASSWORD,
        newPassword: nextPassword
      });

    expect(changeResponse.status).toBe(204);

    const oldLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: payload.email, password: TEST_PASSWORD });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: payload.email, password: nextPassword });
    expect(newLogin.status).toBe(200);

    const refreshResponse = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken });
    expect(refreshResponse.status).toBe(401);

    const audit = await prisma.auditLog.findFirst({
      where: {
        action: "PASSWORD_CHANGED",
        actorId: registerResponse.body.user.id
      }
    });
    expect(audit).not.toBeNull();
  });

  it("rejects incorrect current password", async () => {
    const payload = createRegisterPayload();
    const registerResponse = await registerAndVerify(payload);

    const response = await request(app)
      .patch("/api/v1/auth/me/password")
      .set("Authorization", `Bearer ${registerResponse.body.accessToken}`)
      .send({
        currentPassword: "WrongPass9!",
        newPassword: "ChangedPass9!"
      });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_CURRENT_PASSWORD");
  });

  it("blocks suspended users from login, refresh, and profile access", async () => {
    const payload = createRegisterPayload();
    const registerResponse = await registerAndVerify(payload);
    const refreshToken = registerResponse.body.refreshToken as string;

    await prisma.user.update({
      where: { id: registerResponse.body.user.id },
      data: {
        status: UserStatus.SUSPENDED,
        suspendedAt: new Date(),
        suspendedReason: "policy"
      }
    });

    const loginResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: payload.email, password: TEST_PASSWORD });
    expect(loginResponse.status).toBe(401);
    expect(loginResponse.body.error.code).toBe("INVALID_CREDENTIALS");

    const refreshResponse = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken });
    expect(refreshResponse.status).toBe(401);
    expect(refreshResponse.body.error.code).toBe("INVALID_CREDENTIALS");

    // Access JWTs are rejected by authenticate middleware once status is SUSPENDED.
    const meResponse = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${registerResponse.body.accessToken}`);
    expect(meResponse.status).toBe(401);
    expect(meResponse.body.error.code).toBe("UNAUTHORIZED");

    const profileResponse = await request(app)
      .patch("/api/v1/auth/me")
      .set("Authorization", `Bearer ${registerResponse.body.accessToken}`)
      .send({ fullName: "Should Fail" });
    expect(profileResponse.status).toBe(401);
    expect(profileResponse.body.error.code).toBe("UNAUTHORIZED");

    const holderDashboard = await request(app)
      .get("/api/v1/holder/dashboard")
      .set("Authorization", `Bearer ${registerResponse.body.accessToken}`);
    expect(holderDashboard.status).toBe(401);
    expect(holderDashboard.body.error.code).toBe("UNAUTHORIZED");
  });
});
