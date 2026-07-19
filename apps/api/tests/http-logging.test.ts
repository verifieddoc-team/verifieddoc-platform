import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { sanitizeRequestParams, sanitizeRequestUrl } from "../src/lib/sanitize-request-url.js";

function createLogCaptureApp() {
  const logLines: string[] = [];
  const stream = {
    write(message: string) {
      logLines.push(message);
    }
  };

  return {
    app: createApp({ logStream: stream }),
    getLogs: () => logLines.join("")
  };
}

describe("sanitizeRequestUrl", () => {
  it("redacts verification tokens from API paths", () => {
    expect(sanitizeRequestUrl("/api/v1/verify/secret-token-value")).toBe("/api/v1/verify/[REDACTED]");
  });

  it("preserves query strings without exposing the token", () => {
    expect(sanitizeRequestUrl("/api/v1/verify/secret-token-value?source=qr")).toBe(
      "/api/v1/verify/[REDACTED]?source=qr"
    );
  });

  it("leaves non-verification routes unchanged", () => {
    expect(sanitizeRequestUrl("/api/v1/health")).toBe("/api/v1/health");
    expect(sanitizeRequestUrl("/api/v1/credentials?page=1")).toBe("/api/v1/credentials?page=1");
  });
});

describe("sanitizeRequestParams", () => {
  it("redacts token route params", () => {
    expect(sanitizeRequestParams({ token: "secret-token-value" })).toEqual({ token: "[REDACTED]" });
  });
});

describe("HTTP request logging", () => {
  it("does not log raw verification tokens", async () => {
    const { app, getLogs } = createLogCaptureApp();
    const rawToken = "fictional-verification-token-abc123xyz";

    await request(app).get(`/api/v1/verify/${rawToken}`);

    const logs = getLogs();
    expect(logs).not.toContain(rawToken);
    expect(logs).toContain("/api/v1/verify/[REDACTED]");
  });

  it("does not log authorization header values", async () => {
    const { app, getLogs } = createLogCaptureApp();
    const secretBearerToken = "Bearer fictional-access-token-987654";

    await request(app).get("/api/v1/credentials").set("Authorization", secretBearerToken);

    const logs = getLogs();
    expect(logs).not.toContain("fictional-access-token-987654");
    expect(logs).toContain("[REDACTED]");
  });

  it("keeps non-sensitive routes identifiable in logs", async () => {
    const { app, getLogs } = createLogCaptureApp();

    await request(app).get("/api/v1/health");

    const logs = getLogs();
    expect(logs).toContain("/api/v1/health");
    expect(logs).not.toContain("[REDACTED]");
  });
});
