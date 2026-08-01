import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { publicVerificationRateLimiter } from "../../middleware/rateLimit.js";
import { validateBody } from "../../middleware/validate.js";
import {
  createShareLinkHandler,
  listShareLinksHandler,
  revokeShareLinkHandler,
  verifyCredentialHandler
} from "./share-link.handlers.js";
import { createShareLinkSchema } from "./share-link.schemas.js";

export const shareLinkRouter = Router({ mergeParams: true });

shareLinkRouter.post("/", authenticate, validateBody(createShareLinkSchema), createShareLinkHandler);
shareLinkRouter.get("/", authenticate, listShareLinksHandler);
shareLinkRouter.patch("/:shareLinkId/revoke", authenticate, revokeShareLinkHandler);

export const verifyRouter = Router();

verifyRouter.get("/:token", publicVerificationRateLimiter, verifyCredentialHandler);
