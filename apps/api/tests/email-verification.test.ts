import { OrganizationRole, OrganizationStatus, PlatformRole, UserStatus } from "@prisma/client";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { hashEmailVerificationSecret } from "../src/lib/tokens.js";
import {
  clearEmailVerificationRateLimitsForTests,
  clearTestEmailState,
  getEmailService,
  getTestEmailInbox,
  getTestOtpForRequest
} from "./email-verification-test-utils.js";
import {
  cleanupTestData,
  createRegisterPayload,
  createTestEmail,
  createTestUser,
  disconnectTestDatabase,
  TEST_PASSWORD
} from "./helpers/testData.js";

const app = createApp();

function canonicalHolder(overrides: Record<string, unknown> = {}) {
  return {
    accountType: "HOLDER",
    fullName: "Jane Mary Holder",
    email: createTestEmail("ev-holder"),
    phone: `+2567${String(Math.floor(Math.random() * 100_000_000)).padStart(8, "0")}`,
    password: "SecurePassword1!",
    confirmPassword: "SecurePassword1!",
    acceptedTerms: true,
    ...overrides
  };
}

describe("Signup email verification", () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  beforeEach(() => {
    clearTestEmailState();
    clearEmailVerificationRateLimitsForTests();
  });

  afterEach(async () => {
    clearTestEmailState();
    clearEmailVerificationRateLimitsForTests();
    vi.restoreAllMocks();
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("registers holder and verifier as unverified pending verification without tokens", async () => {
    const holderPayload = canonicalHolder();
    const holder = await request(app).post("/api/v1/auth/register").send(holderPayload);
    expect(holder.status).toBe(201);
    expect(holder.body).toMatchObject({
      verificationRequired: true,
      email: holderPayload.email,
      maskedEmail: expect.stringContaining("***@"),
      expiresInSeconds: 600,
      resendAvailableInSeconds: 60
    });
    expect(holder.body.accessToken).toBeUndefined();
    expect(holder.body.refreshToken).toBeUndefined();
    expect(holder.body.otp).toBeUndefined();

    const holderUser = await prisma.user.findUniqueOrThrow({ where: { email: holderPayload.email } });
    expect(holderUser.emailVerifiedAt).toBeNull();
    expect(holderUser.role).toBe(PlatformRole.HOLDER);

    const verifierPayload = canonicalHolder({
      accountType: "VERIFIER",
      email: createTestEmail("ev-verifier"),
      fullName: "Victor Verifier"
    });
    const verifier = await request(app).post("/api/v1/auth/register").send(verifierPayload);
    expect(verifier.status).toBe(201);
    expect(verifier.body.verificationRequired).toBe(true);
    const verifierUser = await prisma.user.findUniqueOrThrow({ where: { email: verifierPayload.email } });
    expect(verifierUser.emailVerifiedAt).toBeNull();
    expect(verifierUser.role).toBe(PlatformRole.VERIFIER);
  });

  it("sends verification OTP through memory adapter and never stores plaintext OTP", async () => {
    const payload = canonicalHolder();
    const response = await request(app).post("/api/v1/auth/register").send(payload);
    expect(response.status).toBe(201);

    const requestId = response.body.verificationRequestId as string;
    const otp = getTestOtpForRequest(requestId);
    expect(otp).toMatch(/^\d{6}$/);

    const inbox = getTestEmailInbox();
    expect(inbox).toHaveLength(1);
    expect(inbox[0]?.kind).toBe("email-verification");
    expect(inbox[0]?.to).toBe(payload.email);
    expect(inbox[0]?.otp).toBe(otp);

    const challenge = await prisma.emailVerificationChallenge.findUniqueOrThrow({
      where: { id: requestId }
    });
    expect(challenge.otpHash).toBe(hashEmailVerificationSecret(otp!));
    expect(JSON.stringify(challenge)).not.toContain(otp);
    expect(challenge.otpHash).not.toBe(otp);
  });

  it("returns EMAIL_ALREADY_EXISTS for verified emails and EMAIL_VERIFICATION_REQUIRED for unverified", async () => {
    const verified = await createTestUser({ email: createTestEmail("ev-verified") });
    const verifiedDup = await request(app)
      .post("/api/v1/auth/register")
      .send(createRegisterPayload({ email: verified.payload.email }));
    expect(verifiedDup.status).toBe(409);
    expect(verifiedDup.body.error.code).toBe("EMAIL_ALREADY_EXISTS");

    const payload = createRegisterPayload({ email: createTestEmail("ev-unverified") });
    const first = await request(app).post("/api/v1/auth/register").send(payload);
    expect(first.status).toBe(201);

    const second = await request(app).post("/api/v1/auth/register").send(payload);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("EMAIL_VERIFICATION_REQUIRED");
    expect(second.body.error.details).toMatchObject({
      verificationRequired: true,
      email: payload.email
    });
  });

  it("does not authenticate when email delivery fails; resend works after delivery is restored", async () => {
    const emailService = getEmailService();
    vi.spyOn(emailService, "sendEmailVerificationOtp").mockRejectedValueOnce(new Error("smtp down"));

    const payload = canonicalHolder({ email: createTestEmail("ev-fail-mail") });
    const response = await request(app).post("/api/v1/auth/register").send(payload);
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("SERVICE_UNAVAILABLE");
    expect(response.body.accessToken).toBeUndefined();

    const user = await prisma.user.findUniqueOrThrow({ where: { email: payload.email } });
    expect(user.emailVerifiedAt).toBeNull();
    expect(await prisma.user.count({ where: { email: payload.email } })).toBe(1);

    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: payload.email, password: payload.password });
    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe("EMAIL_NOT_VERIFIED");

    // Re-register must not duplicate the unverified account.
    const reregister = await request(app).post("/api/v1/auth/register").send(payload);
    expect(reregister.status).toBe(409);
    expect(reregister.body.error.code).toBe("EMAIL_VERIFICATION_REQUIRED");
    expect(await prisma.user.count({ where: { email: payload.email } })).toBe(1);

    clearEmailVerificationRateLimitsForTests();
    clearTestEmailState();
    vi.restoreAllMocks();

    const resend = await request(app)
      .post("/api/v1/auth/email-verification/resend")
      .send({ email: payload.email });
    expect(resend.status).toBe(202);
    const requestId = resend.body.verificationRequestId as string;
    const otp = getTestOtpForRequest(requestId);
    expect(otp).toMatch(/^\d{6}$/);

    const verify = await request(app)
      .post("/api/v1/auth/email-verification/verify")
      .send({ requestId, otp });
    expect(verify.status).toBe(200);
    expect(verify.body.accessToken).toEqual(expect.any(String));
  });

  it("verifies correct OTP, creates session + EMAIL_VERIFIED audit, and is single-use", async () => {
    const payload = canonicalHolder();
    const registerResponse = await request(app).post("/api/v1/auth/register").send(payload);
    const requestId = registerResponse.body.verificationRequestId as string;
    const otp = getTestOtpForRequest(requestId)!;

    const verifyResponse = await request(app)
      .post("/api/v1/auth/email-verification/verify")
      .send({ requestId, otp });

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.user).toMatchObject({
      email: payload.email,
      role: "HOLDER"
    });
    expect(verifyResponse.body.user.emailVerifiedAt).toEqual(expect.any(String));
    expect(verifyResponse.body.accessToken).toEqual(expect.any(String));
    expect(verifyResponse.body.refreshToken).toEqual(expect.any(String));

    const audit = await prisma.auditLog.findFirst({
      where: { action: "EMAIL_VERIFIED", resourceId: requestId }
    });
    expect(audit).not.toBeNull();

    const reuse = await request(app)
      .post("/api/v1/auth/email-verification/verify")
      .send({ requestId, otp });
    expect(reuse.status).toBe(400);
    expect(reuse.body.error.code).toBe("OTP_INVALID");
  });

  it("increments attempts and locks after max failures; rejects expired OTP", async () => {
    const payload = canonicalHolder({ email: createTestEmail("ev-attempts") });
    const registerResponse = await request(app).post("/api/v1/auth/register").send(payload);
    const requestId = registerResponse.body.verificationRequestId as string;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const wrong = await request(app)
        .post("/api/v1/auth/email-verification/verify")
        .send({ requestId, otp: "000000" });
      expect(wrong.status).toBe(400);
      expect(wrong.body.error.code).toBe("OTP_INVALID");
    }

    const locked = await request(app)
      .post("/api/v1/auth/email-verification/verify")
      .send({ requestId, otp: "000000" });
    expect(locked.status).toBe(429);
    expect(locked.body.error.code).toBe("OTP_LOCKED");

    const payloadExpired = canonicalHolder({ email: createTestEmail("ev-expired") });
    const expiredRegister = await request(app).post("/api/v1/auth/register").send(payloadExpired);
    const expiredId = expiredRegister.body.verificationRequestId as string;
    const expiredOtp = getTestOtpForRequest(expiredId)!;
    await prisma.emailVerificationChallenge.update({
      where: { id: expiredId },
      data: { expiresAt: new Date(Date.now() - 1_000) }
    });
    const expiredVerify = await request(app)
      .post("/api/v1/auth/email-verification/verify")
      .send({ requestId: expiredId, otp: expiredOtp });
    expect(expiredVerify.status).toBe(400);
    expect(expiredVerify.body.error.code).toBe("OTP_EXPIRED");
  });

  it("enforces resend cooldown and invalidates previous OTP when a new code is issued", async () => {
    const payload = canonicalHolder({ email: createTestEmail("ev-resend-ok") });
    const registerResponse = await request(app).post("/api/v1/auth/register").send(payload);
    const firstId = registerResponse.body.verificationRequestId as string;
    const firstOtp = getTestOtpForRequest(firstId)!;

    const cooldown = await request(app)
      .post("/api/v1/auth/email-verification/resend")
      .send({ email: payload.email });
    expect(cooldown.status).toBe(202);
    expect(cooldown.body.verificationRequestId).toBe(firstId);
    expect(cooldown.body.resendAvailableInSeconds).toBeGreaterThan(0);

    clearEmailVerificationRateLimitsForTests();
    await prisma.emailVerificationChallenge.update({
      where: { id: firstId },
      data: { resendAvailableAt: new Date(Date.now() - 1_000) }
    });

    const resendResponse = await request(app)
      .post("/api/v1/auth/email-verification/resend")
      .send({ email: payload.email });
    expect(resendResponse.status).toBe(202);
    const secondId = resendResponse.body.verificationRequestId as string;
    expect(secondId).not.toBe(firstId);
    const secondOtp = getTestOtpForRequest(secondId)!;
    expect(secondOtp).toBeDefined();
    expect(secondOtp).not.toBe(firstOtp);

    const oldVerify = await request(app)
      .post("/api/v1/auth/email-verification/verify")
      .send({ requestId: firstId, otp: firstOtp });
    expect(oldVerify.status).toBe(400);

    const newVerify = await request(app)
      .post("/api/v1/auth/email-verification/verify")
      .send({ requestId: secondId, otp: secondOtp });
    expect(newVerify.status).toBe(200);
  });

  it("allows only one concurrent verification to create a session", async () => {
    const payload = canonicalHolder({ email: createTestEmail("ev-concurrent") });
    const registerResponse = await request(app).post("/api/v1/auth/register").send(payload);
    const requestId = registerResponse.body.verificationRequestId as string;
    const otp = getTestOtpForRequest(requestId)!;

    const [first, second] = await Promise.all([
      request(app).post("/api/v1/auth/email-verification/verify").send({ requestId, otp }),
      request(app).post("/api/v1/auth/email-verification/verify").send({ requestId, otp })
    ]);

    const statuses = [first.status, second.status].sort((a, b) => a - b);
    expect(statuses).toEqual([200, 400]);

    const tokens = await prisma.refreshToken.count({
      where: {
        user: { email: payload.email },
        revokedAt: null
      }
    });
    expect(tokens).toBe(1);
  });

  it("rejects suspended users from verifying into an active session", async () => {
    const payload = canonicalHolder({ email: createTestEmail("ev-suspended") });
    const registerResponse = await request(app).post("/api/v1/auth/register").send(payload);
    const requestId = registerResponse.body.verificationRequestId as string;
    const otp = getTestOtpForRequest(requestId)!;

    await prisma.user.update({
      where: { email: payload.email },
      data: { status: UserStatus.SUSPENDED, suspendedAt: new Date(), suspendedReason: "test" }
    });

    const verifyResponse = await request(app)
      .post("/api/v1/auth/email-verification/verify")
      .send({ requestId, otp });

    expect(verifyResponse.status).toBe(401);
    expect(verifyResponse.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("blocks unverified login and allows verified holder/verifier/admin login; rejects role in login body", async () => {
    const holderPayload = canonicalHolder({ email: createTestEmail("ev-login-holder") });
    await request(app).post("/api/v1/auth/register").send(holderPayload);

    const unverifiedLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: holderPayload.email, password: holderPayload.password });
    expect(unverifiedLogin.status).toBe(403);
    expect(unverifiedLogin.body.error).toMatchObject({
      code: "EMAIL_NOT_VERIFIED",
      details: {
        verificationRequired: true,
        email: holderPayload.email
      }
    });

    const verifierPayload = canonicalHolder({
      accountType: "VERIFIER",
      email: createTestEmail("ev-login-verifier"),
      fullName: "Login Verifier"
    });
    const verifierRegister = await request(app).post("/api/v1/auth/register").send(verifierPayload);
    const unverifiedVerifierLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: verifierPayload.email, password: verifierPayload.password });
    expect(unverifiedVerifierLogin.status).toBe(403);

    const holderRequestId = (
      await prisma.emailVerificationChallenge.findFirstOrThrow({
        where: { user: { email: holderPayload.email } },
        orderBy: { createdAt: "desc" }
      })
    ).id;
    const holderOtp = getTestOtpForRequest(holderRequestId)!;
    await request(app)
      .post("/api/v1/auth/email-verification/verify")
      .send({ requestId: holderRequestId, otp: holderOtp });

    const verifiedHolderLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: holderPayload.email, password: holderPayload.password });
    expect(verifiedHolderLogin.status).toBe(200);
    expect(verifiedHolderLogin.body.user.role).toBe("HOLDER");

    const verifierRequestId = verifierRegister.body.verificationRequestId as string;
    await request(app)
      .post("/api/v1/auth/email-verification/verify")
      .send({ requestId: verifierRequestId, otp: getTestOtpForRequest(verifierRequestId) });
    const verifiedVerifierLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: verifierPayload.email, password: verifierPayload.password });
    expect(verifiedVerifierLogin.status).toBe(200);
    expect(verifiedVerifierLogin.body.user.role).toBe("VERIFIER");

    const admin = await createTestUser({
      email: createTestEmail("ev-login-admin"),
      role: PlatformRole.PLATFORM_ADMIN
    });
    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: admin.payload.email, password: TEST_PASSWORD });
    expect(adminLogin.status).toBe(200);
    expect(adminLogin.body.user.role).toBe("PLATFORM_ADMIN");

    const roleRejected = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: admin.payload.email, password: TEST_PASSWORD, role: "PLATFORM_ADMIN" });
    expect(roleRejected.status).toBe(400);
    expect(roleRejected.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("keeps organization membership separate from client-selected role", async () => {
    const email = createTestEmail("ev-org-login");
    const registerResponse = await request(app)
      .post("/api/v1/auth/register")
      .send({
        accountType: "HOLDER",
        fullName: "Org Person",
        email,
        phone: "+256709998877",
        password: "SecurePassword1!",
        confirmPassword: "SecurePassword1!",
        acceptedTerms: true
      });

    const requestId = registerResponse.body.verificationRequestId as string;
    const verifyResponse = await request(app)
      .post("/api/v1/auth/email-verification/verify")
      .send({ requestId, otp: getTestOtpForRequest(requestId) });

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.user.role).toBe("HOLDER");

    const apply = await request(app)
      .post("/api/v1/organizations")
      .set("Authorization", `Bearer ${verifyResponse.body.accessToken}`)
      .send({
        name: "Membership Org",
        slug: `test-org-membership-${Date.now()}`,
        contactEmail: "hr@membership.org.test",
        country: "Uganda",
        industry: "HR & Recruitment"
      });
    expect(apply.status).toBe(201);
    expect(apply.body.membershipRole).toBe(OrganizationRole.ORGANIZATION_ADMIN);
    expect(apply.body.organization).toMatchObject({
      name: "Membership Org",
      industry: "HR_RECRUITMENT",
      status: OrganizationStatus.PENDING
    });

    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password: "SecurePassword1!" });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe("HOLDER");

    const memberships = await request(app)
      .get("/api/v1/organizations")
      .set("Authorization", `Bearer ${login.body.accessToken}`);
    expect(memberships.status).toBe(200);
    expect(memberships.body.organizations).toHaveLength(1);
    expect(memberships.body.organizations[0]).toMatchObject({
      membershipRole: OrganizationRole.ORGANIZATION_ADMIN,
      organization: {
        name: "Membership Org",
        industry: "HR_RECRUITMENT",
        status: OrganizationStatus.PENDING
      }
    });
  });
});
