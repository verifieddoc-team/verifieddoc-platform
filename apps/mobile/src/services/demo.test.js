import { describe, expect, it } from "@jest/globals";
import { verifyDemoToken } from "./demo";

describe("mobile demo verification", () => {
  it("recognizes a token inside a verification URL", () => {
    expect(
      verifyDemoToken(
        "https://verifieddoc.example.test/verify/DEMO-VERIFIED-2026",
      )?.result,
    ).toBe("VALID");
  });

  it("keeps unknown tokens generic", () => {
    expect(verifyDemoToken("unknown-token")).toBeNull();
  });
});