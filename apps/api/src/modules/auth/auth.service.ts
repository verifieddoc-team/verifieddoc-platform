import { randomBytes, randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { OrganizationRole, OrganizationStatus, PlatformRole, UserStatus, type User } from "@prisma/client";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";
import { joinNames, splitFullName } from "../../lib/names.js";
import { normalizePhoneE164 } from "../../lib/phone.js";
import { isUniqueConstraintError } from "../../lib/prisma-errors.js";
import { prisma } from "../../lib/prisma.js";
import { slugifyOrganizationName, withSlugSuffix } from "../../lib/slugify.js";
import {
  createAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  hashPasswordResetSecret,
  hashToken,
  safeEqualHex
} from "../../lib/tokens.js";
import { toPublicUser, type PublicUser } from "../../lib/users.js";
import { getEmailService, isEmailDeliveryConfigured } from "../../services/email/index.js";
import type {
  ChangePasswordInput,
  LoginInput,
  LogoutInput,
  PasswordResetConfirmInput,
  PasswordResetRequestInput,
  PasswordResetVerifyInput,
  RefreshInput,
  RegisterInput,
  UpdateProfileInput
} from "./auth.schemas.js";

const BCRYPT_ROUNDS = 12;
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";
const MAX_SLUG_ATTEMPTS = 8;
const PASSWORD_RESET_OTP_TTL_MS = 10 * 60 * 1000;
const PASSWORD_RESET_TOKEN_TTL_SECONDS = 600;
const PASSWORD_RESET_MAX_ATTEMPTS = 5;

class RefreshTokenClaimError extends Error {
  constructor() {
    super("Refresh token claim failed");
    this.name = "RefreshTokenClaimError";
  }
}

export interface OrganizationRegistrationSummary {
  id: string;
  name: string;
  industry: string | null;
  status: OrganizationStatus;
  membershipRole: typeof OrganizationRole.ORGANIZATION_ADMIN;
}

export interface AuthSession {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  organization?: OrganizationRegistrationSummary;
}

interface SessionContext {
  userAgent?: string;
  ipAddress?: string;
}

function buildSession(
  user: User,
  refreshToken: string,
  organization?: OrganizationRegistrationSummary
): AuthSession {
  return {
    user: toPublicUser(user),
    accessToken: createAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role
    }),
    refreshToken,
    ...(organization ? { organization } : {})
  };
}

function assertUserMayAuthenticate(user: User) {
  if (user.status === UserStatus.SUSPENDED) {
    throw new AppError(401, "INVALID_CREDENTIALS", INVALID_CREDENTIALS_MESSAGE);
  }
}

async function revokeActiveRefreshTokens(userId: string) {
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });
}

async function createRefreshTokenRecord(userId: string, context: SessionContext) {
  const refreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId,
      expiresAt: getRefreshTokenExpiry(),
      userAgent: context.userAgent,
      ipAddress: context.ipAddress
    }
  });

  return refreshToken;
}

function resolveRegistrationNames(input: RegisterInput) {
  if ("fullName" in input && typeof input.fullName === "string") {
    return splitFullName(input.fullName);
  }

  if ("firstName" in input && "lastName" in input) {
    return joinNames(input.firstName, input.lastName);
  }

  throw new AppError(400, "VALIDATION_ERROR", "Provide fullName or firstName and lastName");
}

function resolvePlatformRole(input: RegisterInput): PlatformRole {
  if ("accountType" in input) {
    if (input.accountType === "ORGANIZATION") {
      return PlatformRole.HOLDER;
    }
    if (input.accountType === "VERIFIER") {
      return PlatformRole.VERIFIER;
    }
    return PlatformRole.HOLDER;
  }

  return input.role ?? PlatformRole.HOLDER;
}

async function ensurePhoneAvailable(phone: string | null) {
  if (!phone) {
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { phone },
    select: { id: true }
  });

  if (existing) {
    throw new AppError(409, "PHONE_ALREADY_EXISTS", "An account with this phone number already exists");
  }
}

