import type { EmailService, SendPasswordResetOtpParams, SentEmailMessage } from "./types.js";

const inbox: SentEmailMessage[] = [];
const otpByRequestId = new Map<string, string>();

export class MemoryEmailAdapter implements EmailService {
  async sendPasswordResetOtp(params: SendPasswordResetOtpParams): Promise<void> {
    const message: SentEmailMessage = {
      to: params.to,
      subject: "Your VerifiedDoc password reset code",
      text: `Your password reset code is ${params.otp}. It expires in 10 minutes. Request ID: ${params.requestId}`,
      otp: params.otp,
      requestId: params.requestId,
      sentAt: new Date()
    };

    inbox.push(message);

    if (process.env.NODE_ENV === "test") {
      otpByRequestId.set(params.requestId, params.otp);
    }
  }
}

let singleton: MemoryEmailAdapter | undefined;

export function getMemoryEmailAdapter(): MemoryEmailAdapter {
  if (!singleton) {
    singleton = new MemoryEmailAdapter();
  }
  return singleton;
}

/** Clears and returns messages sent through the memory email adapter. */
export function getTestEmailInbox(): SentEmailMessage[] {
  const messages = inbox.splice(0, inbox.length);
  return messages;
}

export function getTestOtpForRequest(requestId: string): string | undefined {
  return otpByRequestId.get(requestId);
}

export function clearTestEmailState(): void {
  inbox.length = 0;
  otpByRequestId.clear();
}
