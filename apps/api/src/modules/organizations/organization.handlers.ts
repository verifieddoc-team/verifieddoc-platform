import type { Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { getRouteParam } from "../../lib/route-params.js";
import {
  applyForOrganization,
  getOrganizationForMember,
  listOrganizationMembers,
  listOrganizationsForAdmin,
  listOrganizationsForUser,
  reviewOrganization
} from "./organization.service.js";
import type { AdminOrganizationListQuery } from "./organization.schemas.js";

function getOrganizationId(req: Request): string {
  try {
    return getRouteParam(req.params.organizationId, "organizationId");
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", "Organization ID is required");
  }
}
function getAuditContext(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? undefined
  };
}

export async function applyOrganizationHandler(req: Request, res: Response) {
  const result = await applyForOrganization(req.user!.id, req.body);
  res.status(201).json(result);
}

export async function listMyOrganizationsHandler(req: Request, res: Response) {
  const organizations = await listOrganizationsForUser(req.user!.id);
  res.status(200).json({ organizations });
}

export async function getOrganizationHandler(req: Request, res: Response) {
  const result = await getOrganizationForMember(req.user!.id, getOrganizationId(req));
  res.status(200).json(result);
}

export async function listOrganizationMembersHandler(req: Request, res: Response) {
  const members = await listOrganizationMembers(getOrganizationId(req));
  res.status(200).json({ members });
}

export async function adminListOrganizationsHandler(req: Request, res: Response) {
  const result = await listOrganizationsForAdmin(req.validatedQuery as AdminOrganizationListQuery);
  res.status(200).json(result);
}

export async function reviewOrganizationHandler(req: Request, res: Response) {
  const organization = await reviewOrganization(
    getOrganizationId(req),
    req.user!.id,
    req.body,
    getAuditContext(req)
  );
  res.status(200).json({ organization });
}
