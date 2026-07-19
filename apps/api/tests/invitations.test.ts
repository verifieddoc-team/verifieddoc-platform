import { randomUUID } from "node:crypto";
import { OrganizationRole, OrganizationStatus, PlatformRole } from "@prisma/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp, type CreateAppOptions } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { hashToken } from "../src/lib/tokens.js";
import {
  acceptInvitationRequest,
  addOrganizationIssuer,
  createInvitationRequest,
  createTestEmail,
  listInvitationsRequest,
  registerAndAuthenticate,
  registerInvitee,
  removeMemberRequest,
  revokeInvitationRequest,
  setupVerifiedOrganization,
  updateMemberRoleRequest
} from "./helpers/invitationTestData.js";
import {
  addOrganizationMember,
  applyForOrganization,
  cleanupTestData,
  disconnectTestDatabase
} from "./helpers/testData.js";
import { setOrganizationStatus as setOrgStatusFromCredentialHelper } from "./helpers/credentialTestData.js";

function createLogCaptureApp() {
  const logLines: string[] = [];
  const stream = {
    write(message: string) {
      logLines.push(message);
    }
  };

  return {
    app: createApp({ logStream: stream } satisfies CreateAppOptions),
    getLogs: () => logLines.join("")
  };
}

function expectNoInvitationSecrets(body: unknown, rawToken?: string) {
  const serialized = JSON.stringify(body);
  expect(serialized).not.toMatch(/tokenHash/i);
  expect(serialized).not.toMatch(/activeKey/i);
  if (rawToken) {
    expect(serialized).not.toContain(rawToken);
  }
}

const app = createApp();

