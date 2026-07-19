import { OrganizationRole, PlatformRole } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requireOrganizationRoles } from "../../middleware/requireOrganizationRoles.js";
import { requireRoles } from "../../middleware/requireRoles.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import {
  adminListOrganizationsHandler,
  applyOrganizationHandler,
  getOrganizationHandler,
  listMyOrganizationsHandler,
  listOrganizationMembersHandler,
  reviewOrganizationHandler
} from "./organization.handlers.js";
import {
  adminOrganizationListQuerySchema,
  createOrganizationSchema,
  reviewOrganizationSchema
} from "./organization.schemas.js";

export const organizationRouter = Router();

organizationRouter.post("/", authenticate, validateBody(createOrganizationSchema), applyOrganizationHandler);
organizationRouter.get("/", authenticate, listMyOrganizationsHandler);
organizationRouter.get("/:organizationId", authenticate, getOrganizationHandler);
organizationRouter.get(
  "/:organizationId/members",
  authenticate,
  requireOrganizationRoles(OrganizationRole.ORGANIZATION_ADMIN),
  listOrganizationMembersHandler
);

export const adminOrganizationRouter = Router();

adminOrganizationRouter.get(
  "/",
  authenticate,
  requireRoles(PlatformRole.PLATFORM_ADMIN),
  validateQuery(adminOrganizationListQuerySchema),
  adminListOrganizationsHandler
);

adminOrganizationRouter.patch(
  "/:organizationId/review",
  authenticate,
  requireRoles(PlatformRole.PLATFORM_ADMIN),
  validateBody(reviewOrganizationSchema),
  reviewOrganizationHandler
);
