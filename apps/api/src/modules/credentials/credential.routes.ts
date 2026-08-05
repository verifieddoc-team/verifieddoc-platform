import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requireOrganizationRoles } from "../../middleware/requireOrganizationRoles.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import {
  CREDENTIAL_ISSUER_ROLES,
  credentialArtifactUploadUrlSchema,
  holderCredentialListQuerySchema,
  issueCredentialSchema,
  organizationCredentialListQuerySchema,
  revokeCredentialSchema
} from "./credential.schemas.js";
import {
  completeCredentialArtifactUploadHandler,
  createCredentialArtifactUploadUrlHandler,
  getCredentialHandler,
  issueCredentialHandler,
  listCredentialArtifactsHandler,
  listHolderCredentialsHandler,
  listOrganizationCredentialsHandler,
  revokeCredentialHandler
} from "./credential.handlers.js";

export const credentialRouter = Router();

credentialRouter.get(
  "/",
  authenticate,
  validateQuery(holderCredentialListQuerySchema),
  listHolderCredentialsHandler
);
credentialRouter.get(
  "/:credentialId/artifacts",
  authenticate,
  listCredentialArtifactsHandler
);
credentialRouter.get("/:credentialId", authenticate, getCredentialHandler);

export const organizationCredentialRouter = Router({ mergeParams: true });

organizationCredentialRouter.post(
  "/",
  authenticate,
  requireOrganizationRoles(...CREDENTIAL_ISSUER_ROLES),
  validateBody(issueCredentialSchema),
  issueCredentialHandler
);

organizationCredentialRouter.get(
  "/",
  authenticate,
  requireOrganizationRoles(...CREDENTIAL_ISSUER_ROLES),
  validateQuery(organizationCredentialListQuerySchema),
  listOrganizationCredentialsHandler
);

organizationCredentialRouter.patch(
  "/:credentialId/revoke",
  authenticate,
  requireOrganizationRoles(...CREDENTIAL_ISSUER_ROLES),
  validateBody(revokeCredentialSchema),
  revokeCredentialHandler
);

organizationCredentialRouter.post(
  "/:credentialId/artifacts/upload-url",
  authenticate,
  requireOrganizationRoles(...CREDENTIAL_ISSUER_ROLES),
  validateBody(credentialArtifactUploadUrlSchema),
  createCredentialArtifactUploadUrlHandler
);

organizationCredentialRouter.post(
  "/:credentialId/artifacts/:artifactId/complete",
  authenticate,
  requireOrganizationRoles(...CREDENTIAL_ISSUER_ROLES),
  completeCredentialArtifactUploadHandler
);
