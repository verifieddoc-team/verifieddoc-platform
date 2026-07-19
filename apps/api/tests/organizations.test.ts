import { randomUUID } from "node:crypto";
import { OrganizationRole, PlatformRole } from "@prisma/client";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { organizationRoleSchema } from "../src/lib/organization-roles.js";
import { prisma } from "../src/lib/prisma.js";
import {
  addOrganizationMember,
  applyForOrganization,
  cleanupTestData,
  createOrganizationPayload,
  createPlatformAdminSession,
  disconnectTestDatabase,
  registerAndAuthenticate,
  TEST_ORG_SLUG_PREFIX
} from "./helpers/testData.js";

const app = createApp();

describe("Organization onboarding and membership", () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("submits an authenticated organization application", async () => {
    const applicant = await registerAndAuthenticate(app);
    const { payload, response } = await applyForOrganization(app, applicant.accessToken);

    expect(response.status).toBe(201);
    expect(response.body.organization).toMatchObject({
      name: payload.name,
      slug: payload.slug,
      contactEmail: payload.contactEmail,
      country: payload.country,
      status: "PENDING"
    });
    expect(response.body.membershipRole).toBe("ORGANIZATION_ADMIN");
    expect(response.body.organization).not.toHaveProperty("passwordHash");
  });

  it("rejects unauthenticated organization applications", async () => {
    const response = await request(app).post("/api/v1/organizations").send(createOrganizationPayload());

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects duplicate organization slugs with 409", async () => {
    const applicant = await registerAndAuthenticate(app);
    const payload = createOrganizationPayload();

    const firstResponse = await request(app)
      .post("/api/v1/organizations")
      .set("Authorization", `Bearer ${applicant.accessToken}`)
      .send(payload);

    expect(firstResponse.status).toBe(201);

    const secondApplicant = await registerAndAuthenticate(app);
    const duplicateResponse = await request(app)
      .post("/api/v1/organizations")
      .set("Authorization", `Bearer ${secondApplicant.accessToken}`)
      .send(payload);

    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body.error.code).toBe("SLUG_ALREADY_EXISTS");
  });

  it("handles concurrent duplicate-slug applications safely", async () => {
    const firstApplicant = await registerAndAuthenticate(app);
    const secondApplicant = await registerAndAuthenticate(app);
    const sharedSlug = `${TEST_ORG_SLUG_PREFIX}-concurrent-${randomUUID().slice(0, 8)}`;
    const payloads = [
      createOrganizationPayload({ slug: sharedSlug, name: "Concurrent Org Alpha" }),
      createOrganizationPayload({ slug: sharedSlug, name: "Concurrent Org Beta" })
    ];

    const [firstResponse, secondResponse] = await Promise.all([
      request(app)
        .post("/api/v1/organizations")
        .set("Authorization", `Bearer ${firstApplicant.accessToken}`)
        .send(payloads[0]),
      request(app)
        .post("/api/v1/organizations")
        .set("Authorization", `Bearer ${secondApplicant.accessToken}`)
        .send(payloads[1])
    ]);

    const statuses = [firstResponse.status, secondResponse.status];
    expect(statuses).toContain(201);
    expect(statuses).toContain(409);
    expect(statuses.every((status) => status !== 500)).toBe(true);
  });

  it("creates ORGANIZATION_ADMIN membership without changing global User.role", async () => {
    const applicant = await registerAndAuthenticate(app, { role: "HOLDER" });
    const { response } = await applyForOrganization(app, applicant.accessToken);

    expect(response.status).toBe(201);
    expect(response.body.membershipRole).toBe("ORGANIZATION_ADMIN");

    const refreshedUser = await prisma.user.findUniqueOrThrow({
      where: { id: applicant.user.id }
    });
    expect(refreshedUser.role).toBe(PlatformRole.HOLDER);

    const membership = await prisma.organizationMember.findUniqueOrThrow({
      where: {
        organizationId_userId: {
          organizationId: response.body.organization.id,
          userId: applicant.user.id
        }
      }
    });
    expect(membership.role).toBe(OrganizationRole.ORGANIZATION_ADMIN);
  });

  it("accepts only OrganizationRole values at validation boundaries", () => {
    expect(organizationRoleSchema.safeParse(OrganizationRole.ORGANIZATION_ADMIN).success).toBe(true);
    expect(organizationRoleSchema.safeParse(OrganizationRole.ORGANIZATION_ISSUER).success).toBe(true);
    expect(organizationRoleSchema.safeParse(PlatformRole.HOLDER).success).toBe(false);
    expect(organizationRoleSchema.safeParse(PlatformRole.VERIFIER).success).toBe(false);
    expect(organizationRoleSchema.safeParse(PlatformRole.PLATFORM_ADMIN).success).toBe(false);
    expect(organizationRoleSchema.safeParse("HOLDER").success).toBe(false);
    expect(organizationRoleSchema.safeParse("PLATFORM_ADMIN").success).toBe(false);
  });

  it("assigns OrganizationRole.ORGANIZATION_ISSUER without changing global User.role", async () => {
    const admin = await registerAndAuthenticate(app);
    const issuer = await registerAndAuthenticate(app);
    const application = await applyForOrganization(app, admin.accessToken);
    const organizationId = application.response.body.organization.id as string;

    await addOrganizationMember(organizationId, issuer.user.id, OrganizationRole.ORGANIZATION_ISSUER);

    const membership = await prisma.organizationMember.findUniqueOrThrow({
      where: {
        organizationId_userId: {
          organizationId,
          userId: issuer.user.id
        }
      }
    });
    expect(membership.role).toBe(OrganizationRole.ORGANIZATION_ISSUER);

    const issuerUser = await prisma.user.findUniqueOrThrow({
      where: { id: issuer.user.id }
    });
    expect(issuerUser.role).toBe(PlatformRole.HOLDER);
  });

  it("returns only organizations where the caller is a member", async () => {
    const firstApplicant = await registerAndAuthenticate(app);
    const secondApplicant = await registerAndAuthenticate(app);

    const firstApplication = await applyForOrganization(app, firstApplicant.accessToken);
    const secondApplication = await applyForOrganization(app, secondApplicant.accessToken);

    const firstListResponse = await request(app)
      .get("/api/v1/organizations")
      .set("Authorization", `Bearer ${firstApplicant.accessToken}`);

    expect(firstListResponse.status).toBe(200);
    expect(firstListResponse.body.organizations).toHaveLength(1);
    expect(firstListResponse.body.organizations[0].organization.id).toBe(
      firstApplication.response.body.organization.id
    );
    expect(firstListResponse.body.organizations.map((entry: { organization: { id: string } }) => entry.organization.id)).not.toContain(
      secondApplication.response.body.organization.id
    );
  });

  it("forbids cross-organization detail access", async () => {
    const owner = await registerAndAuthenticate(app);
    const outsider = await registerAndAuthenticate(app);
    const application = await applyForOrganization(app, owner.accessToken);
    const organizationId = application.response.body.organization.id as string;

    const response = await request(app)
      .get(`/api/v1/organizations/${organizationId}`)
      .set("Authorization", `Bearer ${outsider.accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("allows organization admins to list members", async () => {
    const applicant = await registerAndAuthenticate(app);
    const application = await applyForOrganization(app, applicant.accessToken);
    const organizationId = application.response.body.organization.id as string;

    const response = await request(app)
      .get(`/api/v1/organizations/${organizationId}/members`)
      .set("Authorization", `Bearer ${applicant.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.members).toHaveLength(1);
    expect(response.body.members[0].membershipRole).toBe("ORGANIZATION_ADMIN");
    expect(response.body.members[0].user.email).toBe(applicant.payload.email);
    expect(response.body.members[0].user).not.toHaveProperty("passwordHash");
  });

  it("forbids organization issuers from listing members", async () => {
    const admin = await registerAndAuthenticate(app);
    const issuer = await registerAndAuthenticate(app);
    const application = await applyForOrganization(app, admin.accessToken);
    const organizationId = application.response.body.organization.id as string;

    await addOrganizationMember(organizationId, issuer.user.id, OrganizationRole.ORGANIZATION_ISSUER);

    const response = await request(app)
      .get(`/api/v1/organizations/${organizationId}/members`)
      .set("Authorization", `Bearer ${issuer.accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("forbids non-members from listing members", async () => {
    const admin = await registerAndAuthenticate(app);
    const outsider = await registerAndAuthenticate(app);
    const application = await applyForOrganization(app, admin.accessToken);
    const organizationId = application.response.body.organization.id as string;

    const response = await request(app)
      .get(`/api/v1/organizations/${organizationId}/members`)
      .set("Authorization", `Bearer ${outsider.accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("forbids non-platform-admin access to admin routes", async () => {
    const applicant = await registerAndAuthenticate(app);
    await applyForOrganization(app, applicant.accessToken);

    const listResponse = await request(app)
      .get("/api/v1/admin/organizations")
      .set("Authorization", `Bearer ${applicant.accessToken}`);

    expect(listResponse.status).toBe(403);
    expect(listResponse.body.error.code).toBe("FORBIDDEN");

    const reviewResponse = await request(app)
      .patch("/api/v1/admin/organizations/clmissing123/review")
      .set("Authorization", `Bearer ${applicant.accessToken}`)
      .send({ decision: "APPROVE" });

    expect(reviewResponse.status).toBe(403);
    expect(reviewResponse.body.error.code).toBe("FORBIDDEN");
  });

  it("allows platform admins to list pending applications with pagination", async () => {
    const applicant = await registerAndAuthenticate(app);
    const application = await applyForOrganization(app, applicant.accessToken);
    const { accessToken } = await createPlatformAdminSession(app);

    const response = await request(app)
      .get("/api/v1/admin/organizations?status=PENDING&page=1&limit=10")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.pagination).toMatchObject({
      page: 1,
      limit: 10,
      total: expect.any(Number),
      totalPages: expect.any(Number)
    });
    expect(response.body.data.some((organization: { id: string }) => organization.id === application.response.body.organization.id)).toBe(
      true
    );
    expect(response.body.data[0]).not.toHaveProperty("passwordHash");
  });

  it("allows platform admins to approve pending applications", async () => {
    const applicant = await registerAndAuthenticate(app);
    const application = await applyForOrganization(app, applicant.accessToken);
    const organizationId = application.response.body.organization.id as string;
    const { admin, accessToken } = await createPlatformAdminSession(app);

    const response = await request(app)
      .patch(`/api/v1/admin/organizations/${organizationId}/review`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ decision: "APPROVE" });

    expect(response.status).toBe(200);
    expect(response.body.organization).toMatchObject({
      id: organizationId,
      status: "VERIFIED",
      reviewedById: admin.id,
      rejectionReason: null
    });
    expect(response.body.organization.reviewedAt).toEqual(expect.any(String));
  });

  it("allows platform admins to reject pending applications with a reason", async () => {
    const applicant = await registerAndAuthenticate(app);
    const application = await applyForOrganization(app, applicant.accessToken);
    const organizationId = application.response.body.organization.id as string;
    const { accessToken } = await createPlatformAdminSession(app);

    const response = await request(app)
      .patch(`/api/v1/admin/organizations/${organizationId}/review`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        decision: "REJECT",
        rejectionReason: "Incomplete fictional registration documents."
      });

    expect(response.status).toBe(200);
    expect(response.body.organization).toMatchObject({
      id: organizationId,
      status: "REJECTED",
      rejectionReason: "Incomplete fictional registration documents."
    });
  });

  it("requires a rejection reason when rejecting an application", async () => {
    const applicant = await registerAndAuthenticate(app);
    const application = await applyForOrganization(app, applicant.accessToken);
    const organizationId = application.response.body.organization.id as string;
    const { accessToken } = await createPlatformAdminSession(app);

    const response = await request(app)
      .patch(`/api/v1/admin/organizations/${organizationId}/review`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ decision: "REJECT" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("allows exactly one concurrent review attempt to succeed", async () => {
    const applicant = await registerAndAuthenticate(app);
    const application = await applyForOrganization(app, applicant.accessToken);
    const organizationId = application.response.body.organization.id as string;
    const { accessToken } = await createPlatformAdminSession(app);

    const [firstResponse, secondResponse] = await Promise.all([
      request(app)
        .patch(`/api/v1/admin/organizations/${organizationId}/review`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ decision: "APPROVE" }),
      request(app)
        .patch(`/api/v1/admin/organizations/${organizationId}/review`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ decision: "APPROVE" })
    ]);

    const statuses = [firstResponse.status, secondResponse.status].sort((a, b) => a - b);
    expect(statuses).toEqual([200, 409]);

    const successResponse = firstResponse.status === 200 ? firstResponse : secondResponse;
    const conflictResponse = firstResponse.status === 409 ? firstResponse : secondResponse;

    expect(successResponse.body.organization.status).toBe("VERIFIED");
    expect(conflictResponse.body.error.code).toBe("ORGANIZATION_ALREADY_REVIEWED");
  });

  it("writes an audit log entry when reviewing an organization", async () => {
    const applicant = await registerAndAuthenticate(app);
    const application = await applyForOrganization(app, applicant.accessToken);
    const organizationId = application.response.body.organization.id as string;
    const { admin, accessToken } = await createPlatformAdminSession(app);

    const response = await request(app)
      .patch(`/api/v1/admin/organizations/${organizationId}/review`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ decision: "APPROVE" });

    expect(response.status).toBe(200);

    const auditLog = await prisma.auditLog.findFirst({
      where: {
        actorId: admin.id,
        action: "ORGANIZATION_APPROVED",
        resourceType: "Organization",
        resourceId: organizationId
      }
    });

    expect(auditLog).not.toBeNull();
    expect(auditLog?.details).toMatchObject({ decision: "APPROVE" });
  });
});
