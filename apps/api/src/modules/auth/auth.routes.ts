import { Router } from "express";
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

authRouter.post("/register", authRateLimiter, validateBody(registerSchema), registerHandler);
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
