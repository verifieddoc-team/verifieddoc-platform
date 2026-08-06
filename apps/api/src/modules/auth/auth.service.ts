import { randomBytes, randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { OrganizationRole, OrganizationStatus, PlatformRole, UserStatus, type User } from "@prisma/client";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";
import { maskEmail } from "../../lib/mask-email.js";
import { joinNames, splitFullName } from "../../lib/names.js";
import { normalizePhoneE164 } from "../../lib/phone.js";
import { isUniqueConstraintError } from "../../lib/prisma-errors.js";
import { prisma } from "../../lib/prisma.js";
import { slugifyOrganizationName, withSlugSuffix } from "../../lib/slugify.js";
import {
  createAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  hashEmailVerificationSecret,
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
  ResendEmailVerificationInput,
  UpdateProfileInput,
  VerifyEmailInput
} from "./auth.schemas.js";

const BCRYPT_ROUNDS = 12;
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";
const MAX_SLUG_ATTEMPTS = 8;
const PASSWORD_RESET_OTP_TTL_MS = 10 * 60 * 1000;
const PASSWORD_RESET_TOKEN_TTL_SECONDS = 600;
const PASSWORD_RESET_MAX_ATTEMPTS = 5;

/** In-process resend rate limit by normalized email (complements IP limiter). */
const emailVerificationResendByEmail = new Map<string, number>();

/** Test helper: clear in-process email resend rate limits. */
export function clearEmailVerificationRateLimitsForTests() {
  emailVerificationResendByEmail.clear();
}

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

export interface PendingEmailVerificationRegistrationResponse {
  verificationRequired: true;
  verificationRequestId: string;
  email: string;
  maskedEmail: string;
  expiresInSeconds: number;
  resendAvailableInSeconds: number;
}

export interface ResendEmailVerificationResponse {
  verificationRequestId: string;
  expiresInSeconds: number;
  resendAvailableInSeconds: number;
}

export type RegisterResult = AuthSession | PendingEmailVerificationRegistrationResponse;

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

function assertEmailVerifiedForLogin(user: User) {
  if (!env.EMAIL_VERIFICATION_ENABLED) {
    return;
  }

  if (user.emailVerifiedAt) {
    return;
  }

  throw new AppError(403, "EMAIL_NOT_VERIFIED", "Email verification is required", {
    verificationRequired: true,
    email: user.email,
    maskedEmail: maskEmail(user.email)
  });
}

function emailVerificationTtlMs() {
  return env.EMAIL_VERIFICATION_OTP_TTL_SECONDS * 1000;
}

function emailVerificationCooldownMs() {
  return env.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000;
}

function emailVerificationExpiresInSeconds() {
  return env.EMAIL_VERIFICATION_OTP_TTL_SECONDS;
}

function emailVerificationResendAvailableInSeconds() {
  return env.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS;
}

function throwEmailVerificationRequired(email: string): never {
  throw new AppError(
    409,
    "EMAIL_VERIFICATION_REQUIRED",
    "Email verification is required for this account",
    {
      verificationRequired: true,
      email,
      maskedEmail: maskEmail(email)
    }
  );
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

function generateOpaqueRequestId(): string {
  return randomBytes(16).toString("hex");
}

function generateSixDigitOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function buildPendingVerificationResponse(
  email: string,
  verificationRequestId: string
): PendingEmailVerificationRegistrationResponse {
  return {
    verificationRequired: true,
    verificationRequestId,
    email,
    maskedEmail: maskEmail(email),
    expiresInSeconds: emailVerificationExpiresInSeconds(),
    resendAvailableInSeconds: emailVerificationResendAvailableInSeconds()
  };
}

async function invalidateActiveEmailVerificationChallenges(userId: string, exceptId?: string) {
  await prisma.emailVerificationChallenge.updateMany({
    where: {
      userId,
      verifiedAt: null,
      invalidatedAt: null,
      ...(exceptId ? { id: { not: exceptId } } : {})
    },
    data: {
      invalidatedAt: new Date()
    }
  });
}

async function createEmailVerificationChallenge(
  user: User,
  context: SessionContext
): Promise<{ requestId: string; otp: string }> {
  const requestId = generateOpaqueRequestId();
  const otp = generateSixDigitOtp();
  const otpHash = hashEmailVerificationSecret(otp);
  const now = Date.now();
  const expiresAt = new Date(now + emailVerificationTtlMs());
  const resendAvailableAt = new Date(now + emailVerificationCooldownMs());

  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationChallenge.updateMany({
      where: {
        userId: user.id,
        verifiedAt: null,
        invalidatedAt: null
      },
      data: {
        invalidatedAt: new Date()
      }
    });

    await tx.emailVerificationChallenge.create({
      data: {
        id: requestId,
        userId: user.id,
        otpHash,
        expiresAt,
        resendAvailableAt,
        requestedIp: context.ipAddress,
        userAgent: context.userAgent
      }
    });
  });

  return { requestId, otp };
}

