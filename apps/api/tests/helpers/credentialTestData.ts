import { randomUUID } from "node:crypto";
import { OrganizationRole, OrganizationStatus, PlatformRole } from "@prisma/client";
import type { Express } from "express";
import request from "supertest";
import { expect } from "vitest";
import { prisma } from "../../src/lib/prisma.js";
import { createAccessToken } from "../../src/lib/tokens.js";
import {
  addOrganizationMember,
  applyForOrganization,
  createPlatformAdminSession,
  createTestEmail,
  createTestUser
} from "./testData.js";

export function createIssueCredentialPayload(overrides: Record<string, unknown> = {}) {
  const suffix = randomUUID().slice(0, 8);

  return {
    holderEmail: createTestEmail("holder"),
    title: `Fictional Safety Certificate ${suffix}`,
    credentialType: "WORKPLACE_SAFETY",
    referenceNo: `NW-REF-${suffix}`,
    description: "Fictional credential issued for automated lifecycle tests.",
    issuedAt: new Date().toISOString(),
    ...overrides
  };
}

export async function setupVerifiedOrganization(app: Express) {
  const admin = await createTestUser({
    firstName: "Fictional",
    lastName: "Admin"
  });
  const { response } = await applyForOrganization(app, admin.accessToken);
  const organizationId = response.body.organization.id as string;
  const { accessToken: platformToken } = await createPlatformAdminSession(app);

  await request(app)
    .patch(`/api/v1/admin/organizations/${organizationId}/review`)
    .set("Authorization", `Bearer ${platformToken}`)
    .send({ decision: "APPROVE" });

  return {
    admin,
    organizationId,
    organization: response.body.organization
  };
}

export async function setOrganizationStatus(organizationId: string, status: OrganizationStatus) {
  await prisma.organization.update({
    where: { id: organizationId },
    data: { status }
  });
}

export async function issueCredentialRequest(
  app: Express,
  organizationId: string,
  accessToken: string,
  overrides: Record<string, unknown> = {}
) {
  return request(app)
    .post(`/api/v1/organizations/${organizationId}/credentials`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send(createIssueCredentialPayload(overrides));
}

export async function registerHolder(app: Express, overrides: Record<string, unknown> = {}) {
  return createTestUser({
    firstName: "Fictional",
    lastName: "Holder",
    email: typeof overrides.email === "string" ? overrides.email : undefined,
    role: typeof overrides.role === "string" ? (overrides.role as PlatformRole) : undefined
  });
}

export async function addOrganizationIssuer(organizationId: string, _app: Express) {
  const issuer = await createTestUser({ firstName: "Fictional", lastName: "Issuer" });
  await addOrganizationMember(organizationId, issuer.user.id, OrganizationRole.ORGANIZATION_ISSUER);

  return issuer;
}

export async function createGlobalPlatformAdminHolder(_app: Express) {
  const session = await createTestUser({ role: PlatformRole.HOLDER });
  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { role: PlatformRole.PLATFORM_ADMIN }
  });

  return {
    ...session,
    user,
    accessToken: createAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role
    })
  };
}

export function expectNoSensitiveAuthData(body: unknown) {
  const serialized = JSON.stringify(body);
  expect(serialized).not.toMatch(/passwordHash/i);
  expect(serialized).not.toMatch(/refreshToken/i);
}
