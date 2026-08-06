import { env } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { maskEmail } from "../../lib/mask-email.js";
import { readSanitizedUpstreamError } from "../../lib/provider-errors.js";
import type {
  EmailService,
  SendEmailVerificationOtpParams,
  SendPasswordResetOtpParams
} from "./types.js";

const RESEND_API_URL = "https://api.resend.com/emails";

function requireResendConfig() {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) {
    throw new AppError(503, "SERVICE_UNAVAILABLE", "Email delivery is not configured");
  }

  return {
    apiKey: env.RESEND_API_KEY,
    mailFrom: env.MAIL_FROM
  };
}

function senderDomain(mailFrom: string): string {
  const at = mailFrom.lastIndexOf("@");
  return at >= 0 ? mailFrom.slice(at + 1) : "unknown";
}

async function logResendFailure(
  operation: "email-verification" | "password-reset",
  response: Response,
  recipient: string,
  mailFrom: string
): Promise<void> {
  const upstream = await readSanitizedUpstreamError(response);
  logger.error(
    {
      provider: "resend",
      operation,
      status: response.status,
      upstreamCode: upstream.code,
      upstreamMessage: upstream.message,
      maskedRecipient: maskEmail(recipient),
      senderDomain: senderDomain(mailFrom)
    },
    "resend provider request failed"
  );
}

export class ResendEmailAdapter implements EmailService {
  async sendPasswordResetOtp(params: SendPasswordResetOtpParams): Promise<void> {
    const { apiKey, mailFrom } = requireResendConfig();

    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: mailFrom,
        to: [params.to],
        subject: "Your VerifiedDoc password reset code",
        text: `Your password reset code is ${params.otp}. It expires in 10 minutes.`
      })
    });

    if (!response.ok) {
      await logResendFailure("password-reset", response, params.to, mailFrom);
      throw new AppError(503, "SERVICE_UNAVAILABLE", "Unable to send password reset email");
    }
  }

  async sendEmailVerificationOtp(params: SendEmailVerificationOtpParams): Promise<void> {
    const { apiKey, mailFrom } = requireResendConfig();

    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: mailFrom,
        to: [params.to],
        subject: "Your VerifiedDoc email verification code",
        text: `Your email verification code is ${params.otp}. It expires in ${params.expiresInMinutes} minutes.`
      })
    });

    if (!response.ok) {
      await logResendFailure("email-verification", response, params.to, mailFrom);
      throw new AppError(503, "SERVICE_UNAVAILABLE", "Unable to send verification email");
    }
  }
}

let singleton: ResendEmailAdapter | undefined;

export function getResendEmailAdapter(): ResendEmailAdapter {
  if (!singleton) {
    singleton = new ResendEmailAdapter();
  }
  return singleton;
}

/** Test helper: reset the adapter singleton between cases. */
export function resetResendEmailAdapterForTests() {
  singleton = undefined;
}