async function sendVerificationOtpOrFail(
  user: User,
  requestId: string,
  otp: string
): Promise<void> {
  try {
    await getEmailService().sendEmailVerificationOtp({
      to: user.email,
      otp,
      expiresInMinutes: Math.max(1, Math.ceil(env.EMAIL_VERIFICATION_OTP_TTL_SECONDS / 60)),
      requestId
    });
  } catch {
    await prisma.emailVerificationChallenge.update({
      where: { id: requestId },
      data: {
        lockedAt: new Date(),
        invalidatedAt: new Date()
      }
    });
    throw new AppError(
      503,
      "SERVICE_UNAVAILABLE",
      "Unable to send verification email"
    );
  }
}

async function issuePendingEmailVerification(
  user: User,
  context: SessionContext
): Promise<PendingEmailVerificationRegistrationResponse> {
  if (env.NODE_ENV === "production" && !isEmailDeliveryConfigured()) {
    throw new AppError(
      503,
      "SERVICE_UNAVAILABLE",
      "Email verification is temporarily unavailable"
    );
  }

  if (!isEmailDeliveryConfigured()) {
    throw new AppError(
      503,
      "SERVICE_UNAVAILABLE",
      "Email verification is temporarily unavailable"
    );
  }

  const { requestId, otp } = await createEmailVerificationChallenge(user, context);
  await sendVerificationOtpOrFail(user, requestId, otp);
  return buildPendingVerificationResponse(user.email, requestId);
}

async function loadOrganizationRegistrationSummary(
  userId: string
): Promise<OrganizationRegistrationSummary | undefined> {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
      role: OrganizationRole.ORGANIZATION_ADMIN
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          industry: true,
          status: true
        }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  if (!membership) {
    return undefined;
  }

  return {
    id: membership.organization.id,
    name: membership.organization.name,
    industry: membership.organization.industry,
    status: membership.organization.status,
    membershipRole: OrganizationRole.ORGANIZATION_ADMIN
  };
}

