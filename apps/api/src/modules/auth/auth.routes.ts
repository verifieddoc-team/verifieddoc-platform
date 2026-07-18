import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authRateLimiter } from "../../middleware/rateLimit.js";
import { validateBody } from "../../middleware/validate.js";
import {
  loginHandler,
  logoutHandler,
  meHandler,
  refreshHandler,
  registerHandler
} from "./auth.handlers.js";
import { loginSchema, logoutSchema, refreshSchema, registerSchema } from "./auth.schemas.js";

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, validateBody(registerSchema), registerHandler);
authRouter.post("/login", authRateLimiter, validateBody(loginSchema), loginHandler);
authRouter.post("/refresh", authRateLimiter, validateBody(refreshSchema), refreshHandler);
authRouter.post("/logout", validateBody(logoutSchema), logoutHandler);
authRouter.get("/me", authenticate, meHandler);
