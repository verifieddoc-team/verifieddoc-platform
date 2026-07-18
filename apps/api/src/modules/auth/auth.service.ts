import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import { AppError } from "../../lib/errors.js";
import { isUniqueConstraintError } from "../../lib/prisma-errors.js";
import { prisma } from "../../lib/prisma.js";
import {
  createAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  hashToken
} from "../../lib/tokens.js";
import { toPublicUser, type PublicUser } from "../../lib/users.js";
import type { LoginInput, LogoutInput, RefreshInput, RegisterInput } from "./auth.schemas.js";

const BCRYPT_ROUNDS = 12;
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";

class RefreshTokenClaimError extends Error {
  constructor() {
    super("Refresh token claim failed");
    this.name = "RefreshTokenClaimError";
  }
}

export interface AuthSession {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

interface SessionContext {
  userAgent?: string;
  ipAddress?: string;
}

function buildSession(user: User, refreshToken: string): AuthSession {
  return {
    user: toPublicUser(user),
    accessToken: createAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role
    }),
    refreshToken
  };
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

export async function registerUser(input: RegisterInput, context: SessionContext = {}): Promise<AuthSession> {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true }
  });

  if (existingUser) {
    throw new AppError(409, "EMAIL_ALREADY_EXISTS", "An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  let user: User;
  try {
    user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role
      }
    });
  } catch (error) {
    if (isUniqueConstraintError(error, ["email"])) {
      throw new AppError(409, "EMAIL_ALREADY_EXISTS", "An account with this email already exists");
    }

    throw error;
  }

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

  return toPublicUser(user);
}
