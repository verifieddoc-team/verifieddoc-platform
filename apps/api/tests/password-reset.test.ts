import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { hashPasswordResetSecret } from "../src/lib/tokens.js";
import {
  clearTestEmailState,
  getTestEmailInbox,
  getTestOtpForRequest
} from "../src/services/email/index.js";
import {
  cleanupTestData,
  createRegisterPayload,
  createTestEmail,
  disconnectTestDatabase,
  TEST_PASSWORD
} from "./helpers/testData.js";

const app = createApp();
const NEW_PASSWORD = "BrandNewPass9!";

describe("Password reset", () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  beforeEach(() => {
    clearTestEmailState();
  });

  afterEach(async () => {
    clearTestEmailState();
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("returns 202 with requestId for existing and unknown emails without revealing existence", async () => {
    const payload = createRegisterPayload();
    await request(app).post("/api/v1/auth/register").send(payload);

    const known = await request(app)
      .post("/api/v1/auth/password-reset/request")
      .send({ email: payload.email });

    const unknown = await request(app)
      .post("/api/v1/auth/password-reset/request")
      .send({ email: createTestEmail("missing-reset") });

    expect(known.status).toBe(202);
    expect(unknown.status).toBe(202);
    expect(known.body).toEqual({ requestId: expect.any(String) });
    expect(unknown.body).toEqual({ requestId: expect.any(String) });
    expect(known.body.requestId).not.toBe(unknown.body.requestId);

    const inbox = getTestEmailInbox();
    expect(inbox).toHaveLength(1);
    expect(inbox[0]?.to).toBe(payload.email);
    expect(inbox[0]?.otp).toMatch(/^\d{6}$/);
    expect(inbox[0]?.requestId).toBe(known.body.requestId);
  });

  it("completes OTP verify and password confirm, revoking refresh tokens", async () => {
    const payload = createRegisterPayload();
    const registerResponse = await request(app).post("/api/v1/auth/register").send(payload);
    const oldRefreshToken = registerResponse.body.refreshToken as string;

    const requestResponse = await request(app)
      .post("/api/v1/auth/password-reset/request")
      .send({ email: payload.email });

    expect(requestResponse.status).toBe(202);
    const requestId = requestResponse.body.requestId as string;
    const otp = getTestOtpForRequest(requestId);
    expect(otp).toBeDefined();

    const verifyResponse = await request(app)
      .post("/api/v1/auth/password-reset/verify")
      .send({ requestId, otp });

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body).toEqual({
      resetToken: expect.any(String),
      expiresInSeconds: 600
    });

    const confirmResponse = await request(app)
      .post("/api/v1/auth/password-reset/confirm")
      .send({
        resetToken: verifyResponse.body.resetToken,
        newPassword: NEW_PASSWORD
      });

    expect(confirmResponse.status).toBe(204);

    const oldLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: payload.email, password: TEST_PASSWORD });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: payload.email, password: NEW_PASSWORD });
    expect(newLogin.status).toBe(200);

    const refreshResponse = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: oldRefreshToken });
    expect(refreshResponse.status).toBe(401);

    const audit = await prisma.auditLog.findFirst({
      where: {
        action: "PASSWORD_RESET_COMPLETED",
        resourceId: registerResponse.body.user.id
      }
    });
    expect(audit).not.toBeNull();

    const challenge = await prisma.passwordResetChallenge.findFirst({
      where: { id: requestId }
    });
    expect(challenge?.usedAt).not.toBeNull();
    expect(challenge?.resetTokenHash).toBe(
      hashPasswordResetSecret(verifyResponse.body.resetToken)
    );
  });

  it("locks the challenge after five invalid OTP attempts", async () => {
    const payload = createRegisterPayload();
    await request(app).post("/api/v1/auth/register").send(payload);

    const requestResponse = await request(app)
      .post("/api/v1/auth/password-reset/request")
      .send({ email: payload.email });
    const requestId = requestResponse.body.requestId as string;
    const realOtp = getTestOtpForRequest(requestId)!;
    const wrongOtp = realOtp === "000000" ? "111111" : "000000";

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await request(app)
        .post("/api/v1/auth/password-reset/verify")
        .send({ requestId, otp: wrongOtp });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("OTP_INVALID");
    }

    const lockedResponse = await request(app)
      .post("/api/v1/auth/password-reset/verify")
      .send({ requestId, otp: wrongOtp });
    expect(lockedResponse.status).toBe(429);
    expect(lockedResponse.body.error.code).toBe("OTP_LOCKED");

    const otp = realOtp;
    const afterLock = await request(app)
      .post("/api/v1/auth/password-reset/verify")
      .send({ requestId, otp });
    expect(afterLock.status).toBe(429);
    expect(afterLock.body.error.code).toBe("OTP_LOCKED");
  });

  it("rejects expired OTP challenges", async () => {
    const payload = createRegisterPayload();
    const registerResponse = await request(app).post("/api/v1/auth/register").send(payload);

    const requestResponse = await request(app)
      .post("/api/v1/auth/password-reset/request")
      .send({ email: payload.email });
    const requestId = requestResponse.body.requestId as string;
    const otp = getTestOtpForRequest(requestId)!;

    await prisma.passwordResetChallenge.update({
      where: { id: requestId },
      data: { expiresAt: new Date(Date.now() - 1000) }
    });

    const verifyResponse = await request(app)
      .post("/api/v1/auth/password-reset/verify")
      .send({ requestId, otp });

    expect(verifyResponse.status).toBe(400);
    expect(verifyResponse.body.error.code).toBe("OTP_EXPIRED");
    expect(registerResponse.status).toBe(201);
  });

  it("invalidates prior active challenges when a new reset is requested", async () => {
    const payload = createRegisterPayload();
    await request(app).post("/api/v1/auth/register").send(payload);

    const first = await request(app)
      .post("/api/v1/auth/password-reset/request")
      .send({ email: payload.email });
    const firstId = first.body.requestId as string;
    const firstOtp = getTestOtpForRequest(firstId)!;
    clearTestEmailState();

    const second = await request(app)
      .post("/api/v1/auth/password-reset/request")
      .send({ email: payload.email });
    const secondId = second.body.requestId as string;

    expect(secondId).not.toBe(firstId);

    const staleVerify = await request(app)
      .post("/api/v1/auth/password-reset/verify")
      .send({ requestId: firstId, otp: firstOtp });
    expect(staleVerify.status).toBe(429);
    expect(staleVerify.body.error.code).toBe("OTP_LOCKED");

    const secondOtp = getTestOtpForRequest(secondId)!;
    const freshVerify = await request(app)
      .post("/api/v1/auth/password-reset/verify")
      .send({ requestId: secondId, otp: secondOtp });
    expect(freshVerify.status).toBe(200);
  });

  it("rejects reuse of a consumed reset token", async () => {
    const payload = createRegisterPayload();
    await request(app).post("/api/v1/auth/register").send(payload);

    const requestResponse = await request(app)
      .post("/api/v1/auth/password-reset/request")
      .send({ email: payload.email });
    const requestId = requestResponse.body.requestId as string;
    const otp = getTestOtpForRequest(requestId)!;

    const verifyResponse = await request(app)
      .post("/api/v1/auth/password-reset/verify")
      .send({ requestId, otp });

    const confirmOnce = await request(app)
      .post("/api/v1/auth/password-reset/confirm")
      .send({
        resetToken: verifyResponse.body.resetToken,
        newPassword: NEW_PASSWORD
      });
    expect(confirmOnce.status).toBe(204);

    const confirmTwice = await request(app)
      .post("/api/v1/auth/password-reset/confirm")
      .send({
        resetToken: verifyResponse.body.resetToken,
        newPassword: "AnotherPass9!"
      });
    expect(confirmTwice.status).toBe(400);
    expect(confirmTwice.body.error.code).toBe("RESET_TOKEN_INVALID");
  });
});
