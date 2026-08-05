export interface SendPasswordResetOtpParams {
  to: string;
  otp: string;
  requestId: string;
}

export interface SentEmailMessage {
  to: string;
  subject: string;
  text: string;
  otp?: string;
  requestId?: string;
  sentAt: Date;
}

export interface EmailService {
  sendPasswordResetOtp(params: SendPasswordResetOtpParams): Promise<void>;
}
