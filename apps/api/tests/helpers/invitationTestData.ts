import type { Express } from "express";
import request from "supertest";
import { OrganizationRole } from "@prisma/client";
import {
  addOrganizationIssuer,
  setupVerifiedOrganization
} from "./credentialTestData.js";
import { createTestEmail, createTestUser, registerAndAuthenticate } from "./testData.js";

export async function createInvitationRequest(
  app: Express,
  organizationId: string,
  accessToken: string,
  overrides: Record<string, unknown> = {}
) {
  return request(app)
    .post(`/api/v1/organizations/${organizationId}/invitations`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      email: createTestEmail("invitee"),
      role: OrganizationRole.ORGANIZATION_ISSUER,
      ...overrides
    });
}

export async function listInvitationsRequest(app: Express, organizationId: string, accessToken: string) {
  return request(app)
    .get(`/api/v1/organizations/${organizationId}/invitations`)
    .set("Authorization", `Bearer ${accessToken}`);
}

export async function revokeInvitationRequest(
  app: Express,
  organizationId: string,
  invitationId: string,
  accessToken: string
) {
  return request(app)
    .patch(`/api/v1/organizations/${organizationId}/invitations/${invitationId}/revoke`)
    .set("Authorization", `Bearer ${accessToken}`);
}

export async function acceptInvitationRequest(app: Express, accessToken: string, token: string) {
  return request(app)
    .post("/api/v1/invitations/accept")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ token });
}

export async function updateMemberRoleRequest(
  app: Express,
  organizationId: string,
  userId: string,
  accessToken: string,
  role: OrganizationRole
) {
  return request(app)
    .patch(`/api/v1/organizations/${organizationId}/members/${userId}`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ role });
}

export async function removeMemberRequest(
  app: Express,
  organizationId: string,
  userId: string,
  accessToken: string
) {
  return request(app)
    .delete(`/api/v1/organizations/${organizationId}/members/${userId}`)
    .set("Authorization", `Bearer ${accessToken}`);
}

export async function setupVerifiedOrganizationWithIssuer(app: Express) {
  const base = await setupVerifiedOrganization(app);
  const issuer = await addOrganizationIssuer(base.organizationId, app);
  return { ...base, issuer };
}

export async function registerInvitee(_app: Express, email: string) {
  return createTestUser({
    email,
    firstName: "Invited",
    lastName: "Member"
  });
}

export { setupVerifiedOrganization, addOrganizationIssuer, createTestEmail, registerAndAuthenticate };
