import type { Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { getRouteParam } from "../../lib/route-params.js";
import { listOrganizationAuditLogs, listPlatformAuditLogs } from "./audit.service.js";
import type { OrganizationAuditLogQuery, PlatformAuditLogQuery } from "./audit.schemas.js";

function getOrganizationId(req: Request): string {
  try {
    return getRouteParam(req.params.organizationId, "organizationId");
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", "Organization ID is required");
  }
}

export async function listOrganizationAuditLogsHandler(req: Request, res: Response) {
  const result = await listOrganizationAuditLogs(
    getOrganizationId(req),
    req.validatedQuery as OrganizationAuditLogQuery
  );
  res.status(200).json(result);
}

export async function listPlatformAuditLogsHandler(req: Request, res: Response) {
  const result = await listPlatformAuditLogs(req.validatedQuery as PlatformAuditLogQuery);
  res.status(200).json(result);
}
