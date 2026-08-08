import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { INDUSTRIES } from "../src/lib/industries.js";
import { prisma } from "../src/lib/prisma.js";
import { getTestOtpForRequest } from "../src/services/email/index.js";
import {
  cleanupTestData,
  createTestEmail,
  disconnectTestDatabase
} from "./helpers/testData.js";

const app = createApp();

async function registerVerifyAndApply(
  email: string,
  organization: Record<string, unknown>
) {
  const register = await request(app)
    .post("/api/v1/auth/register")
    .send({
      accountType: "HOLDER",
      fullName: "Industry Applicant",
      email,
      phone: `+2567${String(Math.floor(Math.random() * 100_000_000)).padStart(8, "0")}`,
      password: "SecurePassword1!",
      confirmPassword: "SecurePassword1!",
      acceptedTerms: true
    });
  expect(register.status).toBe(201);

  const verify = await request(app)
    .post("/api/v1/auth/email-verification/verify")
    .send({
      requestId: register.body.verificationRequestId,
      otp: getTestOtpForRequest(register.body.verificationRequestId)
    });
  expect(verify.status).toBe(200);

  const apply = await request(app)
    .post("/api/v1/organizations")
    .set("Authorization", `Bearer ${verify.body.accessToken}`)
    .send(organization);
  expect(apply.status).toBe(201);
  return apply;
}

describe("Public industries metadata", () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("exposes GET /meta/industries publicly with the approved list", async () => {
    const response = await request(app).get("/api/v1/meta/industries");
    expect(response.status).toBe(200);
    expect(response.body.industries).toEqual([...INDUSTRIES]);
    expect(response.body.industries).toHaveLength(10);
    expect(response.body.industries.map((item: { label: string }) => item.label)).toEqual([
      "HR & Recruitment",
      "Banking & FinTech",
      "Education",
      "Government / GovTech",
      "Legal Services",
      "Real Estate / PropTech",
      "Insurance",
      "Transportation",
      "Professional Licensing",
      "Background Screening"
    ]);
    expect(response.body.industries.some((item: { code: string }) => item.code === "OTHER")).toBe(
      false
    );
  });

  it("accepts industry codes and labels on organization application and stores codes when recognized", async () => {
    const codeEmail = createTestEmail("ind-code");
    const codeApply = await registerVerifyAndApply(codeEmail, {
      name: "Code Org",
      slug: `test-org-code-${Date.now()}`,
      contactEmail: "hr@code.org.test",
      country: "Uganda",
      industry: "BANKING_FINTECH"
    });
    expect(codeApply.body.organization.industry).toBe("BANKING_FINTECH");

    const codeOrg = await prisma.organization.findFirstOrThrow({
      where: { members: { some: { user: { email: codeEmail } } } }
    });
    expect(codeOrg.industry).toBe("BANKING_FINTECH");

    const labelEmail = createTestEmail("ind-label");
    await registerVerifyAndApply(labelEmail, {
      name: "Label Org",
      slug: `test-org-label-${Date.now()}`,
      contactEmail: "hr@label.org.test",
      country: "Uganda",
      industry: "Education"
    });

    const labelOrg = await prisma.organization.findFirstOrThrow({
      where: { members: { some: { user: { email: labelEmail } } } }
    });
    expect(labelOrg.industry).toBe("EDUCATION");

    // Temporary compatibility: unrecognized free-form values are stored trimmed as-is.
    const legacyEmail = createTestEmail("ind-legacy");
    await registerVerifyAndApply(legacyEmail, {
      name: "Legacy Org",
      slug: `test-org-legacy-${Date.now()}`,
      contactEmail: "hr@legacy.org.test",
      country: "Uganda",
      industry: "Technology"
    });
    const legacyOrg = await prisma.organization.findFirstOrThrow({
      where: { members: { some: { user: { email: legacyEmail } } } }
    });
    expect(legacyOrg.industry).toBe("Technology");
  });
});
