import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { cleanupTestUsers, createRegisterPayload, disconnectTestDatabase } from "./helpers/testData.js";

const app = createApp();

describe("Profile updates", () => {
  beforeAll(async () => {
    await cleanupTestUsers();
  });

  afterEach(async () => {
    await cleanupTestUsers();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("updates firstName and lastName for the authenticated user", async () => {
    const payload = createRegisterPayload();
    const registerResponse = await request(app).post("/api/v1/auth/register").send(payload);

    const updateResponse = await request(app)
      .patch("/api/v1/auth/me")
      .set("Authorization", `Bearer ${registerResponse.body.accessToken}`)
      .send({ firstName: "Updated", lastName: "Name" });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.user).toMatchObject({
      email: payload.email,
      firstName: "Updated",
      lastName: "Name"
    });
    expect(updateResponse.body.user).not.toHaveProperty("passwordHash");
  });

  it("allows updating a single field", async () => {
    const payload = createRegisterPayload();
    const registerResponse = await request(app).post("/api/v1/auth/register").send(payload);

    const updateResponse = await request(app)
      .patch("/api/v1/auth/me")
      .set("Authorization", `Bearer ${registerResponse.body.accessToken}`)
      .send({ firstName: "OnlyFirst" });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.user).toMatchObject({
      firstName: "OnlyFirst",
      lastName: payload.lastName
    });
  });

  it("rejects an empty update body", async () => {
    const payload = createRegisterPayload();
    const registerResponse = await request(app).post("/api/v1/auth/register").send(payload);

    const updateResponse = await request(app)
      .patch("/api/v1/auth/me")
      .set("Authorization", `Bearer ${registerResponse.body.accessToken}`)
      .send({});

    expect(updateResponse.status).toBe(400);
    expect(updateResponse.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("requires authentication", async () => {
    const response = await request(app).patch("/api/v1/auth/me").send({ firstName: "Nope" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });
});
