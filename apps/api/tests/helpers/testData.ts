import { randomUUID } from "node:crypto";
import { OrganizationRole, PlatformRole, Prisma, type User } from "@prisma/client";
import type { Express } from "express";
import request from "supertest";
import { joinNames } from "../../src/lib/names.js";
import { prisma } from "../../src/lib/prisma.js";
import { createAccessToken } from "../../src/lib/tokens.js";
import { clearMemoryStorage } from "../../src/services/storage/index.js";

export const TEST_PASSWORD = "TestPass1!";
export const TEST_PASSWORD_HASH =
  "$2b$12$lbemTRvb0SVepz7u4tc.Purr4dd3RXw9iOajEAtfN6XuZvhvja.m6";
export const TEST_EMAIL_DOMAIN = "example.test";
export const TEST_ORG_SLUG_PREFIX = "test-org";

const testUserEmailFilter = {
  endsWith: `@${TEST_EMAIL_DOMAIN}`
};

const testUserRelationFilter = {
  email: testUserEmailFilter
};

const testOrganizationFilter = {
  slug: {
    startsWith: TEST_ORG_SLUG_PREFIX
  }
};

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

export interface TestUserSession {
  user: User;
  accessToken: string;
  payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: PlatformRole;
  };
}

export async function createTestUser(
  overrides: {
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: PlatformRole;
  } = {}
): Promise<TestUserSession> {
  const email = overrides.email ?? createTestEmail("user");
  const firstName = overrides.firstName ?? "Test";
  const lastName = overrides.lastName ?? "User";
  const role = overrides.role ?? PlatformRole.HOLDER;

  const names = joinNames(firstName, lastName);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: TEST_PASSWORD_HASH,
      firstName: names.firstName,
      lastName: names.lastName,
      fullName: names.fullName,
      role
    }
  });

  return {
    user,
    accessToken: createAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role
    }),
    payload: {
      email,
      password: TEST_PASSWORD,
      firstName,
      lastName,
      role
    }
  };
}

async function cleanupVerificationGraphForUsers() {
  await prisma.fraudAlert.deleteMany({
    where: {
      OR: [
        { actor: testUserRelationFilter },
        { resolvedBy: testUserRelationFilter },
        { credential: { holder: testUserRelationFilter } },
        { credential: { issuedBy: testUserRelationFilter } },
        { verificationEvent: { verifier: testUserRelationFilter } }
      ]
    }
  });

  await prisma.notification.deleteMany({
    where: { user: testUserRelationFilter }
  });

  await prisma.verificationEvent.deleteMany({
    where: {
      OR: [
        { verifier: testUserRelationFilter },
        { credential: { holder: testUserRelationFilter } },
        { credential: { issuedBy: testUserRelationFilter } },
        { shareLink: { createdBy: testUserRelationFilter } }
      ]
    }
  });

  await prisma.verificationUpload.deleteMany({
    where: { verifier: testUserRelationFilter }
  });

  await prisma.personalDocument.deleteMany({
    where: { holder: testUserRelationFilter }
  });

  await prisma.credentialArtifact.deleteMany({
    where: {
      OR: [
        { uploadedBy: testUserRelationFilter },
        { credential: { holder: testUserRelationFilter } },
        { credential: { issuedBy: testUserRelationFilter } }
      ]
    }
  });

  await prisma.verificationRequest.deleteMany({
    where: {
      OR: [
        { requestedBy: testUserRelationFilter },
        { holder: testUserRelationFilter },
        { reviewedBy: testUserRelationFilter },
        { credential: { holder: testUserRelationFilter } },
        { credential: { issuedBy: testUserRelationFilter } }
      ]
    }
  });

  await prisma.savedOrganization.deleteMany({
    where: { verifier: testUserRelationFilter }
  });
}

