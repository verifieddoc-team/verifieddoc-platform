import { randomUUID } from "node:crypto";
import { prisma } from "../../src/lib/prisma.js";

export const TEST_PASSWORD = "TestPass1!";
export const TEST_EMAIL_DOMAIN = "example.test";

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

export async function cleanupTestUsers() {
  await prisma.user.deleteMany({
    where: {
      email: {
        endsWith: `@${TEST_EMAIL_DOMAIN}`
      }
    }
  });
}

export async function disconnectTestDatabase() {
  await prisma.$disconnect();
}
