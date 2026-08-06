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

  it("accepts industry codes and labels and stores codes when recognized", async () => {
    const codeEmail = createTestEmail("ind-code");
    const codeRegister = await request(app)
      .post("/api/v1/auth/register")
      .send({
        accountType: "ORGANIZATION",
        fullName: "Industry Code",
        email: codeEmail,
        phone: "+256700111222",
        password: "SecurePassword1!",
        confirmPassword: "SecurePassword1!",
        companyName: "Code Org",
        industry: "BANKING_FINTECH",
        country: "Uganda",
        hrContact: { email: "hr@code.org.test" },
        acceptedTerms: true
      });
    expect(codeRegister.status).toBe(201);
    await request(app)
      .post("/api/v1/auth/email-verification/verify")
      .send({
        requestId: codeRegister.body.verificationRequestId,
        otp: getTestOtpForRequest(codeRegister.body.verificationRequestId)
      });

    const codeOrg = await prisma.organization.findFirstOrThrow({
      where: { members: { some: { user: { email: codeEmail } } } }
    });
    expect(codeOrg.industry).toBe("BANKING_FINTECH");

    const labelEmail = createTestEmail("ind-label");
    const labelRegister = await request(app)
      .post("/api/v1/auth/register")
      .send({
        accountType: "ORGANIZATION",
        fullName: "Industry Label",
        email: labelEmail,
        phone: "+256700333444",
        password: "SecurePassword1!",
        confirmPassword: "SecurePassword1!",
        companyName: "Label Org",
        industry: "Education",
        country: "Uganda",
        hrContact: { email: "hr@label.org.test" },
        acceptedTerms: true
      });
    expect(labelRegister.status).toBe(201);

    const labelOrg = await prisma.organization.findFirstOrThrow({
      where: { members: { some: { user: { email: labelEmail } } } }
    });
    expect(labelOrg.industry).toBe("EDUCATION");

    // Temporary compatibility: unrecognized free-form values are stored trimmed as-is.
    const legacyEmail = createTestEmail("ind-legacy");
    const legacyRegister = await request(app)
      .post("/api/v1/auth/register")
      .send({
        accountType: "ORGANIZATION",
        fullName: "Industry Legacy",
        email: legacyEmail,
        phone: "+256700555666",
        password: "SecurePassword1!",
        confirmPassword: "SecurePassword1!",
        companyName: "Legacy Org",
        industry: "Technology",
        country: "Uganda",
        hrContact: { email: "hr@legacy.org.test" },
        acceptedTerms: true
      });
    expect(legacyRegister.status).toBe(201);
    const legacyOrg = await prisma.organization.findFirstOrThrow({
      where: { members: { some: { user: { email: legacyEmail } } } }
    });
    expect(legacyOrg.industry).toBe("Technology");
  });
});
