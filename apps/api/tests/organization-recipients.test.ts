import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { hashToken } from "../src/lib/tokens.js";
import {
  addOrganizationIssuer,
  issueCredentialRequest,
  registerHolder,
  setupVerifiedOrganization
} from "./helpers/credentialTestData.js";
import {
  cleanupTestData,
  createTestEmail,
  createTestUser,
  disconnectTestDatabase
} from "./helpers/testData.js";

const app = createApp();

describe("Organization recipients and invitations", () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("creates, lists, accepts, and revokes recipient invitations without creating membership", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await createTestUser({
      email: createTestEmail("recipient"),
      firstName: "Recipient",
      lastName: "Holder"
    });

    const createResponse = await request(app)
      .post(`/api/v1/organizations/${organizationId}/recipient-invitations`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ email: holder.user.email });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.invitation.email).toBe(holder.user.email);
    expect(createResponse.body.token).toEqual(expect.any(String));
    expect(createResponse.body.invitationPath).toContain("/recipient-invitations/accept#token=");

    const stored = await prisma.recipientInvitation.findUnique({
      where: { id: createResponse.body.invitation.id }
    });
    expect(stored?.tokenHash).toBe(hashToken(createResponse.body.token));
    expect(stored?.activeKey).toBe(`${organizationId}:${holder.user.email}`);

    const listResponse = await request(app)
      .get(`/api/v1/organizations/${organizationId}/recipient-invitations`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);

    const acceptResponse = await request(app)
      .post("/api/v1/recipient-invitations/accept")
      .set("Authorization", `Bearer ${holder.accessToken}`)
      .send({ token: createResponse.body.token });

    expect(acceptResponse.status).toBe(200);
    expect(acceptResponse.body.organizationId).toBe(organizationId);
    expect(acceptResponse.body.recipientId).toEqual(expect.any(String));

    const recipient = await prisma.organizationRecipient.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: holder.user.id
        }
      }
    });
    expect(recipient).not.toBeNull();

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: holder.user.id
        }
      }
    });
    expect(membership).toBeNull();

    const recipientsResponse = await request(app)
      .get(`/api/v1/organizations/${organizationId}/recipients`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(recipientsResponse.status).toBe(200);
    expect(recipientsResponse.body.data).toHaveLength(1);
    expect(recipientsResponse.body.data[0].user.email).toBe(holder.user.email);
  });

  it("rejects accept when authenticated email does not match invitation", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const invited = await createTestUser({ email: createTestEmail("invited") });
    const other = await createTestUser({ email: createTestEmail("other") });

    const createResponse = await request(app)
      .post(`/api/v1/organizations/${organizationId}/recipient-invitations`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ email: invited.user.email });

    const acceptResponse = await request(app)
      .post("/api/v1/recipient-invitations/accept")
      .set("Authorization", `Bearer ${other.accessToken}`)
      .send({ token: createResponse.body.token });

    expect(acceptResponse.status).toBe(403);
    expect(acceptResponse.body.error.code).toBe("FORBIDDEN");
  });

  it("revokes pending invitations and rejects reuse", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await createTestUser({ email: createTestEmail("revoke-recipient") });

    const createResponse = await request(app)
      .post(`/api/v1/organizations/${organizationId}/recipient-invitations`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ email: holder.user.email });

    const revokeResponse = await request(app)
      .patch(
        `/api/v1/organizations/${organizationId}/recipient-invitations/${createResponse.body.invitation.id}/revoke`
      )
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(revokeResponse.status).toBe(200);
    expect(revokeResponse.body.invitation.state).toBe("REVOKED");

    const acceptResponse = await request(app)
      .post("/api/v1/recipient-invitations/accept")
      .set("Authorization", `Bearer ${holder.accessToken}`)
      .send({ token: createResponse.body.token });

    expect(acceptResponse.status).toBe(404);
    expect(acceptResponse.body.error.code).toBe("INVITATION_UNAVAILABLE");
  });

  it("enforces organization isolation for recipient listings", async () => {
    const first = await setupVerifiedOrganization(app);
    const second = await setupVerifiedOrganization(app);
    const holder = await createTestUser({ email: createTestEmail("iso-recipient") });

    await prisma.organizationRecipient.create({
      data: {
        organizationId: first.organizationId,
        userId: holder.user.id
      }
    });

    const crossResponse = await request(app)
      .get(`/api/v1/organizations/${first.organizationId}/recipients`)
      .set("Authorization", `Bearer ${second.admin.accessToken}`);

    expect(crossResponse.status).toBe(403);
    expect(crossResponse.body.error.code).toBe("FORBIDDEN");
  });

  it("allows issuers to manage recipients and upserts recipient on credential issue", async () => {
    const { organizationId } = await setupVerifiedOrganization(app);
    const issuer = await addOrganizationIssuer(organizationId, app);
    const holder = await registerHolder(app);

    const inviteResponse = await request(app)
      .post(`/api/v1/organizations/${organizationId}/recipient-invitations`)
      .set("Authorization", `Bearer ${issuer.accessToken}`)
      .send({ email: holder.user.email });

    expect(inviteResponse.status).toBe(201);

    const issueResponse = await issueCredentialRequest(app, organizationId, issuer.accessToken, {
      holderEmail: holder.user.email
    });
    expect(issueResponse.status).toBe(201);

    const recipient = await prisma.organizationRecipient.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: holder.user.id
        }
      }
    });
    expect(recipient).not.toBeNull();

    const notification = await prisma.notification.findFirst({
      where: {
        userId: holder.user.id,
        type: "CREDENTIAL_ISSUED",
        resourceId: issueResponse.body.credential.id
      }
    });
    expect(notification).not.toBeNull();

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: holder.user.id
        }
      }
    });
    expect(membership).toBeNull();
  });

  it("notifies holder on revoke and does not double-notify", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const holder = await registerHolder(app);

    const issueResponse = await issueCredentialRequest(app, organizationId, admin.accessToken, {
      holderEmail: holder.user.email
    });
    const credentialId = issueResponse.body.credential.id as string;

    const revokeResponse = await request(app)
      .patch(`/api/v1/organizations/${organizationId}/credentials/${credentialId}/revoke`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ reason: "Issued in error for test coverage" });

    expect(revokeResponse.status).toBe(200);

    const notifications = await prisma.notification.findMany({
      where: {
        userId: holder.user.id,
        type: "CREDENTIAL_REVOKED",
        resourceId: credentialId
      }
    });
    expect(notifications).toHaveLength(1);

    const secondRevoke = await request(app)
      .patch(`/api/v1/organizations/${organizationId}/credentials/${credentialId}/revoke`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ reason: "Issued in error for test coverage again" });

    expect(secondRevoke.status).toBe(409);

    const notificationsAfter = await prisma.notification.findMany({
      where: {
        userId: holder.user.id,
        type: "CREDENTIAL_REVOKED",
        resourceId: credentialId
      }
    });
    expect(notificationsAfter).toHaveLength(1);
  });

  it("prevents outsiders from listing recipients", async () => {
    const { organizationId } = await setupVerifiedOrganization(app);
    const outsider = await createTestUser();

    const response = await request(app)
      .get(`/api/v1/organizations/${organizationId}/recipients`)
      .set("Authorization", `Bearer ${outsider.accessToken}`);

    expect(response.status).toBe(403);
  });
});
