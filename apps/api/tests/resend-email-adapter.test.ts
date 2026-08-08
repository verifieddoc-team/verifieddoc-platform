import request from "supertest";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { env } from "../src/config/env.js";
import { AppError } from "../src/lib/errors.js";
import { logger } from "../src/lib/logger.js";
import { prisma } from "../src/lib/prisma.js";
import { clearEmailVerificationRateLimitsForTests } from "../src/modules/auth/auth.service.js";
import { getEmailService } from "../src/services/email/index.js";
import {
  getResendEmailAdapter,
  resetResendEmailAdapterForTests
} from "../src/services/email/resend-email.adapter.js";
import {
  cleanupTestData,
  createTestEmail,
  disconnectTestDatabase
} from "./helpers/testData.js";

const API_KEY = "re_test_api_key_should_never_appear_in_logs";
const MAIL_FROM = "noreply@verifieddoc.example";
const OTP = "123456";

describe("ResendEmailAdapter diagnostics", () => {
  const originalFetch = globalThis.fetch;
  const previous = {
    key: env.RESEND_API_KEY,
    from: env.MAIL_FROM
  };

  beforeEach(() => {
    env.RESEND_API_KEY = API_KEY;
    env.MAIL_FROM = MAIL_FROM;
    resetResendEmailAdapterForTests();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    env.RESEND_API_KEY = previous.key;
    env.MAIL_FROM = previous.from;
    resetResendEmailAdapterForTests();
    vi.restoreAllMocks();
  });

  it("logs sanitized Resend errors without OTP or API key", async () => {
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => undefined as never);

    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          statusCode: 403,
          name: "validation_error",
          message: "The verifieddoc.example domain is not verified"
        }),
        { status: 403 }
      )
    ) as unknown as typeof fetch;

    const adapter = getResendEmailAdapter();
    await expect(
      adapter.sendEmailVerificationOtp({
        to: "jane.holder@example.test",
        otp: OTP,
        expiresInMinutes: 10,
        requestId: "req-1"
      })
    ).rejects.toBeInstanceOf(AppError);

    expect(errorSpy).toHaveBeenCalled();
    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).toContain("resend");
    expect(logged).toContain("email-verification");
    expect(logged).toContain("validation_error");
    expect(logged).toContain("j***@example.test");
    expect(logged).toContain("verifieddoc.example");
    expect(logged).not.toContain(API_KEY);
    expect(logged).not.toContain(OTP);
    expect(logged).not.toContain("Bearer ");
    expect(logged).not.toContain("jane.holder@example.test");
  });

  it("logs password-reset failures with the password-reset operation label", async () => {
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => undefined as never);

    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ name: "rate_limit_exceeded", message: "Too many requests" }), {
        status: 429
      })
    ) as unknown as typeof fetch;

    const adapter = getResendEmailAdapter();
    await expect(
      adapter.sendPasswordResetOtp({
        to: "reset.user@example.test",
        otp: OTP,
        requestId: "reset-1"
      })
    ).rejects.toMatchObject({
      status: 503,
      code: "SERVICE_UNAVAILABLE"
    });

    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).toContain("password-reset");
    expect(logged).not.toContain(OTP);
    expect(logged).not.toContain(API_KEY);
  });
});

describe("Public email-verification resend remains generic on delivery failure", () => {
  const app = createApp();

  beforeEach(async () => {
    await cleanupTestData();
    clearEmailVerificationRateLimitsForTests();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("keeps public resend response generic when delivery fails", async () => {
    const email = createTestEmail("resend-generic");
    const register = await request(app).post("/api/v1/auth/register").send({
      accountType: "HOLDER",
      fullName: "Resend Generic",
      email,
      phone: `+2567${String(Math.floor(Math.random() * 100_000_000)).padStart(8, "0")}`,
      password: "SecurePassword1!",
      confirmPassword: "SecurePassword1!",
      acceptedTerms: true
    });
    expect(register.status).toBe(201);

    const service = getEmailService();
    vi.spyOn(service, "sendEmailVerificationOtp").mockRejectedValueOnce(
      new AppError(503, "SERVICE_UNAVAILABLE", "Unable to send verification email")
    );

    await prisma.emailVerificationChallenge.updateMany({
      where: { user: { email } },
      data: { resendAvailableAt: new Date(Date.now() - 1_000) }
    });

    const resend = await request(app)
      .post("/api/v1/auth/email-verification/resend")
      .send({ email });

    expect(resend.status).toBe(202);
    expect(resend.body).toMatchObject({
      verificationRequestId: expect.any(String),
      expiresInSeconds: expect.any(Number),
      resendAvailableInSeconds: expect.any(Number)
    });
    expect(resend.body.error).toBeUndefined();
    expect(JSON.stringify(resend.body)).not.toContain("Unable to send");
  });
});