async function registerOrganizationAccount(
  input: Extract<RegisterInput, { accountType: "ORGANIZATION" }>,
  names: ReturnType<typeof resolveRegistrationNames>,
  phone: string,
  passwordHash: string,
  context: SessionContext,
  requireVerification: boolean
): Promise<RegisterResult> {
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
            emailVerifiedAt: requireVerification ? null : acceptedAt,
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
        const existing = await prisma.user.findUnique({
          where: { email: input.email },
          select: { emailVerifiedAt: true }
        });
        if (existing && !existing.emailVerifiedAt && env.EMAIL_VERIFICATION_ENABLED) {
          throwEmailVerificationRequired(input.email);
        }
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

  if (requireVerification) {
    return issuePendingEmailVerification(created.user, context);
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

export async function registerUser(
  input: RegisterInput,
  context: SessionContext = {}
): Promise<RegisterResult> {
  const names = resolveRegistrationNames(input);
  const platformRole = resolvePlatformRole(input);
  const isCanonical = "accountType" in input;
  const phone =
    isCanonical && "phone" in input
      ? normalizePhoneE164(input.phone)
      : null;
  const requireVerification = env.EMAIL_VERIFICATION_ENABLED;

  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, emailVerifiedAt: true }
  });

  if (existingUser) {
    if (!existingUser.emailVerifiedAt && requireVerification) {
      throwEmailVerificationRequired(input.email);
    }
    throw new AppError(409, "EMAIL_ALREADY_EXISTS", "An account with this email already exists");
  }

  await ensurePhoneAvailable(phone);

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  if (isCanonical && input.accountType === "ORGANIZATION") {
    return registerOrganizationAccount(input, names, phone!, passwordHash, context, requireVerification);
  }

  const acceptedAt = isCanonical ? new Date() : null;
  const verifiedAt = requireVerification ? null : new Date();

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
        emailVerifiedAt: verifiedAt,
        termsAcceptedAt: acceptedAt,
        privacyAcceptedAt: acceptedAt,
        termsVersion: acceptedAt ? env.TERMS_VERSION : null,
        privacyVersion: acceptedAt ? env.PRIVACY_VERSION : null
      }
    });
  } catch (error) {
    if (isUniqueConstraintError(error, ["email"])) {
      const existing = await prisma.user.findUnique({
        where: { email: input.email },
        select: { emailVerifiedAt: true }
      });
      if (existing && !existing.emailVerifiedAt && requireVerification) {
        throwEmailVerificationRequired(input.email);
      }
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

  if (requireVerification) {
    return issuePendingEmailVerification(user, context);
  }

  const refreshToken = await createRefreshTokenRecord(user.id, context);
  return buildSession(user, refreshToken);
}

export async function verifyEmailVerification(
  input: VerifyEmailInput,
  context: SessionContext = {}
): Promise<AuthSession> {
  if (!env.EMAIL_VERIFICATION_ENABLED) {
    throw new AppError(503, "SERVICE_UNAVAILABLE", "Email verification is temporarily unavailable");
  }

  const challenge = await prisma.emailVerificationChallenge.findUnique({
    where: { id: input.requestId },
    include: { user: true }
  });

  if (!challenge || challenge.invalidatedAt || challenge.verifiedAt) {
    throw new AppError(400, "OTP_INVALID", "Invalid or expired verification code");
  }

  if (challenge.lockedAt) {
    throw new AppError(429, "OTP_LOCKED", "Too many invalid attempts for this verification request");
  }

  if (challenge.expiresAt <= new Date()) {
    throw new AppError(400, "OTP_EXPIRED", "Verification code has expired");
  }

  if (challenge.user.status === UserStatus.SUSPENDED) {
    throw new AppError(401, "INVALID_CREDENTIALS", INVALID_CREDENTIALS_MESSAGE);
  }

  const otpHash = hashEmailVerificationSecret(input.otp);
  if (!safeEqualHex(otpHash, challenge.otpHash)) {
    const incremented = await prisma.emailVerificationChallenge.updateMany({
      where: {
        id: challenge.id,
        verifiedAt: null,
        invalidatedAt: null,
        lockedAt: null,
        attempts: { lt: env.EMAIL_VERIFICATION_MAX_ATTEMPTS }
      },
      data: {
        attempts: { increment: 1 }
      }
    });

    if (incremented.count === 1) {
      await prisma.emailVerificationChallenge.updateMany({
        where: {
          id: challenge.id,
          verifiedAt: null,
          invalidatedAt: null,
          lockedAt: null,
          attempts: { gte: env.EMAIL_VERIFICATION_MAX_ATTEMPTS }
        },
        data: {
          lockedAt: new Date()
        }
      });
    }

    const refreshed = await prisma.emailVerificationChallenge.findUnique({
      where: { id: challenge.id },
      select: { lockedAt: true, attempts: true }
    });

    if (
      refreshed?.lockedAt ||
      (refreshed?.attempts ?? 0) >= env.EMAIL_VERIFICATION_MAX_ATTEMPTS
    ) {
      throw new AppError(429, "OTP_LOCKED", "Too many invalid attempts for this verification request");
    }

    throw new AppError(400, "OTP_INVALID", "Invalid or expired verification code");
  }

  const verifiedAt = new Date();

  const claimed = await prisma.$transaction(async (tx) => {
    const claim = await tx.emailVerificationChallenge.updateMany({
      where: {
        id: challenge.id,
        verifiedAt: null,
        invalidatedAt: null,
        lockedAt: null,
        expiresAt: { gt: new Date() }
      },
      data: {
        verifiedAt
      }
    });

    if (claim.count !== 1) {
      return null;
    }

    const user = await tx.user.update({
      where: { id: challenge.userId },
      data: {
        emailVerifiedAt: verifiedAt
      }
    });

    await tx.emailVerificationChallenge.updateMany({
      where: {
        userId: challenge.userId,
        id: { not: challenge.id },
        verifiedAt: null,
        invalidatedAt: null
      },
      data: {
        invalidatedAt: verifiedAt
      }
    });

    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "EMAIL_VERIFIED",
        resourceType: "EmailVerificationChallenge",
        resourceId: challenge.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      }
    });

    return user;
  });

  if (!claimed) {
    throw new AppError(400, "OTP_INVALID", "Invalid or expired verification code");
  }

  const refreshToken = await createRefreshTokenRecord(claimed.id, context);
  const organization = await loadOrganizationRegistrationSummary(claimed.id);
  return buildSession(claimed, refreshToken, organization);
}

