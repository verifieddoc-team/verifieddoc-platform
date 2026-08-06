import { Router, type NextFunction, type Request, type Response } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import {
  authRateLimiter,
  emailVerificationRateLimiter,
  passwordResetRateLimiter
} from "../../middleware/rateLimit.js";
import { validateBody } from "../../middleware/validate.js";
import {
  changePasswordHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  passwordResetConfirmHandler,
  passwordResetRequestHandler,
  passwordResetVerifyHandler,
  refreshHandler,
  registerHandler,
  resendEmailVerificationHandler,
  updateProfileHandler,
  verifyEmailHandler
} from "./auth.handlers.js";
import {
  changePasswordSchema,
  loginSchema,
  logoutSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  passwordResetVerifySchema,
  refreshSchema,
  registerSchema,
  resendEmailVerificationSchema,
  updateProfileSchema,
  verifyEmailSchema
} from "./auth.schemas.js";

export const authRouter = Router();

/**
 * Issuing organizations are not a public auth account type (PRD).
 * Reject accountType ORGANIZATION before schema validation so clients get a
 * stable product error instead of a generic VALIDATION_ERROR.
 */
function rejectOrganizationRegistrationAccountType(req: Request, res: Response, next: NextFunction) {
  if (
    req.body &&
    typeof req.body === "object" &&
    !Array.isArray(req.body) &&
    (req.body as { accountType?: unknown }).accountType === "ORGANIZATION"
  ) {
    return res.status(400).json({
      error: {
        code: "ORGANIZATION_APPLICATION_REQUIRED",
        message:
          "Register a personal Holder or Verifier account, verify the email, then submit an organization application."
      }
    });
  }

  return next();
}

authRouter.post(
  "/register",
  authRateLimiter,
  rejectOrganizationRegistrationAccountType,
  validateBody(registerSchema),
  registerHandler
);
authRouter.post("/login", authRateLimiter, validateBody(loginSchema), loginHandler);
authRouter.post("/refresh", authRateLimiter, validateBody(refreshSchema), refreshHandler);
authRouter.post("/logout", validateBody(logoutSchema), logoutHandler);
authRouter.get("/me", authenticate, meHandler);
authRouter.patch("/me", authenticate, validateBody(updateProfileSchema), updateProfileHandler);
authRouter.patch(
  "/me/password",
  authenticate,
  validateBody(changePasswordSchema),
  changePasswordHandler
);
authRouter.post(
  "/password-reset/request",
  passwordResetRateLimiter,
  validateBody(passwordResetRequestSchema),
  passwordResetRequestHandler
);
authRouter.post(
  "/password-reset/verify",
  passwordResetRateLimiter,
  validateBody(passwordResetVerifySchema),
  passwordResetVerifyHandler
);
authRouter.post(
  "/password-reset/confirm",
  passwordResetRateLimiter,
  validateBody(passwordResetConfirmSchema),
  passwordResetConfirmHandler
);
authRouter.post(
  "/email-verification/verify",
  emailVerificationRateLimiter,
  validateBody(verifyEmailSchema),
  verifyEmailHandler
);
authRouter.post(
  "/email-verification/resend",
  emailVerificationRateLimiter,
  validateBody(resendEmailVerificationSchema),
  resendEmailVerificationHandler
);
