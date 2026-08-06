import { OrganizationRole, OrganizationStatus, PlatformRole } from "@prisma/client";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { getTestOtpForRequest } from "../src/services/email/index.js";
import {
  cleanupTestData,
  createRegisterPayload,
  disconnectTestDatabase
} from "./helpers/testData.js";

const app = createApp();

function canonicalPersonal(
  accountType: "HOLDER" | "VERIFIER",
  overrides: Record<string, unknown> = {}
) {
  return {
    accountType,
    fullName: "Jane User",
    email: `${accountType.toLowerCase()}.${Date.now()}.${Math.random().toString(16).slice(2)}@example.test`,
    // Uganda mobiles are +256 + 9 national digits (7XXXXXXXX)
    phone: `+2567${String(Math.floor(Math.random() * 100_000_000)).padStart(8, "0")}`,
    password: "SecurePassword1!",
    confirmPassword: "SecurePassword1!",
    acceptedTerms: true,
    ...overrides
  };
}

async function registerAndVerify(payload: Record<string, unknown>) {
  const registerResponse = await request(app).post("/api/v1/auth/register").send(payload);
  expect(registerResponse.status).toBe(201);
  expect(registerResponse.body.verificationRequired).toBe(true);

  const requestId = registerResponse.body.verificationRequestId as string;
  const otp = getTestOtpForRequest(requestId);
  expect(otp).toBeDefined();

  const verifyResponse = await request(app)
    .post("/api/v1/auth/email-verification/verify")
    .send({ requestId, otp });
  expect(verifyResponse.status).toBe(200);
  return { registerResponse, verifyResponse };
}

