import type { Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { getRouteParam } from "../../lib/route-params.js";
import {
  exportAdminReports,
  getAdminDashboard,
  getAdminFraudAlert,
  getAdminReportsSummary,
  getAdminUser,
  listAdminFraudAlerts,
  listAdminUsers,
  listAdminVerificationRequests,
  listAdminVerifications,
  updateAdminFraudAlertStatus,
  updateAdminUserStatus
} from "./admin.service.js";
import type {
  AdminFraudAlertStatusInput,
  AdminFraudAlertsQuery,
  AdminReportsExportQuery,
  AdminReportsQuery,
  AdminUserStatusInput,
  AdminUsersQuery,
  AdminVerificationRequestsQuery,
  AdminVerificationsQuery
} from "./admin.schemas.js";

function getAuditContext(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? undefined
  };
}

function getUserIdParam(req: Request): string {
  try {
    return getRouteParam(req.params.userId, "userId");
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", "User ID is required");
  }
}

function getAlertIdParam(req: Request): string {
  try {
    return getRouteParam(req.params.alertId, "alertId");
  } catch {
    throw new AppError(400, "VALIDATION_ERROR", "Alert ID is required");
  }
}

export async function getAdminDashboardHandler(_req: Request, res: Response) {
  const result = await getAdminDashboard();
  res.status(200).json(result);
}

export async function listAdminUsersHandler(req: Request, res: Response) {
  const result = await listAdminUsers(req.validatedQuery as AdminUsersQuery);
  res.status(200).json(result);
}

export async function getAdminUserHandler(req: Request, res: Response) {
  const user = await getAdminUser(getUserIdParam(req));
  res.status(200).json({ user });
}

export async function updateAdminUserStatusHandler(req: Request, res: Response) {
  const user = await updateAdminUserStatus(
    req.user!.id,
    getUserIdParam(req),
    req.body as AdminUserStatusInput,
    getAuditContext(req)
  );
  res.status(200).json({ user });
}

export async function listAdminVerificationsHandler(req: Request, res: Response) {
  const result = await listAdminVerifications(req.validatedQuery as AdminVerificationsQuery);
  res.status(200).json(result);
}

export async function listAdminVerificationRequestsHandler(req: Request, res: Response) {
  const result = await listAdminVerificationRequests(
    req.validatedQuery as AdminVerificationRequestsQuery
  );
  res.status(200).json(result);
}

export async function listAdminFraudAlertsHandler(req: Request, res: Response) {
  const result = await listAdminFraudAlerts(req.validatedQuery as AdminFraudAlertsQuery);
  res.status(200).json(result);
}

export async function getAdminFraudAlertHandler(req: Request, res: Response) {
  const alert = await getAdminFraudAlert(getAlertIdParam(req));
  res.status(200).json({ alert });
}

export async function updateAdminFraudAlertStatusHandler(req: Request, res: Response) {
  const alert = await updateAdminFraudAlertStatus(
    req.user!.id,
    getAlertIdParam(req),
    req.body as AdminFraudAlertStatusInput,
    getAuditContext(req)
  );
  res.status(200).json({ alert });
}

export async function getAdminReportsSummaryHandler(req: Request, res: Response) {
  const result = await getAdminReportsSummary(req.validatedQuery as AdminReportsQuery);
  res.status(200).json(result);
}

export async function exportAdminReportsHandler(req: Request, res: Response) {
  const result = await exportAdminReports(
    req.user!.id,
    req.validatedQuery as AdminReportsExportQuery,
    getAuditContext(req)
  );

  res.setHeader("Content-Type", result.contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
  res.status(200).send(result.body);
}
