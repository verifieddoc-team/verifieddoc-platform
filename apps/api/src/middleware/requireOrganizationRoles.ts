import { OrganizationRole } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { getRouteParam } from "../lib/route-params.js";

export function requireOrganizationRoles(...roles: OrganizationRole[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, "UNAUTHORIZED", "Authentication required"));
    }

    let organizationId: string;
    try {
      organizationId = getRouteParam(req.params.organizationId, "organizationId");
    } catch {
      return next(new AppError(400, "VALIDATION_ERROR", "Organization ID is required"));
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: req.user.id
        }
      }
    });

    if (!membership) {
      const organizationExists = await prisma.organization.count({
        where: { id: organizationId }
      });

      if (organizationExists === 0) {
        return next(new AppError(404, "NOT_FOUND", "Organization not found"));
      }

      return next(new AppError(403, "FORBIDDEN", "You do not have access to this organization"));
    }

    if (roles.length > 0 && !roles.includes(membership.role)) {
      return next(new AppError(403, "FORBIDDEN", "Insufficient organization permissions"));
    }

    req.organizationMembership = {
      organizationId,
      role: membership.role
    };
    next();
  };
}
