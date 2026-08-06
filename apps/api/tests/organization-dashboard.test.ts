import { OrganizationRole, PlatformRole, VerificationRequestStatus } from "@prisma/client";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { createAccessToken } from "../src/lib/tokens.js";
import {
  issueCredentialRequest,
  registerHolder,
  setupVerifiedOrganization
} from "./helpers/credentialTestData.js";
import {
  cleanupTestData,
  createPlatformAdminSession,
  createTestEmail,
  createTestUser,
  disconnectTestDatabase
} from "./helpers/testData.js";

const app = createApp();

async function createVerifierSession() {
  const session = await createTestUser({
    firstName: "Verify",
    lastName: "Agent",
    role: PlatformRole.VERIFIER
  });

  return {
    ...session,
    accessToken: createAccessToken({
      sub: session.user.id,
      email: session.user.email,
      role: PlatformRole.VERIFIER
    })
  };
}

describe("Organization dashboard, profile, and verification request review", () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("returns dashboard stats and recent activity for issuer roles", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);

    const issueResponse = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.user.email
    });
    expect(issueResponse.status).toBe(201);

    const verifier = await createVerifierSession();
    const createRequest = await request(app)
      .post("/api/v1/verifier/verification-requests")
      .set("Authorization", `Bearer ${verifier.accessToken}`)
      .send({
        credentialId: issueResponse.body.credential.id,
        requesterNote: "Please confirm employment history"
      });
    expect(createRequest.status).toBe(201);

    const response = await request(app)
      .get(`/api/v1/organizations/${organizationId}/dashboard`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.stats).toMatchObject({
      totalIssued: 1,
      active: 1,
      expired: 0,
      revoked: 0,
      activeRecipients: 1,
      pendingVerificationRequests: 1,
      issuedThisMonth: 1
    });
    expect(response.body.recentCredentials).toHaveLength(1);
    expect(response.body.recentVerificationRequests).toHaveLength(1);
  });

  it("allows admins to patch safe profile fields and rejects status/reviewed fields", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);

    const response = await request(app)
      .patch(`/api/v1/organizations/${organizationId}`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        industry: "Healthcare",
        hrContactName: "Pat Lee",
        hrContactEmail: "pat.lee@example.test",
        hrContactPhone: "+14155552671",
        description: "Updated fictional training provider profile."
      });

    expect(response.status).toBe(200);
    expect(response.body.organization).toMatchObject({
      industry: "Healthcare",
      hrContactName: "Pat Lee",
      hrContactEmail: "pat.lee@example.test",
      hrContactPhone: "+14155552671",
      description: "Updated fictional training provider profile.",
      status: "VERIFIED"
    });

    const forbidden = await request(app)
      .patch(`/api/v1/organizations/${organizationId}`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        status: "SUSPENDED",
        reviewedAt: new Date().toISOString(),
        reviewedById: admin.user.id
      });

    expect(forbidden.status).toBe(400);
    expect(forbidden.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("reviews verification requests transactionally and handles review races", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const secondAdmin = await createTestUser({ firstName: "Second", lastName: "Admin" });
    await prisma.organizationMember.create({
      data: {
        organizationId,
        userId: secondAdmin.user.id,
        role: OrganizationRole.ORGANIZATION_ADMIN
      }
    });

    const holder = await registerHolder(app);
    const issueResponse = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.user.email
    });

    const verifier = await createVerifierSession();
    const createRequest = await request(app)
      .post("/api/v1/verifier/verification-requests")
      .set("Authorization", `Bearer ${verifier.accessToken}`)
      .send({
        credentialId: issueResponse.body.credential.id,
        requesterNote: "Need confirmation"
      });

    expect(createRequest.status).toBe(201);
    const requestId = createRequest.body.request.id as string;

    const [firstReview, secondReview] = await Promise.all([
      request(app)
        .patch(`/api/v1/organizations/${organizationId}/verification-requests/${requestId}/review`)
        .set("Authorization", `Bearer ${admin.accessToken}`)
        .send({ decision: "APPROVE", note: "Looks good" }),
      request(app)
        .patch(`/api/v1/organizations/${organizationId}/verification-requests/${requestId}/review`)
        .set("Authorization", `Bearer ${secondAdmin.accessToken}`)
        .send({ decision: "REJECT", note: "No" })
    ]);

    const statuses = [firstReview.status, secondReview.status].sort();
    expect(statuses).toEqual([200, 409]);

    const winner = firstReview.status === 200 ? firstReview : secondReview;
    expect([VerificationRequestStatus.APPROVED, VerificationRequestStatus.REJECTED]).toContain(
      winner.body.request.status
    );

    const notifications = await prisma.notification.findMany({
      where: {
        type: "VERIFICATION_REQUEST_REVIEWED",
        resourceId: requestId
      }
    });
    expect(notifications.length).toBeGreaterThanOrEqual(2);

    const getResponse = await request(app)
      .get(`/api/v1/organizations/${organizationId}/verification-requests/${requestId}`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.request.status).toBe(winner.body.request.status);
  });

  it("notifies organization admins when platform reviews the organization", async () => {
    const { organizationId } = await setupVerifiedOrganization(app);
    const applicant = await createTestUser();
    const apply = await request(app)
      .post("/api/v1/organizations")
      .set("Authorization", `Bearer ${applicant.accessToken}`)
      .send({
        name: "Notification Org",
        slug: `test-org-notify-${Date.now()}`,
        contactEmail: createTestEmail("notify-org"),
        country: "Canada"
      });
    expect(apply.status).toBe(201);
    const pendingOrgId = apply.body.organization.id as string;

    const { accessToken: platformToken } = await createPlatformAdminSession();
    const review = await request(app)
      .patch(`/api/v1/admin/organizations/${pendingOrgId}/review`)
      .set("Authorization", `Bearer ${platformToken}`)
      .send({ decision: "APPROVE" });

    expect(review.status).toBe(200);

    const approvedNotification = await prisma.notification.findFirst({
      where: {
        userId: applicant.user.id,
        type: "ORGANIZATION_APPROVED",
        resourceId: pendingOrgId
      }
    });
    expect(approvedNotification).not.toBeNull();

    const isolated = await request(app)
      .get(`/api/v1/organizations/${organizationId}/dashboard`)
      .set("Authorization", `Bearer ${applicant.accessToken}`);
    expect(isolated.status).toBe(403);
  });
});
