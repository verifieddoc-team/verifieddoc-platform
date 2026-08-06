import { describe, expect, it } from "vitest";
import { readSanitizedUpstreamError, sanitizeProviderText } from "../src/lib/provider-errors.js";

describe("provider error sanitization", () => {
  it("sanitizes JSON, plain text, HTML, long messages, and secrets", async () => {
    expect(
      sanitizeProviderText("Bearer super-secret-key and eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb")
    ).toContain("[REDACTED]");

    expect(sanitizeProviderText("<html><body>Bucket not found</body></html>")).toBe("Bucket not found");

    expect(sanitizeProviderText("line1\nline2\r\nline3")).toBe("line1 line2 line3");

    const long = "x".repeat(500);
    const truncated = sanitizeProviderText(long, 240);
    expect(truncated?.endsWith("…")).toBe(true);
    expect(truncated?.length).toBe(241);

    expect(sanitizeProviderText({ nested: true })).toContain("nested");
    expect(sanitizeProviderText(undefined)).toBeUndefined();

    const jsonResponse = new Response(
      JSON.stringify({
        statusCode: 404,
        error: "Bucket not found",
        message: "Bucket not found\nwith detail"
      }),
      { status: 404 }
    );
    await expect(readSanitizedUpstreamError(jsonResponse)).resolves.toEqual({
      code: "Bucket not found",
      message: "Bucket not found with detail"
    });

    const htmlResponse = new Response("<!doctype html><h1>Unauthorized</h1>", { status: 401 });
    const htmlResult = await readSanitizedUpstreamError(htmlResponse);
    expect(htmlResult.message).toBe("Unauthorized");
    expect(htmlResult.message).not.toContain("<");
  });
});
