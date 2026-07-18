import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import { verifyAccessToken } from "../lib/tokens.js";

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new AppError(401, "UNAUTHORIZED", "Authentication required"));
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return next(new AppError(401, "UNAUTHORIZED", "Authentication required"));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role
    };
    next();
  } catch {
    next(new AppError(401, "UNAUTHORIZED", "Invalid or expired access token"));
  }
}
