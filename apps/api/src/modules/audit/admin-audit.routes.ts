import { PlatformRole } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRoles } from "../../middleware/requireRoles.js";
import { validateQuery } from "../../middleware/validate.js";
import { listPlatformAuditLogsHandler } from "./audit.handlers.js";
import { platformAuditLogQuerySchema } from "./audit.schemas.js";

export const adminAuditRouter = Router();

adminAuditRouter.get(
  "/audit-logs",
  authenticate,
  requireRoles(PlatformRole.PLATFORM_ADMIN),
  validateQuery(platformAuditLogQuerySchema),
  listPlatformAuditLogsHandler
);
