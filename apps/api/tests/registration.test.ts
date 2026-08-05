import { OrganizationRole, OrganizationStatus, PlatformRole } from "@prisma/client";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import {
  cleanupTestData,
  createRegisterPayload,
  disconnectTestDatabase
} from "./helpers/testData.js";

const app = createApp();

function canonicalHolder(overrides: Record<string, unknown> = {}) {
  return {
    accountType: "HOLDER",
    fullName: "Jane Mary Holder",
    email: `holder.${Date.now()}.${Math.random().toString(16).slice(2)}@example.test`,
    // Uganda mobiles are +256 + 9 national digits (7XXXXXXXX)
    phone: `+2567${String(Math.floor(Math.random() * 100_000_000)).padStart(8, "0")}`,
    password: "SecurePassword1!",
    confirmPassword: "SecurePassword1!",
    acceptedTerms: true,
    ...overrides
  };
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

  it("registers a holder using fullName and phone", async () => {
    const payload = canonicalHolder();
    const response = await request(app).post("/api/v1/auth/register").send(payload);

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      email: payload.email,
      fullName: "Jane Mary Holder",
      firstName: "Jane",
      lastName: "Mary Holder",
      phone: payload.phone,
      role: "HOLDER",
      status: "ACTIVE"
    });
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));
    expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|confirmPassword/i);
  });

  it("registers a verifier using fullName and phone", async () => {
    const payload = canonicalHolder({
      accountType: "VERIFIER",
      fullName: "Victor Verifier",
      email: `verifier.${Date.now()}@example.test`
    });
    const response = await request(app).post("/api/v1/auth/register").send(payload);

    expect(response.status).toBe(201);
    expect(response.body.user.role).toBe("VERIFIER");
    expect(response.body.user.fullName).toBe("Victor Verifier");
  });

  it("keeps legacy firstName/lastName registration working", async () => {
    const payload = createRegisterPayload({ firstName: "Legacy", lastName: "User" });
    const response = await request(app).post("/api/v1/auth/register").send(payload);

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
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
      .send(canonicalHolder({ confirmPassword: "DifferentPassword1!" }));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects missing or false acceptedTerms for canonical requests", async () => {
    const missing = await request(app)
      .post("/api/v1/auth/register")
      .send(canonicalHolder({ acceptedTerms: undefined }));
    const falsy = await request(app)
      .post("/api/v1/auth/register")
      .send(canonicalHolder({ acceptedTerms: false, email: `terms.${Date.now()}@example.test` }));

    expect(missing.status).toBe(400);
    expect(falsy.status).toBe(400);
  });

  it("normalizes phone to E.164 and rejects invalid phones", async () => {
    const ok = await request(app)
      .post("/api/v1/auth/register")
      .send(canonicalHolder({ phone: "+256 700 000 123", email: `phone.ok.${Date.now()}@example.test` }));
    expect(ok.status).toBe(201);
    expect(ok.body.user.phone).toBe("+256700000123");

    const bad = await request(app)
      .post("/api/v1/auth/register")
      .send(canonicalHolder({ phone: "0700000123", email: `phone.bad.${Date.now()}@example.test` }));
    expect(bad.status).toBe(400);
  });

  it("rejects duplicate normalized phone numbers", async () => {
    const phone = "+256701112233";
    const first = await request(app)
      .post("/api/v1/auth/register")
      .send(canonicalHolder({ phone, email: `dup1.${Date.now()}@example.test` }));
    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/v1/auth/register")
      .send(canonicalHolder({ phone, email: `dup2.${Date.now()}@example.test` }));
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("PHONE_ALREADY_EXISTS");
  });

  it("rejects company fields on holder payloads", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(canonicalHolder({ companyName: "Nope Corp" }));
    expect(response.status).toBe(400);
  });

  it("requires organization fields for ORGANIZATION registration", async () => {
    const base = {
      accountType: "ORGANIZATION",
      fullName: "Jane Smith",
      email: `org.missing.${Date.now()}@example.test`,
      phone: "+256702223344",
      password: "SecurePassword1!",
      confirmPassword: "SecurePassword1!",
      acceptedTerms: true
    };

    const withoutCompany = await request(app).post("/api/v1/auth/register").send(base);
    expect(withoutCompany.status).toBe(400);

    const withoutIndustry = await request(app)
      .post("/api/v1/auth/register")
      .send({ ...base, email: `org.ind.${Date.now()}@example.test`, companyName: "Lumora", country: "Uganda", hrContact: "hr@example.test" });
    expect(withoutIndustry.status).toBe(400);

    const withoutHr = await request(app)
      .post("/api/v1/auth/register")
      .send({
        ...base,
        email: `org.hr.${Date.now()}@example.test`,
        companyName: "Lumora",
        industry: "Technology",
        country: "Uganda"
      });
    expect(withoutHr.status).toBe(400);
  });

  it("accepts canonical hrContact object and deprecated hrcontact alias", async () => {
    const canonical = await request(app)
      .post("/api/v1/auth/register")
      .send({
        accountType: "ORGANIZATION",
        fullName: "Jane Smith",
        email: `org.canon.${Date.now()}@example.test`,
        phone: "+256703334455",
        password: "SecurePassword1!",
        confirmPassword: "SecurePassword1!",
        companyName: "Lumora Solutions",
        industry: "Technology",
        country: "Uganda",
        hrContact: {
          fullName: "Mary Human",
          email: "hr@lumora.test",
          phone: "+256711111111"
        },
        acceptedTerms: true
      });

    expect(canonical.status).toBe(201);
    expect(canonical.body.organization).toMatchObject({
      name: "Lumora Solutions",
      industry: "Technology",
      status: OrganizationStatus.PENDING,
      membershipRole: OrganizationRole.ORGANIZATION_ADMIN
    });
    expect(canonical.body.user.role).toBe(PlatformRole.HOLDER);

    const alias = await request(app)
      .post("/api/v1/auth/register")
      .send({
        accountType: "ORGANIZATION",
        fullName: "Jane Smith",
        email: `org.alias.${Date.now()}@example.test`,
        phone: "+256704445566",
        password: "SecurePassword1!",
        confirmPassword: "SecurePassword1!",
        companyName: "Alias Org",
        industry: "Education",
        country: "Uganda",
        hrcontact: "hr@alias.test",
        acceptedTerms: true
      });
    expect(alias.status).toBe(201);
  });

  it("rejects sending both hrContact and hrcontact", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        accountType: "ORGANIZATION",
        fullName: "Jane Smith",
        email: `org.both.${Date.now()}@example.test`,
        phone: "+256705556677",
        password: "SecurePassword1!",
        confirmPassword: "SecurePassword1!",
        companyName: "Both Org",
        industry: "Technology",
        country: "Uganda",
        hrContact: { email: "a@example.test" },
        hrcontact: { email: "b@example.test" },
        acceptedTerms: true
      });

    expect(response.status).toBe(400);
  });

  it("creates user, pending organization, and ORGANIZATION_ADMIN membership without PlatformRole ORGANIZATION_ADMIN", async () => {
    const email = `org.full.${Date.now()}@example.test`;
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        accountType: "ORGANIZATION",
        fullName: "Admin Person",
        email,
        phone: "+256706667788",
        password: "SecurePassword1!",
        confirmPassword: "SecurePassword1!",
        companyName: "Northwind Institute",
        industry: "Education",
        country: "Uganda",
        hrContact: { email: "hr@northwind.test" },
        acceptedTerms: true
      });

    expect(response.status).toBe(201);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.role).toBe(PlatformRole.HOLDER);
    expect(user.termsAcceptedAt).not.toBeNull();
    expect(user.privacyAcceptedAt).not.toBeNull();

    const membership = await prisma.organizationMember.findFirstOrThrow({
      where: { userId: user.id },
      include: { organization: true }
    });
    expect(membership.role).toBe(OrganizationRole.ORGANIZATION_ADMIN);
    expect(membership.organization.status).toBe(OrganizationStatus.PENDING);
    expect(membership.organization.hrContactEmail).toBe("hr@northwind.test");
  });

  it("rolls back completely when organization creation fails due to slug exhaustion simulation", async () => {
    const email = `org.rollback.${Date.now()}@example.test`;
    // "zz" slugifies to "org-zz"; occupy all 8 automatic slug attempts.
    await prisma.organization.deleteMany({ where: { slug: { startsWith: "org-zz" } } });
    const slugs = ["org-zz", "org-zz-2", "org-zz-3", "org-zz-4", "org-zz-5", "org-zz-6", "org-zz-7", "org-zz-8"];
    for (const [index, slug] of slugs.entries()) {
      await prisma.organization.create({
        data: {
          name: `ZZ ${index}`,
          slug,
          contactEmail: `zz${index}@example.test`,
          country: "UG",
          status: OrganizationStatus.PENDING
        }
      });
    }

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        accountType: "ORGANIZATION",
        fullName: "Rollback User",
        email,
        phone: "+256707778899",
        password: "SecurePassword1!",
        confirmPassword: "SecurePassword1!",
        companyName: "zz",
        industry: "Technology",
        country: "Uganda",
        hrContact: { email: "hr@rollback.test" },
        acceptedTerms: true
      });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("ORGANIZATION_SLUG_CONFLICT");
    const orphan = await prisma.user.findUnique({ where: { email } });
    expect(orphan).toBeNull();

    await prisma.organization.deleteMany({ where: { slug: { startsWith: "org-zz" } } });
  });
});