async function registerOrganizationAccount(
  input: Extract<RegisterInput, { accountType: "ORGANIZATION" }>,
  names: ReturnType<typeof resolveRegistrationNames>,
  phone: string,
  passwordHash: string,
  context: SessionContext
): Promise<AuthSession> {
  const acceptedAt = new Date();
  const baseSlug = slugifyOrganizationName(input.companyName);
  const hrPhone = input.hrContact.phone ? normalizePhoneE164(input.hrContact.phone) : null;

  let created:
    | {
        user: User;
        organization: {
          id: string;
          name: string;
          industry: string | null;
          status: OrganizationStatus;
        };
      }
    | undefined;

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
    const slug = withSlugSuffix(baseSlug, attempt);

    try {
      created = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: input.email,
            passwordHash,
            fullName: names.fullName,
            firstName: names.firstName,
            lastName: names.lastName,
            phone,
            role: PlatformRole.HOLDER,
            termsAcceptedAt: acceptedAt,
            privacyAcceptedAt: acceptedAt,
            termsVersion: env.TERMS_VERSION,
            privacyVersion: env.PRIVACY_VERSION
          }
        });

        const organization = await tx.organization.create({
          data: {
            name: input.companyName,
            slug,
            contactEmail: input.hrContact.email,
            country: input.country,
            industry: input.industry,
            hrContactName: input.hrContact.fullName ?? null,
            hrContactEmail: input.hrContact.email,
            hrContactPhone: hrPhone,
            status: OrganizationStatus.PENDING
          }
        });

        await tx.organizationMember.create({
          data: {
            organizationId: organization.id,
            userId: user.id,
            role: OrganizationRole.ORGANIZATION_ADMIN
          }
        });

        await tx.auditLog.create({
          data: {
            actorId: user.id,
            organizationId: organization.id,
            action: "ORGANIZATION_REGISTERED",
            resourceType: "Organization",
            resourceId: organization.id,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            details: {
              industry: organization.industry,
              country: input.country
            }
          }
        });

        await tx.auditLog.create({
          data: {
            actorId: user.id,
            action: "USER_REGISTERED",
            resourceType: "User",
            resourceId: user.id,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            details: {
              accountType: "ORGANIZATION"
            }
          }
        });

        return { user, organization };
      });
      break;
    } catch (error) {
      if (isUniqueConstraintError(error, ["email"])) {
        throw new AppError(409, "EMAIL_ALREADY_EXISTS", "An account with this email already exists");
      }
      if (isUniqueConstraintError(error, ["phone"])) {
        throw new AppError(409, "PHONE_ALREADY_EXISTS", "An account with this phone number already exists");
      }
      if (isUniqueConstraintError(error, ["slug"])) {
        continue;
      }
      throw error;
    }
  }

  if (!created) {
    throw new AppError(
      409,
      "ORGANIZATION_SLUG_CONFLICT",
      "Unable to allocate a unique organization slug"
    );
  }

  const refreshToken = await createRefreshTokenRecord(created.user.id, context);
  return buildSession(created.user, refreshToken, {
    id: created.organization.id,
    name: created.organization.name,
    industry: created.organization.industry,
    status: created.organization.status,
    membershipRole: OrganizationRole.ORGANIZATION_ADMIN
  });
}

export async function registerUser(input: RegisterInput, context: SessionContext = {}): Promise<AuthSession> {
  const names = resolveRegistrationNames(input);
  const platformRole = resolvePlatformRole(input);
  const isCanonical = "accountType" in input;
  const phone =
    isCanonical && "phone" in input
      ? normalizePhoneE164(input.phone)
      : null;

  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true }
  });

  if (existingUser) {
    throw new AppError(409, "EMAIL_ALREADY_EXISTS", "An account with this email already exists");
  }

  await ensurePhoneAvailable(phone);

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  if (isCanonical && input.accountType === "ORGANIZATION") {
    return registerOrganizationAccount(input, names, phone!, passwordHash, context);
  }

  const acceptedAt = isCanonical ? new Date() : null;

  let user: User;
  try {
    user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: names.fullName,
        firstName: names.firstName,
        lastName: names.lastName,
        phone,
        role: platformRole,
        termsAcceptedAt: acceptedAt,
        privacyAcceptedAt: acceptedAt,
        termsVersion: acceptedAt ? env.TERMS_VERSION : null,
        privacyVersion: acceptedAt ? env.PRIVACY_VERSION : null
      }
    });
  } catch (error) {
    if (isUniqueConstraintError(error, ["email"])) {
      throw new AppError(409, "EMAIL_ALREADY_EXISTS", "An account with this email already exists");
    }
    if (isUniqueConstraintError(error, ["phone"])) {
      throw new AppError(409, "PHONE_ALREADY_EXISTS", "An account with this phone number already exists");
    }
    throw error;
  }

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "USER_REGISTERED",
      resourceType: "User",
      resourceId: user.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      details: {
        accountType: isCanonical ? input.accountType : platformRole
      }
    }
  });

  const refreshToken = await createRefreshTokenRecord(user.id, context);
  return buildSession(user, refreshToken);
}

