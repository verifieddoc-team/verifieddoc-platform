import type { Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { getRouteParam } from "../../lib/route-params.js";
import { removeOrganizationMember, updateOrganizationMemberRole } from "./member.service.js";

function getAuditContext(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? undefined
  };
}

function getOrganizationId(req: Request): string {
  try {
    return getRouteParam(req.params.organizationId, "organizationId");
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", "Organization ID is required");
  }
}

function getMemberUserId(req: Request): string {
  try {
    return getRouteParam(req.params.userId, "userId");
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", "User ID is required");
  }
}

export async function updateOrganizationMemberHandler(req: Request, res: Response) {
  const member = await updateOrganizationMemberRole(
    getOrganizationId(req),
    getMemberUserId(req),
    req.user!.id,
    req.body,
    getAuditContext(req)
  );
  res.status(200).json({ member });
}

export async function removeOrganizationMemberHandler(req: Request, res: Response) {
  await removeOrganizationMember(
    getOrganizationId(req),
    getMemberUserId(req),
    req.user!.id,
    getAuditContext(req)
  );
  res.status(204).send();
}
