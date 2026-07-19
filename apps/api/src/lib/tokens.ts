import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import type { PlatformRole } from "@prisma/client";
import { env } from "../config/env.js";

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const JWT_ISSUER = "verifieddoc-api";
export const JWT_AUDIENCE = "verifieddoc-clients";

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: PlatformRole;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function generateShareToken(): string {
  return randomBytes(32).toString("base64url");
}

export function createAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
    algorithm: "HS256",
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const verified = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ["HS256"],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE
  });

  if (typeof verified === "string") {
    throw new Error("Invalid access token payload");
  }

  return verified as AccessTokenPayload;
}

export function getRefreshTokenExpiry(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
}
