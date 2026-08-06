import { PlatformRole } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { reportExportRateLimiter } from "../../middleware/rateLimit.js";
import { requireRoles } from "../../middleware/requireRoles.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import {
  exportAdminReportsHandler,
  getAdminDashboardHandler,
  getAdminFraudAlertHandler,
  getAdminReportsSummaryHandler,
  getAdminUserHandler,
  listAdminFraudAlertsHandler,
  listAdminUsersHandler,
  listAdminVerificationRequestsHandler,
  listAdminVerificationsHandler,
  updateAdminFraudAlertStatusHandler,
  updateAdminUserStatusHandler
} from "./admin.handlers.js";
import {
  adminFraudAlertStatusSchema,
  adminFraudAlertsQuerySchema,
  adminReportsExportQuerySchema,
  adminReportsQuerySchema,
  adminUserStatusSchema,
  adminUsersQuerySchema,
  adminVerificationRequestsQuerySchema,
  adminVerificationsQuerySchema
} from "./admin.schemas.js";

export const adminRouter = Router();

const requirePlatformAdmin = [authenticate, requireRoles(PlatformRole.PLATFORM_ADMIN)] as const;

adminRouter.get("/dashboard", ...requirePlatformAdmin, getAdminDashboardHandler);

adminRouter.get(
  "/verifications",
  ...requirePlatformAdmin,
  validateQuery(adminVerificationsQuerySchema),
  listAdminVerificationsHandler
);

adminRouter.get(
  "/verification-requests",
  ...requirePlatformAdmin,
  validateQuery(adminVerificationRequestsQuerySchema),
  listAdminVerificationRequestsHandler
);

adminRouter.get(
  "/users",
  ...requirePlatformAdmin,
  validateQuery(adminUsersQuerySchema),
  listAdminUsersHandler
);

adminRouter.get("/users/:userId", ...requirePlatformAdmin, getAdminUserHandler);

adminRouter.patch(
  "/users/:userId/status",
  ...requirePlatformAdmin,
  validateBody(adminUserStatusSchema),
  updateAdminUserStatusHandler
);

adminRouter.get(
  "/fraud-alerts",
  ...requirePlatformAdmin,
  validateQuery(adminFraudAlertsQuerySchema),
  listAdminFraudAlertsHandler
);

adminRouter.get("/fraud-alerts/:alertId", ...requirePlatformAdmin, getAdminFraudAlertHandler);

adminRouter.patch(
  "/fraud-alerts/:alertId/status",
  ...requirePlatformAdmin,
  validateBody(adminFraudAlertStatusSchema),
  updateAdminFraudAlertStatusHandler
);

adminRouter.get(
  "/reports/summary",
  ...requirePlatformAdmin,
  validateQuery(adminReportsQuerySchema),
  getAdminReportsSummaryHandler
);

adminRouter.get(
  "/reports/export",
  ...requirePlatformAdmin,
  reportExportRateLimiter,
  validateQuery(adminReportsExportQuerySchema),
  exportAdminReportsHandler
);