async function cleanupTestUserDependencies() {
  await cleanupVerificationGraphForUsers();

  await prisma.shareLink.deleteMany({
    where: {
      OR: [
        { createdBy: testUserRelationFilter },
        { revokedBy: testUserRelationFilter },
        { credential: { holder: testUserRelationFilter } },
        { credential: { issuedBy: testUserRelationFilter } },
        { credential: { revokedBy: testUserRelationFilter } }
      ]
    }
  });

  await prisma.credential.deleteMany({
    where: {
      OR: [
        { holder: testUserRelationFilter },
        { issuedBy: testUserRelationFilter },
        { revokedBy: testUserRelationFilter }
      ]
    }
  });

  await prisma.organizationInvitation.deleteMany({
    where: {
      OR: [
        { email: testUserEmailFilter },
        { invitedBy: testUserRelationFilter },
        { acceptedBy: testUserRelationFilter },
        { revokedBy: testUserRelationFilter }
      ]
    }
  });

  await prisma.recipientInvitation.deleteMany({
    where: {
      OR: [
        { email: testUserEmailFilter },
        { invitedBy: testUserRelationFilter },
        { acceptedBy: testUserRelationFilter },
        { revokedBy: testUserRelationFilter }
      ]
    }
  });

  await prisma.organizationRecipient.deleteMany({
    where: {
      user: testUserRelationFilter
    }
  });

  await prisma.organizationDocument.deleteMany({
    where: {
      OR: [
        { uploadedBy: testUserRelationFilter },
        { reviewedBy: testUserRelationFilter }
      ]
    }
  });

  await prisma.auditLog.deleteMany({
    where: {
      actor: testUserRelationFilter
    }
  });

  await prisma.organizationMember.deleteMany({
    where: {
      user: testUserRelationFilter
    }
  });
}

const organizationCleanupFilter = {
  OR: [
    testOrganizationFilter,
    // Organizations created via ORGANIZATION registration use slugified company names.
    { members: { some: { user: testUserRelationFilter } } },
    { contactEmail: testUserEmailFilter }
  ]
};

async function cleanupOrganizationsMatching(where: Prisma.OrganizationWhereInput) {
  await prisma.fraudAlert.deleteMany({
    where: {
      OR: [
        { credential: { organization: where } },
        { verificationEvent: { organization: where } }
      ]
    }
  });

  await prisma.verificationEvent.deleteMany({
    where: {
      OR: [
        { organization: where },
        { credential: { organization: where } }
      ]
    }
  });

  await prisma.credentialArtifact.deleteMany({
    where: {
      credential: { organization: where }
    }
  });

  await prisma.verificationRequest.deleteMany({
    where: {
      organization: where
    }
  });

  await prisma.savedOrganization.deleteMany({
    where: {
      organization: where
    }
  });

  await prisma.organizationDocument.deleteMany({
    where: {
      organization: where
    }
  });

  await prisma.organizationRecipient.deleteMany({
    where: {
      organization: where
    }
  });

  await prisma.recipientInvitation.deleteMany({
    where: {
      organization: where
    }
  });

  await prisma.shareLink.deleteMany({
    where: {
      credential: {
        organization: where
      }
    }
  });

  await prisma.credential.deleteMany({
    where: {
      organization: where
    }
  });

  await prisma.organizationInvitation.deleteMany({
    where: {
      organization: where
    }
  });

  await prisma.auditLog.deleteMany({
    where: {
      organization: where
    }
  });

  await prisma.organizationMember.deleteMany({
    where: {
      organization: where
    }
  });

  await prisma.organization.deleteMany({
    where
  });
}

export async function cleanupTestOrganizations() {
  await cleanupOrganizationsMatching(organizationCleanupFilter);

  // Registration tests can leave orphan PENDING orgs after their users are deleted
  // (members cascade away; contactEmail may not use @example.test).
  await cleanupOrganizationsMatching({
    OR: [{ members: { none: {} } }]
  });
}

export async function cleanupTestUsers() {
  await cleanupTestUserDependencies();

  await prisma.user.deleteMany({
    where: {
      email: testUserEmailFilter
    }
  });
}

export async function cleanupTestData() {
  clearMemoryStorage();

  // Public verify NOT_FOUND events / standalone fraud alerts have no user/org FKs.
  await prisma.fraudAlert.deleteMany({
    where: {
      OR: [
        {
          verificationEvent: {
            verifierId: null,
            credentialId: null,
            organizationId: null,
            shareLinkId: null
          }
        },
        {
          actorId: null,
          credentialId: null,
          verificationEventId: null
        }
      ]
    }
  });
  await prisma.verificationEvent.deleteMany({
    where: {
      verifierId: null,
      credentialId: null,
      organizationId: null,
      shareLinkId: null
    }
  });

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
  return createTestUser({
    email: createTestEmail("platform-admin"),
    firstName: "Platform",
    lastName: "Admin",
    role: PlatformRole.PLATFORM_ADMIN
  }).then((session) => session.user);
}

export async function createPlatformAdminSession(_app?: Express) {
  const session = await createTestUser({
    email: createTestEmail("platform-admin"),
    firstName: "Platform",
    lastName: "Admin",
    role: PlatformRole.PLATFORM_ADMIN
  });

  return {
    admin: session.user,
    accessToken: session.accessToken
  };
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
