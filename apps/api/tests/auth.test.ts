import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { env } from "../src/config/env.js";
import { JWT_AUDIENCE, JWT_ISSUER } from "../src/lib/tokens.js";
import {
  cleanupTestUsers,
  createRegisterPayload,
  createTestEmail,
  disconnectTestDatabase,
  TEST_PASSWORD
} from "./helpers/testData.js";

const app = createApp();

describe("Authentication", () => {
  beforeAll(async () => {
    await cleanupTestUsers();
  });

  afterEach(async () => {
    await cleanupTestUsers();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("registers and logs in successfully", async () => {
    const payload = createRegisterPayload({ firstName: "Jane", lastName: "Holder", role: "VERIFIER" });

    const registerResponse = await request(app).post("/api/v1/auth/register").send(payload);
    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.user).toMatchObject({
      email: payload.email,
      firstName: "Jane",
      lastName: "Holder",
      role: "VERIFIER"
    });
    expect(registerResponse.body.user).not.toHaveProperty("passwordHash");
    expect(registerResponse.body.accessToken).toEqual(expect.any(String));
    expect(registerResponse.body.refreshToken).toEqual(expect.any(String));

    const loginResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: payload.email, password: TEST_PASSWORD });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.user.email).toBe(payload.email);
    expect(loginResponse.body.accessToken).toEqual(expect.any(String));
    expect(loginResponse.body.refreshToken).toEqual(expect.any(String));
  });

  it("rejects duplicate email registration with 409", async () => {
    const payload = createRegisterPayload();

    const firstResponse = await request(app).post("/api/v1/auth/register").send(payload);
    expect(firstResponse.status).toBe(201);

    const duplicateResponse = await request(app).post("/api/v1/auth/register").send(payload);
    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body.error).toMatchObject({
      code: "EMAIL_ALREADY_EXISTS"
    });
  });

  it("rejects invalid registration passwords", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(createRegisterPayload({ password: "weak" }));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects prohibited role self-assignment during registration", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(createRegisterPayload({ role: "PLATFORM_ADMIN" }));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns generic invalid credentials for failed login", async () => {
    const unknownEmailResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: createTestEmail("missing"), password: TEST_PASSWORD });

    expect(unknownEmailResponse.status).toBe(401);
    expect(unknownEmailResponse.body.error).toMatchObject({
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password"
    });

    const payload = createRegisterPayload();
    await request(app).post("/api/v1/auth/register").send(payload);

    const wrongPasswordResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: payload.email, password: "WrongPass9!" });

    expect(wrongPasswordResponse.status).toBe(401);
    expect(wrongPasswordResponse.body.error).toMatchObject({
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password"
    });
  });

  it("returns the authenticated profile from GET /me", async () => {
    const payload = createRegisterPayload();
    const registerResponse = await request(app).post("/api/v1/auth/register").send(payload);

    const meResponse = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${registerResponse.body.accessToken}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.user).toMatchObject({
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName
    });
    expect(meResponse.body.user).not.toHaveProperty("passwordHash");
  });

  it("requires authentication for GET /me", async () => {
    const response = await request(app).get("/api/v1/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rotates refresh tokens on /refresh", async () => {
    const registerResponse = await request(app).post("/api/v1/auth/register").send(createRegisterPayload());
    const originalRefreshToken = registerResponse.body.refreshToken as string;

    const refreshResponse = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: originalRefreshToken });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.refreshToken).not.toBe(originalRefreshToken);

    const reuseResponse = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: originalRefreshToken });

    expect(reuseResponse.status).toBe(401);
    expect(reuseResponse.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("revokes refresh tokens on logout", async () => {
    const registerResponse = await request(app).post("/api/v1/auth/register").send(createRegisterPayload());
    const refreshToken = registerResponse.body.refreshToken as string;

    const logoutResponse = await request(app).post("/api/v1/auth/logout").send({ refreshToken });
    expect(logoutResponse.status).toBe(204);

    const refreshResponse = await request(app).post("/api/v1/auth/refresh").send({ refreshToken });
    expect(refreshResponse.status).toBe(401);
    expect(refreshResponse.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("revokes the refresh-token family when a revoked token is reused", async () => {
    const registerResponse = await request(app).post("/api/v1/auth/register").send(createRegisterPayload());
    const firstRefreshToken = registerResponse.body.refreshToken as string;

    const rotatedResponse = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: firstRefreshToken });

    expect(rotatedResponse.status).toBe(200);
    const secondRefreshToken = rotatedResponse.body.refreshToken as string;

    const reuseResponse = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: firstRefreshToken });

    expect(reuseResponse.status).toBe(401);

    const activeTokenResponse = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: secondRefreshToken });

    expect(activeTokenResponse.status).toBe(401);
    expect(activeTokenResponse.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("allows only one concurrent refresh rotation and revokes the token family", async () => {
    const registerResponse = await request(app).post("/api/v1/auth/register").send(createRegisterPayload());
    const refreshToken = registerResponse.body.refreshToken as string;

    const [firstResponse, secondResponse] = await Promise.all([
      request(app).post("/api/v1/auth/refresh").send({ refreshToken }),
      request(app).post("/api/v1/auth/refresh").send({ refreshToken })
    ]);

    const statuses = [firstResponse.status, secondResponse.status].sort((a, b) => a - b);
    expect(statuses).toEqual([200, 401]);

    const successResponse = firstResponse.status === 200 ? firstResponse : secondResponse;
    const failureResponse = firstResponse.status === 401 ? firstResponse : secondResponse;

    expect(failureResponse.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(successResponse.body.refreshToken).toEqual(expect.any(String));
    expect(successResponse.body.refreshToken).not.toBe(refreshToken);

    const originalReuseResponse = await request(app).post("/api/v1/auth/refresh").send({ refreshToken });
    expect(originalReuseResponse.status).toBe(401);
    expect(originalReuseResponse.body.error.code).toBe("INVALID_CREDENTIALS");

    const replacementReuseResponse = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: successResponse.body.refreshToken });

    expect(replacementReuseResponse.status).toBe(401);
    expect(replacementReuseResponse.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("handles concurrent duplicate registration safely", async () => {
    const sharedEmail = createTestEmail("concurrent-register");
    const payloads = [
      createRegisterPayload({ email: sharedEmail, firstName: "Alpha" }),
      createRegisterPayload({ email: sharedEmail.toUpperCase(), firstName: "Beta" })
    ];

    const [firstResponse, secondResponse] = await Promise.all([
      request(app).post("/api/v1/auth/register").send(payloads[0]),
      request(app).post("/api/v1/auth/register").send(payloads[1])
    ]);

    const statuses = [firstResponse.status, secondResponse.status];
    expect(statuses).toContain(201);
    expect(statuses).toContain(409);
    expect(statuses.every((status) => status !== 500)).toBe(true);

    const conflictResponse = firstResponse.status === 409 ? firstResponse : secondResponse;
    expect(conflictResponse.body.error).toMatchObject({
      code: "EMAIL_ALREADY_EXISTS"
    });
  });

  it("rejects access tokens with invalid issuer or audience", async () => {
    const payload = createRegisterPayload();
    const registerResponse = await request(app).post("/api/v1/auth/register").send(payload);
    const tokenPayload = {
      sub: registerResponse.body.user.id as string,
      email: payload.email,
      role: registerResponse.body.user.role as string
    };

    const invalidIssuerToken = jwt.sign(tokenPayload, env.JWT_ACCESS_SECRET, {
      expiresIn: "15m",
      algorithm: "HS256",
      issuer: "wrong-issuer",
      audience: JWT_AUDIENCE
    });

    const invalidIssuerResponse = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${invalidIssuerToken}`);

    expect(invalidIssuerResponse.status).toBe(401);
    expect(invalidIssuerResponse.body.error.code).toBe("UNAUTHORIZED");

    const invalidAudienceToken = jwt.sign(tokenPayload, env.JWT_ACCESS_SECRET, {
      expiresIn: "15m",
      algorithm: "HS256",
      issuer: JWT_ISSUER,
      audience: "wrong-audience"
    });

    const invalidAudienceResponse = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${invalidAudienceToken}`);

    expect(invalidAudienceResponse.status).toBe(401);
    expect(invalidAudienceResponse.body.error.code).toBe("UNAUTHORIZED");
  });
});
