import { PlatformRole } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import {
  fileVerificationRateLimiter,
  verifierVerificationRateLimiter
} from "../../middleware/rateLimit.js";
import { requireRoles } from "../../middleware/requireRoles.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import {
  cancelVerificationRequestHandler,
  completeFileVerificationHandler,
  createFileVerificationUploadUrlHandler,
  createVerificationHandler,
  createVerificationRequestHandler,
  getVerificationHandler,
  getVerificationRequestHandler,
  getVerifierDashboardHandler,
  listSavedOrganizationsHandler,
  listVerificationRequestsHandler,
  listVerificationsHandler,
  removeSavedOrganizationHandler,
  saveOrganizationHandler
} from "./verifier.handlers.js";
import {
  createVerificationRequestSchema,
  createVerificationSchema,
  fileVerificationUploadUrlSchema,
  listVerificationRequestsQuerySchema,
  listVerificationsQuerySchema,
  saveOrganizationSchema
} from "./verifier.schemas.js";

export const verifierRouter = Router();

const requireVerifier = [authenticate, requireRoles(PlatformRole.VERIFIER)] as const;

verifierRouter.get("/dashboard", ...requireVerifier, getVerifierDashboardHandler);

verifierRouter.post(
  "/verifications",
  ...requireVerifier,
  verifierVerificationRateLimiter,
  validateBody(createVerificationSchema),
  createVerificationHandler
);

verifierRouter.get(
  "/verifications",
  ...requireVerifier,
  validateQuery(listVerificationsQuerySchema),
  listVerificationsHandler
);

verifierRouter.get("/verifications/:verificationId", ...requireVerifier, getVerificationHandler);

verifierRouter.get("/saved-organizations", ...requireVerifier, listSavedOrganizationsHandler);

verifierRouter.post(
  "/saved-organizations",
  ...requireVerifier,
  validateBody(saveOrganizationSchema),
  saveOrganizationHandler
);

verifierRouter.delete(
  "/saved-organizations/:organizationId",
  ...requireVerifier,
  removeSavedOrganizationHandler
);

verifierRouter.post(
  "/verification-requests",
  ...requireVerifier,
  verifierVerificationRateLimiter,
  validateBody(createVerificationRequestSchema),
  createVerificationRequestHandler
);

verifierRouter.get(
  "/verification-requests",
  ...requireVerifier,
  validateQuery(listVerificationRequestsQuerySchema),
  listVerificationRequestsHandler
);

verifierRouter.get(
  "/verification-requests/:requestId",
  ...requireVerifier,
  getVerificationRequestHandler
);

verifierRouter.patch(
  "/verification-requests/:requestId/cancel",
  ...requireVerifier,
  cancelVerificationRequestHandler
);

verifierRouter.post(
  "/file-verifications/upload-url",
  ...requireVerifier,
  fileVerificationRateLimiter,
  validateBody(fileVerificationUploadUrlSchema),
  createFileVerificationUploadUrlHandler
);

verifierRouter.post(
  "/file-verifications/:uploadId/complete",
  ...requireVerifier,
  fileVerificationRateLimiter,
  completeFileVerificationHandler
);