export async function resendEmailVerification(
  input: ResendEmailVerificationInput,
  context: SessionContext = {}
): Promise<ResendEmailVerificationResponse> {
  const genericRequestId = generateOpaqueRequestId();
  const genericResponse: ResendEmailVerificationResponse = {
    verificationRequestId: genericRequestId,
    expiresInSeconds: emailVerificationExpiresInSeconds(),
    resendAvailableInSeconds: emailVerificationResendAvailableInSeconds()
  };

  if (!env.EMAIL_VERIFICATION_ENABLED) {
    return genericResponse;
  }

  if (env.NODE_ENV === "production" && !isEmailDeliveryConfigured()) {
    throw new AppError(
      503,
      "SERVICE_UNAVAILABLE",
      "Email verification is temporarily unavailable"
    );
  }

  const nowMs = Date.now();
  const emailKey = input.email;
  const emailLimitedUntil = emailVerificationResendByEmail.get(emailKey) ?? 0;
  if (emailLimitedUntil > nowMs) {
    throw new AppError(429, "RATE_LIMITED", "Too many verification resend attempts, please try again later");
  }
  emailVerificationResendByEmail.set(
    emailKey,
    nowMs + emailVerificationCooldownMs()
  );

  const user = await prisma.user.findUnique({
    where: { email: input.email }
  });

  // Unknown, already verified, or suspended → generic response (no enumeration).
  if (!user || user.emailVerifiedAt || user.status === UserStatus.SUSPENDED || !isEmailDeliveryConfigured()) {
    return genericResponse;
  }

  const latestActive = await prisma.emailVerificationChallenge.findFirst({
    where: {
      userId: user.id,
      verifiedAt: null,
      invalidatedAt: null,
      lockedAt: null
    },
    orderBy: { createdAt: "desc" }
  });

  if (latestActive && latestActive.resendAvailableAt > new Date()) {
    const remainingMs = latestActive.resendAvailableAt.getTime() - Date.now();
    return {
      verificationRequestId: latestActive.id,
      expiresInSeconds: Math.max(
        0,
        Math.ceil((latestActive.expiresAt.getTime() - Date.now()) / 1000)
      ),
      resendAvailableInSeconds: Math.max(1, Math.ceil(remainingMs / 1000))
    };
  }

  const { requestId, otp } = await createEmailVerificationChallenge(user, context);

  try {
    await getEmailService().sendEmailVerificationOtp({
      to: user.email,
      otp,
      expiresInMinutes: Math.max(1, Math.ceil(env.EMAIL_VERIFICATION_OTP_TTL_SECONDS / 60)),
      requestId
    });
  } catch {
    await prisma.emailVerificationChallenge.update({
      where: { id: requestId },
      data: {
        lockedAt: new Date(),
        invalidatedAt: new Date()
      }
    });
    // Still return generic shape to avoid leaking delivery/account state.
    return {
      verificationRequestId: requestId,
      expiresInSeconds: emailVerificationExpiresInSeconds(),
      resendAvailableInSeconds: emailVerificationResendAvailableInSeconds()
    };
  }

  return {
    verificationRequestId: requestId,
    expiresInSeconds: emailVerificationExpiresInSeconds(),
    resendAvailableInSeconds: emailVerificationResendAvailableInSeconds()
  };
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
  assertEmailVerifiedForLogin(user);

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
  assertEmailVerifiedForLogin(user);

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

export { revokeActiveRefreshTokens, invalidateActiveEmailVerificationChallenges };
