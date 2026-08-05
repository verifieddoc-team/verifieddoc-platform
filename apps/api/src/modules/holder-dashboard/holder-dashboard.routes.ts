import { PlatformRole } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRoles } from "../../middleware/requireRoles.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import {
  completePersonalDocumentUploadHandler,
  createPersonalDocumentUploadUrlHandler,
  deletePersonalDocumentHandler,
  getHolderDashboardHandler,
  listHolderActivityHandler,
  listHolderVerificationRequestsHandler,
  listPersonalDocumentsHandler
} from "./holder-dashboard.handlers.js";
import {
  holderActivityQuerySchema,
  holderVerificationRequestsQuerySchema,
  personalDocumentUploadUrlSchema
} from "./holder-dashboard.schemas.js";

export const holderDashboardRouter = Router();

const requireHolder = [authenticate, requireRoles(PlatformRole.HOLDER)] as const;

holderDashboardRouter.get("/dashboard", ...requireHolder, getHolderDashboardHandler);

holderDashboardRouter.get(
  "/activity",
  ...requireHolder,
  validateQuery(holderActivityQuerySchema),
  listHolderActivityHandler
);

holderDashboardRouter.get(
  "/verification-requests",
  ...requireHolder,
  validateQuery(holderVerificationRequestsQuerySchema),
  listHolderVerificationRequestsHandler
);

holderDashboardRouter.get("/documents", ...requireHolder, listPersonalDocumentsHandler);

holderDashboardRouter.post(
  "/documents/upload-url",
  ...requireHolder,
  validateBody(personalDocumentUploadUrlSchema),
  createPersonalDocumentUploadUrlHandler
);

holderDashboardRouter.post(
  "/documents/:documentId/complete",
  ...requireHolder,
  completePersonalDocumentUploadHandler
);

holderDashboardRouter.delete(
  "/documents/:documentId",
  ...requireHolder,
  deletePersonalDocumentHandler
);