describe("Organization invitations and member management", () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("allows organization admins to create issuer invitations", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const inviteeEmail = createTestEmail("issuer-invitee");

    const response = await createInvitationRequest(app, organizationId, admin.accessToken, {
      email: inviteeEmail,
      role: OrganizationRole.ORGANIZATION_ISSUER
    });

    expect(response.status).toBe(201);
    expect(response.body.invitation).toMatchObject({
      email: inviteeEmail,
      role: "ORGANIZATION_ISSUER",
      state: "PENDING"
    });
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.invitationPath).toBe(
      `/invitations/accept#token=${encodeURIComponent(response.body.token)}`
    );
    expect(response.body.invitationUrl).toContain("/invitations/accept#token=");
    expect(response.body.invitationUrl).not.toContain("?token=");
    expect(response.body.tokenHash).toBeUndefined();
    expect(response.body.invitation.tokenHash).toBeUndefined();
  });

  it("builds invitation URLs with a fragment instead of a query parameter", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const response = await createInvitationRequest(app, organizationId, admin.accessToken);
    const rawToken = response.body.token as string;

    expect(response.status).toBe(201);
    expect(response.body.invitationUrl).toBe(
      `http://localhost:3000/invitations/accept#token=${encodeURIComponent(rawToken)}`
    );
    expect(response.body.invitationUrl).not.toMatch(/\?token=/);
    expect(response.body.invitationPath).not.toMatch(/\?token=/);
  });

  it("accepts invitations through POST body after fragment URL generation", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const inviteeEmail = createTestEmail("fragment-accept");
    const createResponse = await createInvitationRequest(app, organizationId, admin.accessToken, {
      email: inviteeEmail
    });
    const invitee = await registerInvitee(app, inviteeEmail);
    const rawToken = createResponse.body.token as string;

    expect(createResponse.body.invitationUrl).toContain("#token=");

    const response = await acceptInvitationRequest(app, invitee.accessToken, rawToken);

    expect(response.status).toBe(200);
    expect(response.body.organizationId).toBe(organizationId);
  });

  it("allows organization admins to create admin invitations", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);

    const response = await createInvitationRequest(app, organizationId, admin.accessToken, {
      email: createTestEmail("admin-invitee"),
      role: OrganizationRole.ORGANIZATION_ADMIN
    });

    expect(response.status).toBe(201);
    expect(response.body.invitation.role).toBe("ORGANIZATION_ADMIN");
  });

  it("prevents organization issuers from creating invitations", async () => {
    const { organizationId } = await setupVerifiedOrganization(app);
    const issuer = await addOrganizationIssuer(organizationId, app);

    const response = await createInvitationRequest(app, organizationId, issuer.accessToken);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("prevents invitations from pending organizations", async () => {
    const admin = await registerAndAuthenticate(app);
    const { response: application } = await applyForOrganization(app, admin.accessToken);
    const organizationId = application.body.organization.id as string;

    const response = await createInvitationRequest(app, organizationId, admin.accessToken);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ORGANIZATION_NOT_VERIFIED");
  });

  it("prevents invitations from rejected organizations", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    await setOrgStatusFromCredentialHelper(organizationId, OrganizationStatus.REJECTED);

    const response = await createInvitationRequest(app, organizationId, admin.accessToken);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ORGANIZATION_NOT_VERIFIED");
  });

  it("prevents invitations from suspended organizations", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    await setOrgStatusFromCredentialHelper(organizationId, OrganizationStatus.SUSPENDED);

    const response = await createInvitationRequest(app, organizationId, admin.accessToken);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ORGANIZATION_NOT_VERIFIED");
  });

  it("rejects invitations for existing members", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const member = await registerAndAuthenticate(app);
    await addOrganizationMember(organizationId, member.user.id, OrganizationRole.ORGANIZATION_ISSUER);

    const response = await createInvitationRequest(app, organizationId, admin.accessToken, {
      email: member.payload.email
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("MEMBER_ALREADY_EXISTS");
  });

  it("handles concurrent duplicate invitations safely", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const inviteeEmail = createTestEmail("concurrent-invitee");

    const [firstResponse, secondResponse] = await Promise.all([
      createInvitationRequest(app, organizationId, admin.accessToken, { email: inviteeEmail }),
      createInvitationRequest(app, organizationId, admin.accessToken, { email: inviteeEmail })
    ]);

    const statuses = [firstResponse.status, secondResponse.status].sort();
    expect(statuses).toEqual([201, 409]);
  });

  it("stores only the SHA-256 hash of invitation tokens", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const response = await createInvitationRequest(app, organizationId, admin.accessToken);
    const rawToken = response.body.token as string;

    const stored = await prisma.organizationInvitation.findUnique({
      where: { id: response.body.invitation.id }
    });

    expect(stored?.tokenHash).toBe(hashToken(rawToken));
    expect(stored?.tokenHash).not.toBe(rawToken);
  });

  it("lists invitations without exposing token secrets", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const createResponse = await createInvitationRequest(app, organizationId, admin.accessToken);
    const rawToken = createResponse.body.token as string;

    const response = await listInvitationsRequest(app, organizationId, admin.accessToken);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expectNoInvitationSecrets(response.body, rawToken);
  });

  it("allows admins to revoke pending invitations", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const createResponse = await createInvitationRequest(app, organizationId, admin.accessToken);

    const response = await revokeInvitationRequest(
      app,
      organizationId,
      createResponse.body.invitation.id,
      admin.accessToken
    );

    expect(response.status).toBe(200);
    expect(response.body.invitation.state).toBe("REVOKED");
  });

  it("returns 409 when revoking an already revoked invitation", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const createResponse = await createInvitationRequest(app, organizationId, admin.accessToken);
    const invitationId = createResponse.body.invitation.id as string;

    await revokeInvitationRequest(app, organizationId, invitationId, admin.accessToken);
    const response = await revokeInvitationRequest(app, organizationId, invitationId, admin.accessToken);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("INVITATION_NOT_REVOCABLE");
  });

  it("handles concurrent invitation revocation safely", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const createResponse = await createInvitationRequest(app, organizationId, admin.accessToken);
    const invitationId = createResponse.body.invitation.id as string;

    const [firstResponse, secondResponse] = await Promise.all([
      revokeInvitationRequest(app, organizationId, invitationId, admin.accessToken),
      revokeInvitationRequest(app, organizationId, invitationId, admin.accessToken)
    ]);

    expect([firstResponse.status, secondResponse.status].sort()).toEqual([200, 409]);
  });

  it("allows the invited user to accept an invitation", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const inviteeEmail = createTestEmail("accept-invitee");
    const createResponse = await createInvitationRequest(app, organizationId, admin.accessToken, {
      email: inviteeEmail,
      role: OrganizationRole.ORGANIZATION_ISSUER
    });
    const invitee = await registerInvitee(app, inviteeEmail);

    const response = await acceptInvitationRequest(app, invitee.accessToken, createResponse.body.token);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      organizationId,
      membershipRole: "ORGANIZATION_ISSUER"
    });

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: invitee.user.id
        }
      }
    });
    expect(membership?.role).toBe(OrganizationRole.ORGANIZATION_ISSUER);
  });

  it("prevents acceptance when authenticated email does not match", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const inviteeEmail = createTestEmail("wrong-email-invitee");
    const createResponse = await createInvitationRequest(app, organizationId, admin.accessToken, {
      email: inviteeEmail
    });
    const otherUser = await registerAndAuthenticate(app);

    const response = await acceptInvitationRequest(app, otherUser.accessToken, createResponse.body.token);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("returns unavailable for unknown invitation tokens", async () => {
    const user = await registerAndAuthenticate(app);
    const response = await acceptInvitationRequest(app, user.accessToken, `unknown-${randomUUID()}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("INVITATION_UNAVAILABLE");
  });

  it("returns unavailable for expired invitations", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const inviteeEmail = createTestEmail("expired-invitee");
    const createResponse = await createInvitationRequest(app, organizationId, admin.accessToken, {
      email: inviteeEmail,
      expiresInHours: 1
    });

    await prisma.organizationInvitation.update({
      where: { id: createResponse.body.invitation.id },
      data: { expiresAt: new Date(Date.now() - 60_000) }
    });

    const invitee = await registerInvitee(app, inviteeEmail);
    const response = await acceptInvitationRequest(app, invitee.accessToken, createResponse.body.token);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("INVITATION_UNAVAILABLE");
  });

  it("returns unavailable for revoked invitations", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const inviteeEmail = createTestEmail("revoked-invitee");
    const createResponse = await createInvitationRequest(app, organizationId, admin.accessToken, {
      email: inviteeEmail
    });
    await revokeInvitationRequest(
      app,
      organizationId,
      createResponse.body.invitation.id,
      admin.accessToken
    );

    const invitee = await registerInvitee(app, inviteeEmail);
    const response = await acceptInvitationRequest(app, invitee.accessToken, createResponse.body.token);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("INVITATION_UNAVAILABLE");
  });

  it("returns unavailable for already accepted invitations", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const inviteeEmail = createTestEmail("accepted-invitee");
    const createResponse = await createInvitationRequest(app, organizationId, admin.accessToken, {
      email: inviteeEmail
    });
    const invitee = await registerInvitee(app, inviteeEmail);
    const rawToken = createResponse.body.token as string;

    await acceptInvitationRequest(app, invitee.accessToken, rawToken);
    const replayResponse = await acceptInvitationRequest(app, invitee.accessToken, rawToken);

    expect(replayResponse.status).toBe(404);
    expect(replayResponse.body.error.code).toBe("INVITATION_UNAVAILABLE");
  });

  it("allows exactly one success for concurrent acceptance", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const inviteeEmail = createTestEmail("concurrent-accept");
    const createResponse = await createInvitationRequest(app, organizationId, admin.accessToken, {
      email: inviteeEmail
    });
    const invitee = await registerInvitee(app, inviteeEmail);
    const rawToken = createResponse.body.token as string;

    const [firstResponse, secondResponse] = await Promise.all([
      acceptInvitationRequest(app, invitee.accessToken, rawToken),
      acceptInvitationRequest(app, invitee.accessToken, rawToken)
    ]);

    const successCount = [firstResponse, secondResponse].filter((response) => response.status === 200).length;
    expect(successCount).toBe(1);
  });

  it("does not change User.role when accepting an invitation", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const inviteeEmail = createTestEmail("platform-role-invitee");
    const createResponse = await createInvitationRequest(app, organizationId, admin.accessToken, {
      email: inviteeEmail,
      role: OrganizationRole.ORGANIZATION_ADMIN
    });
    const invitee = await registerInvitee(app, inviteeEmail);

    await acceptInvitationRequest(app, invitee.accessToken, createResponse.body.token);

    const refreshedUser = await prisma.user.findUniqueOrThrow({ where: { id: invitee.user.id } });
    expect(refreshedUser.role).toBe(PlatformRole.HOLDER);
  });

  it("assigns membership role from the invitation", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const inviteeEmail = createTestEmail("role-from-invitation");
    const createResponse = await createInvitationRequest(app, organizationId, admin.accessToken, {
      email: inviteeEmail,
      role: OrganizationRole.ORGANIZATION_ADMIN
    });
    const invitee = await registerInvitee(app, inviteeEmail);

    await acceptInvitationRequest(app, invitee.accessToken, createResponse.body.token);

    const membership = await prisma.organizationMember.findUniqueOrThrow({
      where: {
        organizationId_userId: {
          organizationId,
          userId: invitee.user.id
        }
      }
    });
    expect(membership.role).toBe(OrganizationRole.ORGANIZATION_ADMIN);
  });

  it("allows admins to change member roles", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const issuer = await addOrganizationIssuer(organizationId, app);

    const response = await updateMemberRoleRequest(
      app,
      organizationId,
      issuer.user.id,
      admin.accessToken,
      OrganizationRole.ORGANIZATION_ADMIN
    );

    expect(response.status).toBe(200);
    expect(response.body.member.membershipRole).toBe("ORGANIZATION_ADMIN");
  });

  it("prevents issuers from changing member roles", async () => {
    const { organizationId } = await setupVerifiedOrganization(app);
    const issuer = await addOrganizationIssuer(organizationId, app);
    const anotherIssuer = await addOrganizationIssuer(organizationId, app);

    const response = await updateMemberRoleRequest(
      app,
      organizationId,
      anotherIssuer.user.id,
      issuer.accessToken,
      OrganizationRole.ORGANIZATION_ADMIN
    );

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("prevents demoting the final organization admin", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);

    const response = await updateMemberRoleRequest(
      app,
      organizationId,
      admin.user.id,
      admin.accessToken,
      OrganizationRole.ORGANIZATION_ISSUER
    );

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("FINAL_ADMIN_REQUIRED");
  });

  it("prevents removing the final organization admin", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);

    const response = await removeMemberRequest(app, organizationId, admin.user.id, admin.accessToken);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("FINAL_ADMIN_REQUIRED");
  });

  it("keeps concurrent final-admin mutations safe", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const secondAdminEmail = createTestEmail("second-admin");
    const createResponse = await createInvitationRequest(app, organizationId, admin.accessToken, {
      email: secondAdminEmail,
      role: OrganizationRole.ORGANIZATION_ADMIN
    });
    const secondAdmin = await registerInvitee(app, secondAdminEmail);
    await acceptInvitationRequest(app, secondAdmin.accessToken, createResponse.body.token);

    const [firstResponse, secondResponse] = await Promise.all([
      updateMemberRoleRequest(
        app,
        organizationId,
        admin.user.id,
        admin.accessToken,
        OrganizationRole.ORGANIZATION_ISSUER
      ),
      updateMemberRoleRequest(
        app,
        organizationId,
        secondAdmin.user.id,
        secondAdmin.accessToken,
        OrganizationRole.ORGANIZATION_ISSUER
      )
    ]);

    const successCount = [firstResponse, secondResponse].filter((response) => response.status === 200).length;
    const blockedCount = [firstResponse, secondResponse].filter((response) => response.status === 409).length;
    expect(successCount).toBe(1);
    expect(blockedCount).toBe(1);

    const remainingAdmins = await prisma.organizationMember.count({
      where: { organizationId, role: OrganizationRole.ORGANIZATION_ADMIN }
    });
    expect(remainingAdmins).toBe(1);
  });

  it("removes members without deleting the user record", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const issuer = await addOrganizationIssuer(organizationId, app);

    const response = await removeMemberRequest(app, organizationId, issuer.user.id, admin.accessToken);

    expect(response.status).toBe(204);

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: issuer.user.id
        }
      }
    });
    expect(membership).toBeNull();

    const user = await prisma.user.findUnique({ where: { id: issuer.user.id } });
    expect(user).not.toBeNull();
  });

  it("forbids cross-organization invitation access", async () => {
    const firstOrg = await setupVerifiedOrganization(app);
    const secondOrg = await setupVerifiedOrganization(app);
    const createResponse = await createInvitationRequest(app, firstOrg.organizationId, firstOrg.admin.accessToken);

    const response = await revokeInvitationRequest(
      app,
      secondOrg.organizationId,
      createResponse.body.invitation.id,
      secondOrg.admin.accessToken
    );

    expect(response.status).toBe(404);
  });

  it("writes audit records for invitation lifecycle actions", async () => {
    const { admin, organizationId } = await setupVerifiedOrganization(app);
    const inviteeEmail = createTestEmail("audit-invitee");
    const createResponse = await createInvitationRequest(app, organizationId, admin.accessToken, {
      email: inviteeEmail
    });
    const invitee = await registerInvitee(app, inviteeEmail);
    const rawToken = createResponse.body.token as string;

    await acceptInvitationRequest(app, invitee.accessToken, rawToken);

    const createdAudit = await prisma.auditLog.findFirst({
      where: { action: "ORGANIZATION_INVITATION_CREATED", resourceId: createResponse.body.invitation.id }
    });
    const acceptedAudit = await prisma.auditLog.findFirst({
      where: { action: "ORGANIZATION_INVITATION_ACCEPTED", resourceId: createResponse.body.invitation.id }
    });

    expect(createdAudit).not.toBeNull();
    expect(acceptedAudit).not.toBeNull();
    expect(JSON.stringify(createdAudit?.details ?? {})).not.toContain(rawToken);
    expect(JSON.stringify(acceptedAudit?.details ?? {})).not.toMatch(/tokenHash/i);
  });

  it("does not place invitation tokens in captured logs during acceptance", async () => {
    const { app: loggingApp, getLogs } = createLogCaptureApp();
    const { admin, organizationId } = await setupVerifiedOrganization(loggingApp);
    const inviteeEmail = createTestEmail("logging-invitee");
    const createResponse = await createInvitationRequest(loggingApp, organizationId, admin.accessToken, {
      email: inviteeEmail
    });
    const invitee = await registerInvitee(loggingApp, inviteeEmail);
    const rawToken = createResponse.body.token as string;

    expect(createResponse.body.invitationUrl).not.toContain("?token=");

    await acceptInvitationRequest(loggingApp, invitee.accessToken, rawToken);

    const logs = getLogs();
    expect(logs).not.toContain(rawToken);
    expect(logs).not.toMatch(/tokenHash/i);
    expect(logs).not.toMatch(/\?token=/);
  });
});