export async function loginUser(input: LoginInput, context: SessionContext = {}): Promise<AuthSession> {
  const user = await prisma.user.findUnique({
    where: { email: input.email }
  });

  if (!user) {
    throw new AppError(401, "INVALID_CREDENTIALS", INVALID_CREDENTIALS_MESSAGE);
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError(401, "INVALID_CREDENTIALS", INVALID_CREDENTIALS_MESSAGE);
  }

  assertUserMayAuthenticate(user);

  const refreshToken = await createRefreshTokenRecord(user.id, context);
  return buildSession(user, refreshToken);
}

export async function refreshSession(input: RefreshInput, context: SessionContext = {}): Promise<AuthSession> {
  const tokenHash = hashToken(input.refreshToken);
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash }
  });

  if (!storedToken) {
    throw new AppError(401, "INVALID_CREDENTIALS", INVALID_CREDENTIALS_MESSAGE);
  }

  if (storedToken.revokedAt) {
    await revokeActiveRefreshTokens(storedToken.userId);
    throw new AppError(401, "INVALID_CREDENTIALS", INVALID_CREDENTIALS_MESSAGE);
  }

  if (storedToken.expiresAt <= new Date()) {
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() }
    });
    throw new AppError(401, "INVALID_CREDENTIALS", INVALID_CREDENTIALS_MESSAGE);
  }

  const user = await prisma.user.findUnique({
    where: { id: storedToken.userId }
  });

  if (!user) {
    throw new AppError(401, "INVALID_CREDENTIALS", INVALID_CREDENTIALS_MESSAGE);
  }

  assertUserMayAuthenticate(user);

  const nextRefreshToken = generateRefreshToken();
  const nextTokenHash = hashToken(nextRefreshToken);

  try {
    await prisma.$transaction(async (tx) => {
      const replacement = await tx.refreshToken.create({
        data: {
          tokenHash: nextTokenHash,
          userId: user.id,
          expiresAt: getRefreshTokenExpiry(),
          userAgent: context.userAgent,
          ipAddress: context.ipAddress
        }
      });

      const claimResult = await tx.refreshToken.updateMany({
        where: {
          id: storedToken.id,
          revokedAt: null
        },
        data: {
          revokedAt: new Date(),
          replacedByTokenId: replacement.id
        }
      });

      if (claimResult.count !== 1) {
        throw new RefreshTokenClaimError();
      }
    });
  } catch (error) {
    if (error instanceof RefreshTokenClaimError) {
      await revokeActiveRefreshTokens(storedToken.userId);
      throw new AppError(401, "INVALID_CREDENTIALS", INVALID_CREDENTIALS_MESSAGE);
    }

    throw error;
  }

  return buildSession(user, nextRefreshToken);
}

export async function logoutUser(input: LogoutInput): Promise<void> {
  const tokenHash = hashToken(input.refreshToken);
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    select: { id: true, revokedAt: true }
  });

  if (!storedToken || storedToken.revokedAt) {
    return;
  }

  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() }
  });
}

export async function getAuthenticatedUser(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  assertUserMayAuthenticate(user);
  return toPublicUser(user);
}

function generateOpaqueRequestId(): string {
  return randomBytes(16).toString("hex");
}

function generatePasswordResetOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function generatePasswordResetToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function requestPasswordReset(
  input: PasswordResetRequestInput,
  context: SessionContext = {}
): Promise<{ requestId: string }> {
  // Always return the same opaque shape so callers cannot distinguish account existence.
  const requestId = generateOpaqueRequestId();

  if (!env.PASSWORD_RESET_ENABLED) {
    return { requestId };
  }

  // Production without mail: fail closed for every request (no existence leak).
  if (env.NODE_ENV === "production" && !isEmailDeliveryConfigured()) {
    throw new AppError(
      503,
      "SERVICE_UNAVAILABLE",
      "Password reset is temporarily unavailable"
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: input.email }
  });

  if (!user || !isEmailDeliveryConfigured()) {
    return { requestId };
  }

  const otp = generatePasswordResetOtp();
  const otpHash = hashPasswordResetSecret(otp);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_OTP_TTL_MS);

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetChallenge.updateMany({
      where: {
        userId: user.id,
        usedAt: null
      },
      data: {
        lockedAt: new Date()
      }
    });

    await tx.passwordResetChallenge.create({
      data: {
        id: requestId,
        userId: user.id,
        otpHash,
        expiresAt,
        requestedIp: context.ipAddress,
        userAgent: context.userAgent
      }
    });
  });

  try {
    await getEmailService().sendPasswordResetOtp({
      to: user.email,
      otp,
      requestId
    });
  } catch {
    // Lock the challenge but still return a generic 202 so delivery failures
    // cannot be used to confirm that the email belongs to an account.
    await prisma.passwordResetChallenge.update({
      where: { id: requestId },
      data: { lockedAt: new Date() }
    });
    return { requestId };
  }

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "PASSWORD_RESET_REQUESTED",
      resourceType: "PasswordResetChallenge",
      resourceId: requestId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    }
  });

  return { requestId };
}

export async function verifyPasswordResetOtp(
  input: PasswordResetVerifyInput
): Promise<{ resetToken: string; expiresInSeconds: number }> {
  if (!env.PASSWORD_RESET_ENABLED) {
    throw new AppError(503, "SERVICE_UNAVAILABLE", "Password reset is temporarily unavailable");
  }

  const challenge = await prisma.passwordResetChallenge.findUnique({
    where: { id: input.requestId }
  });

  if (!challenge || challenge.usedAt || challenge.verifiedAt) {
    throw new AppError(400, "OTP_INVALID", "Invalid or expired verification code");
  }

  if (challenge.lockedAt) {
    throw new AppError(429, "OTP_LOCKED", "Too many invalid attempts for this reset request");
  }

  if (challenge.expiresAt <= new Date()) {
    throw new AppError(400, "OTP_EXPIRED", "Verification code has expired");
  }

  const otpHash = hashPasswordResetSecret(input.otp);
  if (!safeEqualHex(otpHash, challenge.otpHash)) {
    // Atomic increment + optional lock so concurrent guesses cannot bypass the attempt cap.
    const incremented = await prisma.passwordResetChallenge.updateMany({
      where: {
        id: challenge.id,
        usedAt: null,
        verifiedAt: null,
        lockedAt: null,
        attempts: { lt: PASSWORD_RESET_MAX_ATTEMPTS }
      },
      data: {
        attempts: { increment: 1 }
      }
    });

    if (incremented.count === 1) {
      await prisma.passwordResetChallenge.updateMany({
        where: {
          id: challenge.id,
          usedAt: null,
          verifiedAt: null,
          lockedAt: null,
          attempts: { gte: PASSWORD_RESET_MAX_ATTEMPTS }
        },
        data: {
          lockedAt: new Date()
        }
      });
    }

    const refreshed = await prisma.passwordResetChallenge.findUnique({
      where: { id: challenge.id },
      select: { lockedAt: true, attempts: true }
    });

    if (refreshed?.lockedAt || (refreshed?.attempts ?? 0) >= PASSWORD_RESET_MAX_ATTEMPTS) {
      throw new AppError(429, "OTP_LOCKED", "Too many invalid attempts for this reset request");
    }

    throw new AppError(400, "OTP_INVALID", "Invalid or expired verification code");
  }

  const resetToken = generatePasswordResetToken();
  const resetExpiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_SECONDS * 1000);
  const resetTokenHash = hashPasswordResetSecret(resetToken);

  const claimed = await prisma.passwordResetChallenge.updateMany({
    where: {
      id: challenge.id,
      usedAt: null,
      verifiedAt: null,
      lockedAt: null,
      expiresAt: { gt: new Date() }
    },
    data: {
      resetTokenHash,
      verifiedAt: new Date(),
      expiresAt: resetExpiresAt
    }
  });

  if (claimed.count !== 1) {
    throw new AppError(400, "OTP_INVALID", "Invalid or expired verification code");
  }

  return {
    resetToken,
    expiresInSeconds: PASSWORD_RESET_TOKEN_TTL_SECONDS
  };
}

