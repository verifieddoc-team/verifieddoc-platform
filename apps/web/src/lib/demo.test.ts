import { describe, expect, it } from "vitest";
import { verifyDemoToken } from "./demo";

describe("verifyDemoToken", () => {
  it("accepts the fictional demonstration token", () => {
    expect(verifyDemoToken(" demo-verified-2026 ")?.result).toBe("VALID");
  });

  it("returns no detail for unknown tokens", () => {
    expect(verifyDemoToken("unknown")).toBeNull();
  });
});
