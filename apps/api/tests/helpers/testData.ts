import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { OrganizationRole, PlatformRole } from "@prisma/client";
import type { Express } from "express";
import request from "supertest";
import { prisma } from "../../src/lib/prisma.js";

export const TEST_PASSWORD = "TestPass1!";
export const TEST_EMAIL_DOMAIN = "example.test";
export const TEST_ORG_SLUG_PREFIX = "test-org";

export function createTestEmail(label = "user"): string {
  return `${label}.${randomUUID()}@${TEST_EMAIL_DOMAIN}`.toLowerCase();
}

export function createRegisterPayload(overrides: Record<string, unknown> = {}) {
  return {
    email: createTestEmail("register"),
    password: TEST_PASSWORD,
    firstName: "Test",
    lastName: "User",
    ...overrides
  };
}

export function createOrganizationPayload(overrides: Record<string, unknown> = {}) {
  const slugSuffix = randomUUID().slice(0, 8);

  return {
    name: `Northwind Training ${slugSuffix}`,
    slug: `${TEST_ORG_SLUG_PREFIX}-${slugSuffix}`,
    registrationNumber: `NW-${slugSuffix}`,
    website: "https://northwind.example.test",
    contactEmail: createTestEmail("org-contact"),
    country: "Canada",
    description: "Fictional vocational training provider for automated tests.",
    ...overrides
  };
}

export async function cleanupTestOrganizations() {
  await prisma.credential.deleteMany({
    where: {
      organization: {
        slug: {
          startsWith: TEST_ORG_SLUG_PREFIX
        }
      }
    }
  });

  await prisma.organization.deleteMany({
    where: {
      slug: {
        startsWith: TEST_ORG_SLUG_PREFIX
      }
    }
  });
}

export async function cleanupTestUsers() {
  await prisma.user.deleteMany({
    where: {
      email: {
        endsWith: `@${TEST_EMAIL_DOMAIN}`
      }
    }
  });
}

export async function cleanupTestData() {
  await cleanupTestOrganizations();
  await cleanupTestUsers();
}

export async function disconnectTestDatabase() {
  await prisma.$disconnect();
}

export async function registerAndAuthenticate(app: Express, overrides: Record<string, unknown> = {}) {
  const payload = createRegisterPayload(overrides);
  const response = await request(app).post("/api/v1/auth/register").send(payload);

  return {
    payload,
    user: response.body.user,
    accessToken: response.body.accessToken as string
  };
}

export async function loginAndGetAccessToken(app: Express, email: string, password = TEST_PASSWORD) {
  const response = await request(app).post("/api/v1/auth/login").send({ email, password });
  return response.body.accessToken as string;
}

export async function createPlatformAdmin() {
  const email = createTestEmail("platform-admin");
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);

  return prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: "Platform",
      lastName: "Admin",
      role: PlatformRole.PLATFORM_ADMIN
    }
  });
}

export async function createPlatformAdminSession(app: Express) {
  const admin = await createPlatformAdmin();
  const accessToken = await loginAndGetAccessToken(app, admin.email);

  return { admin, accessToken };
}

export async function applyForOrganization(app: Express, accessToken: string, overrides: Record<string, unknown> = {}) {
  const payload = createOrganizationPayload(overrides);
  const applicationResponse = await request(app)
    .post("/api/v1/organizations")
    .set("Authorization", `Bearer ${accessToken}`)
    .send(payload);

  return {
    payload,
    response: applicationResponse
  };
}

export async function addOrganizationMember(
  organizationId: string,
  userId: string,
  role: OrganizationRole
) {
  return prisma.organizationMember.create({
    data: {
      organizationId,
      userId,
      role
    }
  });
}
