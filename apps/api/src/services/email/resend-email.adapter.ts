import { env } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";
import type {
  EmailService,
  SendEmailVerificationOtpParams,
  SendPasswordResetOtpParams
} from "./types.js";

const RESEND_API_URL = "https://api.resend.com/emails";

export class ResendEmailAdapter implements EmailService {
  async sendPasswordResetOtp(params: SendPasswordResetOtpParams): Promise<void> {
    if (!env.RESEND_API_KEY || !env.MAIL_FROM) {
      throw new AppError(
        503,
        "SERVICE_UNAVAILABLE",
        "Email delivery is not configured"
      );
    }

    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [params.to],
        subject: "Your VerifiedDoc password reset code",
        text: `Your password reset code is ${params.otp}. It expires in 10 minutes.`
      })
    });

    if (!response.ok) {
      throw new AppError(
        503,
        "SERVICE_UNAVAILABLE",
        "Unable to send password reset email"
      );
    }
  }

  async sendEmailVerificationOtp(params: SendEmailVerificationOtpParams): Promise<void> {
    if (!env.RESEND_API_KEY || !env.MAIL_FROM) {
      throw new AppError(
        503,
        "SERVICE_UNAVAILABLE",
        "Email delivery is not configured"
      );
    }

    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [params.to],
        subject: "Your VerifiedDoc email verification code",
        text: `Your email verification code is ${params.otp}. It expires in ${params.expiresInMinutes} minutes.`
      })
    });

    if (!response.ok) {
      throw new AppError(
        503,
        "SERVICE_UNAVAILABLE",
        "Unable to send verification email"
      );
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
