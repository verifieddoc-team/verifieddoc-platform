import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
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

/** Peppered hash for password-reset OTP and reset tokens (uses PASSWORD_RESET_SECRET). */
export function hashPasswordResetSecret(value: string): string {
  return createHmac("sha256", env.PASSWORD_RESET_SECRET).update(value).digest("hex");
}

/** Peppered hash for signup email-verification OTPs (uses EMAIL_VERIFICATION_SECRET). */
export function hashEmailVerificationSecret(value: string): string {
  return createHmac("sha256", env.EMAIL_VERIFICATION_SECRET).update(value).digest("hex");
}

export function safeEqualHex(left: string, right: string): boolean {
  try {
    const leftBuf = Buffer.from(left, "hex");
    const rightBuf = Buffer.from(right, "hex");
    if (leftBuf.length === 0 || leftBuf.length !== rightBuf.length) {
      return false;
    }
    return timingSafeEqual(leftBuf, rightBuf);
  } catch {
    return false;
  }
}

export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function generateShareToken(): string {
  return randomBytes(32).toString("base64url");
}

export function generateInvitationToken(): string {
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
