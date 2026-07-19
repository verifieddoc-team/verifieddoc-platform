import { OrganizationRole } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requireOrganizationRoles } from "../../middleware/requireOrganizationRoles.js";
import { validateBody } from "../../middleware/validate.js";
import {
  createInvitationHandler,
  listInvitationsHandler,
  revokeInvitationHandler
} from "../invitations/invitation.handlers.js";
import { createInvitationSchema } from "../invitations/invitation.schemas.js";

export const organizationInvitationRouter = Router({ mergeParams: true });

organizationInvitationRouter.post(
  "/",
  authenticate,
  requireOrganizationRoles(OrganizationRole.ORGANIZATION_ADMIN),
  validateBody(createInvitationSchema),
  createInvitationHandler
);

organizationInvitationRouter.get(
  "/",
  authenticate,
  requireOrganizationRoles(OrganizationRole.ORGANIZATION_ADMIN),
  listInvitationsHandler
);

organizationInvitationRouter.patch(
  "/:invitationId/revoke",
  authenticate,
  requireOrganizationRoles(OrganizationRole.ORGANIZATION_ADMIN),
  revokeInvitationHandler
);
