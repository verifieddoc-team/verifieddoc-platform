import { OrganizationRole } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { invitationAcceptRateLimiter } from "../../middleware/rateLimit.js";
import { requireOrganizationRoles } from "../../middleware/requireOrganizationRoles.js";
import { validateBody } from "../../middleware/validate.js";
import {
  acceptRecipientInvitationHandler,
  createRecipientInvitationHandler,
  listRecipientInvitationsHandler,
  revokeRecipientInvitationHandler
} from "./recipient.handlers.js";
import {
  acceptRecipientInvitationSchema,
  createRecipientInvitationSchema
} from "./recipient.schemas.js";

const RECIPIENT_MANAGER_ROLES = [
  OrganizationRole.ORGANIZATION_ADMIN,
  OrganizationRole.ORGANIZATION_ISSUER
] as const;

export const organizationRecipientInvitationRouter = Router({ mergeParams: true });

organizationRecipientInvitationRouter.post(
  "/",
  authenticate,
  requireOrganizationRoles(...RECIPIENT_MANAGER_ROLES),
  validateBody(createRecipientInvitationSchema),
  createRecipientInvitationHandler
);

organizationRecipientInvitationRouter.get(
  "/",
  authenticate,
  requireOrganizationRoles(...RECIPIENT_MANAGER_ROLES),
  listRecipientInvitationsHandler
);

organizationRecipientInvitationRouter.patch(
  "/:invitationId/revoke",
  authenticate,
  requireOrganizationRoles(...RECIPIENT_MANAGER_ROLES),
  revokeRecipientInvitationHandler
);

export const recipientInvitationAcceptRouter = Router();

recipientInvitationAcceptRouter.post(
  "/accept",
  authenticate,
  invitationAcceptRateLimiter,
  validateBody(acceptRecipientInvitationSchema),
  acceptRecipientInvitationHandler
);
