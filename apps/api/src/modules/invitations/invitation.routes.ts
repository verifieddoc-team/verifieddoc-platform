import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody } from "../../middleware/validate.js";
import { acceptInvitationSchema } from "./invitation.schemas.js";
import { acceptInvitationHandler } from "./invitation.handlers.js";

export const invitationAcceptRouter = Router();

invitationAcceptRouter.post(
  "/accept",
  authenticate,
  validateBody(acceptInvitationSchema),
  acceptInvitationHandler
);