export async function confirmPasswordReset(
  input: PasswordResetConfirmInput,
  context: SessionContext = {}
): Promise<void> {
  if (!env.PASSWORD_RESET_ENABLED) {
    throw new AppError(503, "SERVICE_UNAVAILABLE", "Password reset is temporarily unavailable");
  }

  const resetTokenHash = hashPasswordResetSecret(input.resetToken);
  const challenge = await prisma.passwordResetChallenge.findUnique({
    where: { resetTokenHash }
  });

  if (!challenge || !challenge.verifiedAt || challenge.usedAt || challenge.lockedAt) {
    throw new AppError(400, "RESET_TOKEN_INVALID", "Invalid or expired reset token");
  }

  if (challenge.expiresAt <= new Date()) {
    throw new AppError(400, "RESET_TOKEN_EXPIRED", "Reset token has expired");
  }

  const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    const claim = await tx.passwordResetChallenge.updateMany({
      where: {
        id: challenge.id,
        usedAt: null,
        lockedAt: null,
        verifiedAt: { not: null }
      },
      data: {
        usedAt: new Date()
      }
    });

    if (claim.count !== 1) {
      throw new AppError(400, "RESET_TOKEN_INVALID", "Invalid or expired reset token");
    }

    await tx.user.update({
      where: { id: challenge.userId },
      data: { passwordHash }
    });

    await tx.refreshToken.updateMany({
      where: {
        userId: challenge.userId,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: challenge.userId,
        action: "PASSWORD_RESET_COMPLETED",
        resourceType: "User",
        resourceId: challenge.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      }
    });
  });
}

function resolveProfileNames(input: UpdateProfileInput, current: User) {
  if (input.fullName !== undefined) {
    return splitFullName(input.fullName);
  }

  if (input.firstName !== undefined && input.lastName !== undefined) {
    return joinNames(input.firstName, input.lastName);
  }

  return {
    fullName: current.fullName || `${current.firstName} ${current.lastName}`.trim(),
    firstName: current.firstName,
    lastName: current.lastName
  };
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
  context: SessionContext = {}
): Promise<PublicUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  assertUserMayAuthenticate(user);

  const names = resolveProfileNames(input, user);
  const phone =
    input.phone !== undefined ? normalizePhoneE164(input.phone) : undefined;

  if (phone !== undefined && phone !== user.phone) {
    const existingPhone = await prisma.user.findUnique({
      where: { phone },
      select: { id: true }
    });

    if (existingPhone && existingPhone.id !== userId) {
      throw new AppError(409, "PHONE_ALREADY_EXISTS", "An account with this phone number already exists");
    }
  }

  let updated: User;
  try {
    updated = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: names.fullName,
        firstName: names.firstName,
        lastName: names.lastName,
        ...(phone !== undefined ? { phone } : {})
      }
    });
  } catch (error) {
    if (isUniqueConstraintError(error, ["phone"])) {
      throw new AppError(409, "PHONE_ALREADY_EXISTS", "An account with this phone number already exists");
    }
    throw error;
  }

  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: "PROFILE_UPDATED",
      resourceType: "User",
      resourceId: userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      details: {
        updatedFields: [
          ...(input.fullName !== undefined || input.firstName !== undefined ? ["name"] : []),
          ...(phone !== undefined ? ["phone"] : [])
        ]
      }
    }
  });

  return toPublicUser(updated);
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
  context: SessionContext = {}
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  assertUserMayAuthenticate(user);

  const currentMatches = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!currentMatches) {
    throw new AppError(401, "INVALID_CURRENT_PASSWORD", "Current password is incorrect");
  }

  const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash }
    });

    await tx.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "PASSWORD_CHANGED",
        resourceType: "User",
        resourceId: userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      }
    });
  });
}

export { revokeActiveRefreshTokens };
