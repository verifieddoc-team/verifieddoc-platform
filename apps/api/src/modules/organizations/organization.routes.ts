import { OrganizationRole, PlatformRole } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requireOrganizationRoles } from "../../middleware/requireOrganizationRoles.js";
import { requireRoles } from "../../middleware/requireRoles.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import { listOrganizationAuditLogsHandler } from "../audit/audit.handlers.js";
import { organizationAuditLogQuerySchema } from "../audit/audit.schemas.js";
import {
  adminListOrganizationsHandler,
  applyOrganizationHandler,
  getOrganizationHandler,
  listMyOrganizationsHandler,
  listOrganizationMembersHandler,
  reviewOrganizationHandler
} from "./organization.handlers.js";
import {
  removeOrganizationMemberHandler,
  updateOrganizationMemberHandler
} from "./member.handlers.js";
import { organizationCredentialRouter } from "../credentials/credential.routes.js";
import { organizationInvitationRouter } from "./organization-invitation.routes.js";
import {
  adminOrganizationListQuerySchema,
  createOrganizationSchema,
  reviewOrganizationSchema
} from "./organization.schemas.js";
import { updateMemberRoleSchema } from "./member.schemas.js";

export const organizationRouter = Router();

organizationRouter.post("/", authenticate, validateBody(createOrganizationSchema), applyOrganizationHandler);
organizationRouter.get("/", authenticate, listMyOrganizationsHandler);
organizationRouter.get("/:organizationId", authenticate, getOrganizationHandler);
organizationRouter.get(
  "/:organizationId/audit-logs",
  authenticate,
  requireOrganizationRoles(OrganizationRole.ORGANIZATION_ADMIN),
  validateQuery(organizationAuditLogQuerySchema),
  listOrganizationAuditLogsHandler
);
organizationRouter.get(
  "/:organizationId/members",
  authenticate,
  requireOrganizationRoles(OrganizationRole.ORGANIZATION_ADMIN),
  listOrganizationMembersHandler
);
organizationRouter.patch(
  "/:organizationId/members/:userId",
  authenticate,
  requireOrganizationRoles(OrganizationRole.ORGANIZATION_ADMIN),
  validateBody(updateMemberRoleSchema),
  updateOrganizationMemberHandler
);
organizationRouter.delete(
  "/:organizationId/members/:userId",
  authenticate,
  requireOrganizationRoles(OrganizationRole.ORGANIZATION_ADMIN),
  removeOrganizationMemberHandler
);
organizationRouter.use("/:organizationId/invitations", organizationInvitationRouter);
organizationRouter.use("/:organizationId/credentials", organizationCredentialRouter);

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
