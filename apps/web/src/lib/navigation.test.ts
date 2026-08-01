import { describe, expect, it } from "vitest";
import { formatDate, routeForRole } from "./navigation";

describe("routeForRole", () => {
  it("routes every role to its own workspace", () => {
    expect(routeForRole("HOLDER")).toBe("/app/holder");
    expect(routeForRole("VERIFIER")).toBe("/app/verifier");
    expect(routeForRole("PLATFORM_ADMIN")).toBe("/app/admin");
    expect(routeForRole("ORGANIZATION_ADMIN")).toBe("/app/organization");
  });
});

describe("formatDate", () => {
  it("uses a safe label when no expiry is present", () => {
    expect(formatDate(null)).toBe("No expiry");
  });
});
