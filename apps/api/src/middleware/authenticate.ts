import { UserStatus } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { verifyAccessToken } from "../lib/tokens.js";

/**
 * Validates Bearer access tokens and rejects suspended accounts.
 * Status is loaded from the database so suspension takes effect before JWT expiry.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new AppError(401, "UNAUTHORIZED", "Authentication required"));
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return next(new AppError(401, "UNAUTHORIZED", "Authentication required"));
  }

  void (async () => {
    try {
      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          role: true,
          status: true
        }
      });

      if (!user || user.status === UserStatus.SUSPENDED) {
        return next(new AppError(401, "UNAUTHORIZED", "Invalid or expired access token"));
      }

      req.user = {
        id: user.id,
        email: user.email,
        role: user.role
      };
      next();
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }

      next(new AppError(401, "UNAUTHORIZED", "Invalid or expired access token"));
    }
  })();
}
