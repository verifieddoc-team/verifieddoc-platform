import { VerificationRequestStatus } from "@prisma/client";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { setupVerifiedOrganization } from "./helpers/credentialTestData.js";
import {
  cleanupTestData,
  createRegisterPayload,
  disconnectTestDatabase,
  registerAndAuthenticate
} from "./helpers/testData.js";

const app = createApp();

describe("Tenant isolation security", () => {
  beforeAll(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("keeps holder documents and notifications isolated across holders", async () => {
    const holderA = await registerAndAuthenticate(app);
    const holderB = await registerAndAuthenticate(app);

    const upload = await request(app)
      .post("/api/v1/holder/documents/upload-url")
      .set("Authorization", `Bearer ${holderA.accessToken}`)
      .send({
        title: "Passport scan",
        documentType: "ID",
        originalFileName: "passport.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1200
      });
    expect(upload.status).toBe(201);

    const foreignDoc = await request(app)
      .get("/api/v1/holder/documents")
      .set("Authorization", `Bearer ${holderB.accessToken}`);
    expect(foreignDoc.status).toBe(200);
    expect(foreignDoc.body.data).toHaveLength(0);

    const foreignComplete = await request(app)
      .post(`/api/v1/holder/documents/${upload.body.documentId}/complete`)
      .set("Authorization", `Bearer ${holderB.accessToken}`)
      .send({ fileContent: "not-mine" });
    expect(foreignComplete.status).toBe(404);

    const notification = await prisma.notification.create({
      data: {
        userId: holderA.user.id,
        type: "GENERIC",
        title: "Private note",
        message: "Only holder A"
      }
    });

    const foreignRead = await request(app)
      .patch(`/api/v1/notifications/${notification.id}/read`)
      .set("Authorization", `Bearer ${holderB.accessToken}`);
    expect(foreignRead.status).toBe(404);
  });

  it("keeps verifier history and saved organizations isolated", async () => {
    const verifierA = await registerAndAuthenticate(app, createRegisterPayload({ role: "VERIFIER" }));
    const verifierB = await registerAndAuthenticate(app, createRegisterPayload({ role: "VERIFIER" }));
    const { organizationId } = await setupVerifiedOrganization(app);

    await request(app)
      .post("/api/v1/verifier/verifications")
      .set("Authorization", `Bearer ${verifierA.accessToken}`)
      .send({ method: "PUBLIC_ID", publicId: "does-not-exist" });

    const listB = await request(app)
      .get("/api/v1/verifier/verifications")
      .set("Authorization", `Bearer ${verifierB.accessToken}`);
    expect(listB.status).toBe(200);
    expect(listB.body.data).toHaveLength(0);

    const save = await request(app)
      .post("/api/v1/verifier/saved-organizations")
      .set("Authorization", `Bearer ${verifierA.accessToken}`)
      .send({ organizationId });
    expect(save.status).toBe(201);

    const savedB = await request(app)
      .get("/api/v1/verifier/saved-organizations")
      .set("Authorization", `Bearer ${verifierB.accessToken}`);
    expect(savedB.status).toBe(200);
    expect(savedB.body.data).toHaveLength(0);
  });

  it("prevents cross-organization verification request review and recipient access", async () => {
    const orgA = await setupVerifiedOrganization(app);
    const orgB = await setupVerifiedOrganization(app);
    const holder = await registerAndAuthenticate(app);

    const issue = await request(app)
      .post(`/api/v1/organizations/${orgA.organizationId}/credentials`)
      .set("Authorization", `Bearer ${orgA.admin.accessToken}`)
      .send({
        holderEmail: holder.user.email,
        title: "Degree",
        credentialType: "EDUCATION",
        referenceNo: `REF-${Date.now()}`,
        issuedAt: new Date().toISOString()
      });
    expect(issue.status).toBe(201);

    const verifier = await registerAndAuthenticate(app, createRegisterPayload({ role: "VERIFIER" }));
    const created = await request(app)
      .post("/api/v1/verifier/verification-requests")
      .set("Authorization", `Bearer ${verifier.accessToken}`)
      .send({
        credentialPublicId: issue.body.credential.publicId,
        note: "Please confirm"
      });
    expect(created.status).toBe(201);

    const foreignReview = await request(app)
      .patch(
        `/api/v1/organizations/${orgB.organizationId}/verification-requests/${created.body.request.id}/review`
      )
      .set("Authorization", `Bearer ${orgB.admin.accessToken}`)
      .send({ decision: "APPROVE", note: "Nope" });
    expect([403, 404]).toContain(foreignReview.status);

    const foreignRecipients = await request(app)
      .get(`/api/v1/organizations/${orgA.organizationId}/recipients`)
      .set("Authorization", `Bearer ${orgB.admin.accessToken}`);
    expect(foreignRecipients.status).toBe(403);

    const stillPending = await prisma.verificationRequest.findUniqueOrThrow({
      where: { id: created.body.request.id }
    });
    expect(stillPending.status).toBe(VerificationRequestStatus.PENDING);
  });
});
