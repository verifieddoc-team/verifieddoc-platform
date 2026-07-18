import type { PlatformRole } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";

export function requireRoles(...roles: PlatformRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, "UNAUTHORIZED", "Authentication required"));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, "FORBIDDEN", "Insufficient permissions"));
    }

    next();
  };
}
