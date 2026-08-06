import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { openApiDocument } from "../src/openapi.js";

/** Critical new/extended endpoints that must remain documented. */
const REQUIRED_OPENAPI_PATHS = [
  "/auth/register",
  "/auth/password-reset/request",
  "/auth/password-reset/verify",
  "/auth/password-reset/confirm",
  "/auth/email-verification/verify",
  "/auth/email-verification/resend",
  "/meta/industries",
  "/auth/me",
  "/holder/dashboard",
  "/holder/activity",
  "/holder/verification-requests",
  "/holder/documents",
  "/holder/documents/upload-url",
  "/holder/documents/{documentId}/complete",
  "/holder/documents/{documentId}",
  "/verifier/dashboard",
  "/verifier/verifications",
  "/verifier/verifications/{verificationId}",
  "/verifier/saved-organizations",
  "/verifier/saved-organizations/{organizationId}",
  "/verifier/verification-requests",
  "/verifier/verification-requests/{requestId}",
  "/verifier/verification-requests/{requestId}/cancel",
  "/verifier/file-verifications/upload-url",
  "/verifier/file-verifications/{uploadId}/complete",
  "/verify/{token}",
  "/recipient-invitations/accept",
  "/organizations/{organizationId}/dashboard",
  "/organizations/{organizationId}/recipients",
  "/organizations/{organizationId}/recipient-invitations",
  "/organizations/{organizationId}/verification-requests",
  "/organizations/{organizationId}/registration-documents",
  "/admin/dashboard",
  "/admin/users",
  "/admin/fraud-alerts",
  "/admin/reports/summary",
  "/admin/reports/export",
  "/notifications",
  "/notifications/read-all",
  "/notifications/{notificationId}/read"
];

describe("OpenAPI route coverage", () => {
  it("serves OpenAPI JSON that includes all critical Figma/PRD paths", async () => {
    const app = createApp();
    const response = await request(app).get("/openapi.json");
    expect(response.status).toBe(200);

    const paths = Object.keys(response.body.paths ?? {});
    for (const required of REQUIRED_OPENAPI_PATHS) {
      expect(paths).toContain(required);
    }

    // Source module and served document stay aligned.
    expect(Object.keys(openApiDocument.paths ?? {}).sort()).toEqual(paths.sort());
  });

  it("documents canonical verification-request create fields", () => {
    const body = openApiDocument.components?.schemas?.CreateVerificationRequestBody as {
      properties?: Record<string, unknown>;
    };
    expect(body?.properties).toHaveProperty("credentialPublicId");
    expect(body?.properties).toHaveProperty("note");
  });
});
