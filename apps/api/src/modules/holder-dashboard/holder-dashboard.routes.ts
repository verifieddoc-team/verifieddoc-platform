import { PlatformRole } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRoles } from "../../middleware/requireRoles.js";
import { getHolderDashboardHandler } from "./holder-dashboard.handlers.js";

export const holderDashboardRouter = Router();

holderDashboardRouter.get(
  "/dashboard",
  authenticate,
  requireRoles(PlatformRole.HOLDER),
  getHolderDashboardHandler
);
