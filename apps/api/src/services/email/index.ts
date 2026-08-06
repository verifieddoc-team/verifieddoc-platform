import { env } from "../../config/env.js";
import { getMemoryEmailAdapter } from "./memory-email.adapter.js";
import { getResendEmailAdapter } from "./resend-email.adapter.js";
import type { EmailService } from "./types.js";

export type {
  EmailService,
  SendEmailVerificationOtpParams,
  SendPasswordResetOtpParams,
  SentEmailMessage
} from "./types.js";
export {
  getTestEmailInbox,
  getTestOtpForRequest,
  getLatestTestEmailVerificationOtp,
  clearTestEmailState
} from "./memory-email.adapter.js";

export function isEmailDeliveryConfigured(): boolean {
  if (env.NODE_ENV === "test") {
    return true;
  }

  if (env.RESEND_API_KEY && env.MAIL_FROM) {
    return true;
  }

  // Development falls back to the in-memory adapter when Resend is unset.
  return env.NODE_ENV === "development";
}

export function getEmailService(): EmailService {
  if (env.NODE_ENV === "test") {
    return getMemoryEmailAdapter();
  }

  if (env.RESEND_API_KEY && env.MAIL_FROM) {
    return getResendEmailAdapter();
  }

  if (env.NODE_ENV === "development") {
    return getMemoryEmailAdapter();
  }

  return getResendEmailAdapter();
}
