import { describe, expect, it } from "vitest";
import {
  formatDate,
  hasOrganizationWorkspaceAccess,
  routeForPlatformRole,
  routeForRole,
} from "./navigation";

describe("routeForRole", () => {
  it("routes every role to its own workspace", () => {
    expect(routeForRole("HOLDER")).toBe("/app/holder");
    expect(routeForRole("VERIFIER")).toBe("/app/verifier");
    expect(routeForRole("PLATFORM_ADMIN")).toBe("/app/admin");
    expect(routeForRole("ORGANIZATION_ADMIN")).toBe("/app/organization");
  });
});

describe("routeForPlatformRole", () => {
  it("never maps platform roles onto the organization workspace", () => {
    expect(routeForPlatformRole("HOLDER")).toBe("/app/holder");
    expect(routeForPlatformRole("VERIFIER")).toBe("/app/verifier");
    expect(routeForPlatformRole("PLATFORM_ADMIN")).toBe("/app/admin");
  });
});

describe("hasOrganizationWorkspaceAccess", () => {
  it("requires ORGANIZATION_ADMIN or ORGANIZATION_ISSUER membership roles", () => {
    expect(hasOrganizationWorkspaceAccess([])).toBe(false);
    expect(
      hasOrganizationWorkspaceAccess([
        {
          organization: {
            id: "org_1",
            name: "Example",
            slug: "example",
            registrationNumber: null,
            website: null,
            contactEmail: "ops@example.test",
            country: "ZA",
            description: null,
            status: "VERIFIED",
            rejectionReason: null,
            reviewedAt: null,
            createdAt: "2026-08-05T00:00:00.000Z",
            updatedAt: "2026-08-05T00:00:00.000Z",
          },
          membershipRole: "ORGANIZATION_ISSUER",
        },
      ]),
    ).toBe(true);
  });
});

describe("formatDate", () => {
  it("uses a safe label when no expiry is present", () => {
    expect(formatDate(null)).toBe("No expiry");
  });
});
