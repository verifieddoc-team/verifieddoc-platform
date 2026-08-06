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
  adminListRegistrationDocumentsHandler,
  adminReviewRegistrationDocumentHandler,
  applyOrganizationHandler,
  completeRegistrationDocumentUploadHandler,
  createRegistrationDocumentUploadUrlHandler,
  deleteRegistrationDocumentHandler,
  getOrganizationDashboardHandler,
  getOrganizationHandler,
  getOrganizationVerificationRequestHandler,
  listMyOrganizationsHandler,
  listOrganizationMembersHandler,
  listOrganizationVerificationRequestsHandler,
  listRegistrationDocumentsHandler,
  reviewOrganizationHandler,
  reviewOrganizationVerificationRequestHandler,
  updateOrganizationHandler
} from "./organization.handlers.js";
import {
  removeOrganizationMemberHandler,
  updateOrganizationMemberHandler
} from "./member.handlers.js";
import { organizationCredentialRouter } from "../credentials/credential.routes.js";
import { organizationInvitationRouter } from "./organization-invitation.routes.js";
import { organizationRecipientInvitationRouter } from "./recipient-invitation.routes.js";
import { listRecipientsHandler } from "./recipient.handlers.js";
import {
  adminOrganizationListQuerySchema,
  createOrganizationSchema,
  organizationVerificationRequestsQuerySchema,
  registrationDocumentUploadUrlSchema,
  reviewOrganizationSchema,
  reviewRegistrationDocumentSchema,
  reviewVerificationRequestSchema,
  updateOrganizationSchema
} from "./organization.schemas.js";
import { updateMemberRoleSchema } from "./member.schemas.js";

const ORG_ISSUER_ROLES = [
  OrganizationRole.ORGANIZATION_ADMIN,
  OrganizationRole.ORGANIZATION_ISSUER
] as const;

export const organizationRouter = Router();

organizationRouter.post("/", authenticate, validateBody(createOrganizationSchema), applyOrganizationHandler);
organizationRouter.get("/", authenticate, listMyOrganizationsHandler);
organizationRouter.get("/:organizationId", authenticate, getOrganizationHandler);
organizationRouter.patch(
  "/:organizationId",
  authenticate,
  requireOrganizationRoles(OrganizationRole.ORGANIZATION_ADMIN),
  validateBody(updateOrganizationSchema),
  updateOrganizationHandler
);
organizationRouter.get(
  "/:organizationId/dashboard",
  authenticate,
  requireOrganizationRoles(...ORG_ISSUER_ROLES),
  getOrganizationDashboardHandler
);
organizationRouter.get(
  "/:organizationId/recipients",
  authenticate,
  requireOrganizationRoles(...ORG_ISSUER_ROLES),
  listRecipientsHandler
);
organizationRouter.get(
  "/:organizationId/verification-requests",
  authenticate,
  requireOrganizationRoles(...ORG_ISSUER_ROLES),
  validateQuery(organizationVerificationRequestsQuerySchema),
  listOrganizationVerificationRequestsHandler
);
organizationRouter.get(
  "/:organizationId/verification-requests/:requestId",
  authenticate,
  requireOrganizationRoles(...ORG_ISSUER_ROLES),
  getOrganizationVerificationRequestHandler
);
organizationRouter.patch(
  "/:organizationId/verification-requests/:requestId/review",
  authenticate,
  requireOrganizationRoles(...ORG_ISSUER_ROLES),
  validateBody(reviewVerificationRequestSchema),
  reviewOrganizationVerificationRequestHandler
);
organizationRouter.post(
  "/:organizationId/registration-documents/upload-url",
  authenticate,
  requireOrganizationRoles(OrganizationRole.ORGANIZATION_ADMIN),
  validateBody(registrationDocumentUploadUrlSchema),
  createRegistrationDocumentUploadUrlHandler
);
organizationRouter.post(
  "/:organizationId/registration-documents/:documentId/complete",
  authenticate,
  requireOrganizationRoles(OrganizationRole.ORGANIZATION_ADMIN),
  completeRegistrationDocumentUploadHandler
);
organizationRouter.get(
  "/:organizationId/registration-documents",
  authenticate,
  requireOrganizationRoles(OrganizationRole.ORGANIZATION_ADMIN),
  listRegistrationDocumentsHandler
);
organizationRouter.delete(
  "/:organizationId/registration-documents/:documentId",
  authenticate,
  requireOrganizationRoles(OrganizationRole.ORGANIZATION_ADMIN),
  deleteRegistrationDocumentHandler
);
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
organizationRouter.use("/:organizationId/recipient-invitations", organizationRecipientInvitationRouter);
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

adminOrganizationRouter.get(
  "/:organizationId/registration-documents",
  authenticate,
  requireRoles(PlatformRole.PLATFORM_ADMIN),
  adminListRegistrationDocumentsHandler
);

adminOrganizationRouter.patch(
  "/:organizationId/registration-documents/:documentId/review",
  authenticate,
  requireRoles(PlatformRole.PLATFORM_ADMIN),
  validateBody(reviewRegistrationDocumentSchema),
  adminReviewRegistrationDocumentHandler
);