describe("Registration contract alignment", () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("registers a holder using personal fields", async () => {
    const payload = canonicalPersonal("HOLDER", { fullName: "Jane Mary Holder" });
    const { registerResponse, verifyResponse } = await registerAndVerify(payload);

    expect(registerResponse.body).toMatchObject({
      verificationRequired: true,
      email: payload.email
    });
    expect(registerResponse.body.accessToken).toBeUndefined();

    expect(verifyResponse.body.user).toMatchObject({
      email: payload.email,
      fullName: "Jane Mary Holder",
      firstName: "Jane",
      lastName: "Mary Holder",
      phone: payload.phone,
      role: "HOLDER",
      status: "ACTIVE"
    });
    expect(verifyResponse.body.accessToken).toEqual(expect.any(String));
    expect(verifyResponse.body.refreshToken).toEqual(expect.any(String));
    expect(JSON.stringify(verifyResponse.body)).not.toMatch(/passwordHash|confirmPassword/i);
  });

  it("registers a verifier using the same personal fields", async () => {
    const payload = canonicalPersonal("VERIFIER", {
      fullName: "Victor Verifier",
      email: `verifier.${Date.now()}@example.test`
    });
    const { verifyResponse } = await registerAndVerify(payload);

    expect(verifyResponse.body.user.role).toBe("VERIFIER");
    expect(verifyResponse.body.user.fullName).toBe("Victor Verifier");
  });

  it("keeps legacy firstName/lastName registration working", async () => {
    const payload = createRegisterPayload({ firstName: "Legacy", lastName: "User" });
    const { verifyResponse } = await registerAndVerify(payload);

    expect(verifyResponse.body.user).toMatchObject({
      fullName: "Legacy User",
      firstName: "Legacy",
      lastName: "User",
      phone: null,
      role: "HOLDER"
    });
  });

  it("rejects PLATFORM_ADMIN self-assignment", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(createRegisterPayload({ role: "PLATFORM_ADMIN" }));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects confirmPassword mismatch", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(canonicalPersonal("HOLDER", { confirmPassword: "DifferentPassword1!" }));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects missing or false acceptedTerms for canonical requests", async () => {
    const missing = await request(app)
      .post("/api/v1/auth/register")
      .send(canonicalPersonal("HOLDER", { acceptedTerms: undefined }));
    const falsy = await request(app)
      .post("/api/v1/auth/register")
      .send(canonicalPersonal("HOLDER", { acceptedTerms: false, email: `terms.${Date.now()}@example.test` }));

    expect(missing.status).toBe(400);
    expect(falsy.status).toBe(400);
  });

  it("normalizes phone to E.164 and rejects invalid phones", async () => {
    const okPayload = canonicalPersonal("HOLDER", {
      phone: "+256 700 000 123",
      email: `phone.ok.${Date.now()}@example.test`
    });
    const { verifyResponse: ok } = await registerAndVerify(okPayload);
    expect(ok.body.user.phone).toBe("+256700000123");

    const bad = await request(app)
      .post("/api/v1/auth/register")
      .send(canonicalPersonal("HOLDER", { phone: "0700000123", email: `phone.bad.${Date.now()}@example.test` }));
    expect(bad.status).toBe(400);
  });

  it("rejects duplicate normalized phone numbers", async () => {
    const phone = "+256701112233";
    await registerAndVerify(canonicalPersonal("HOLDER", { phone, email: `dup1.${Date.now()}@example.test` }));

    const second = await request(app)
      .post("/api/v1/auth/register")
      .send(canonicalPersonal("HOLDER", { phone, email: `dup2.${Date.now()}@example.test` }));
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("PHONE_ALREADY_EXISTS");
  });

  it("rejects companyName and industry on holder payloads", async () => {
    const company = await request(app)
      .post("/api/v1/auth/register")
      .send(canonicalPersonal("HOLDER", { companyName: "Nope Corp" }));
    expect(company.status).toBe(400);

    const industry = await request(app)
      .post("/api/v1/auth/register")
      .send(canonicalPersonal("HOLDER", { industry: "EDUCATION", email: `holder.ind.${Date.now()}@example.test` }));
    expect(industry.status).toBe(400);
  });

  it("rejects companyName, industry, and hrContact on verifier payloads", async () => {
    const company = await request(app)
      .post("/api/v1/auth/register")
      .send(canonicalPersonal("VERIFIER", { companyName: "Nope Corp" }));
    expect(company.status).toBe(400);

    const industry = await request(app)
      .post("/api/v1/auth/register")
      .send(canonicalPersonal("VERIFIER", { industry: "EDUCATION", email: `ver.ind.${Date.now()}@example.test` }));
    expect(industry.status).toBe(400);

    const hrContact = await request(app)
      .post("/api/v1/auth/register")
      .send(
        canonicalPersonal("VERIFIER", {
          hrContact: { email: "hr@example.test" },
          email: `ver.hr.${Date.now()}@example.test`
        })
      );
    expect(hrContact.status).toBe(400);
  });

  it("returns ORGANIZATION_APPLICATION_REQUIRED and creates no records", async () => {
    const email = `org.rejected.${Date.now()}@example.test`;
    const beforeUsers = await prisma.user.count({ where: { email } });
    const beforeOrgs = await prisma.organization.count();
    const beforeMembers = await prisma.organizationMember.count();

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        accountType: "ORGANIZATION",
        fullName: "Jane Smith",
        email,
        phone: "+256702223344",
        password: "SecurePassword1!",
        confirmPassword: "SecurePassword1!",
        companyName: "Lumora Solutions",
        industry: "EDUCATION",
        country: "Uganda",
        hrContact: { email: "hr@lumora.test" },
        acceptedTerms: true
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual({
      code: "ORGANIZATION_APPLICATION_REQUIRED",
      message:
        "Register a personal Holder or Verifier account, verify the email, then submit an organization application."
    });

    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
    expect(await prisma.user.count({ where: { email } })).toBe(beforeUsers);
    expect(await prisma.organization.count()).toBe(beforeOrgs);
    expect(await prisma.organizationMember.count()).toBe(beforeMembers);
  });

  it("rejects bare ORGANIZATION accountType without creating side effects", async () => {
    const email = `org.bare.${Date.now()}@example.test`;
    const response = await request(app).post("/api/v1/auth/register").send({
      accountType: "ORGANIZATION",
      email
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("ORGANIZATION_APPLICATION_REQUIRED");
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  });
});

describe("Organization application after personal registration", () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("allows a verified holder to submit an organization application", async () => {
    const { verifyResponse } = await registerAndVerify(canonicalPersonal("HOLDER"));
    const accessToken = verifyResponse.body.accessToken as string;

    const apply = await request(app)
      .post("/api/v1/organizations")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Example Institution",
        slug: `test-org-holder-${Date.now()}`,
        contactEmail: "admin@example.com",
        country: "Cameroon"
      });

    expect(apply.status).toBe(201);
    expect(apply.body.organization.status).toBe(OrganizationStatus.PENDING);
    expect(apply.body.membershipRole).toBe(OrganizationRole.ORGANIZATION_ADMIN);
    expect(verifyResponse.body.user.role).toBe(PlatformRole.HOLDER);

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: verifyResponse.body.user.id }
    });
    expect(user.role).toBe(PlatformRole.HOLDER);
  });
});
