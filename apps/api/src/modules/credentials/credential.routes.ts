import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { requireOrganizationRoles } from "../../middleware/requireOrganizationRoles.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import {
  CREDENTIAL_ISSUER_ROLES,
  holderCredentialListQuerySchema,
  issueCredentialSchema,
  organizationCredentialListQuerySchema,
  revokeCredentialSchema
} from "./credential.schemas.js";
import {
  getCredentialHandler,
  issueCredentialHandler,
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
