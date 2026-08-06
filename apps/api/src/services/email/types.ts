export interface SendPasswordResetOtpParams {
  to: string;
  otp: string;
  requestId: string;
}

export interface SendEmailVerificationOtpParams {
  to: string;
  otp: string;
  expiresInMinutes: number;
  /** Opaque challenge id; used by the memory test adapter only. Never logged in production. */
  requestId?: string;
}

export interface SentEmailMessage {
  to: string;
  subject: string;
  text: string;
  otp?: string;
  requestId?: string;
  kind?: "password-reset" | "email-verification";
  sentAt: Date;
}

export interface EmailService {
  sendPasswordResetOtp(params: SendPasswordResetOtpParams): Promise<void>;
  sendEmailVerificationOtp(params: SendEmailVerificationOtpParams): Promise<void>;
}
