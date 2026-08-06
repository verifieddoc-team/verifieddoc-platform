import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

const isTest = env.NODE_ENV === "test";

function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message: string;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message: options.message
        }
      });
    }
  });
}

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 20,
  message: "Too many authentication attempts, please try again later"
});

export const publicVerificationRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : 60,
  message: "Too many verification attempts, please try again later"
});

export const passwordResetRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 10,
  message: "Too many password reset attempts, please try again later"
});

export const emailVerificationRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 20,
  message: "Too many email verification attempts, please try again later"
});

export const fileVerificationRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : 30,
  message: "Too many file verification attempts, please try again later"
});

export const verifierVerificationRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : 60,
  message: "Too many verification attempts, please try again later"
});

export const invitationAcceptRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 20,
  message: "Too many invitation acceptance attempts, please try again later"
});

export const reportExportRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 10,
  message: "Too many report export attempts, please try again later"
});
