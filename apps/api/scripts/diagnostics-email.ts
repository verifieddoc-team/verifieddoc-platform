/**
 * Safe Resend email diagnostic.
 *
 * Confirms RESEND_API_KEY presence without printing it, prints MAIL_FROM,
 * rejects onboarding@resend.dev in production, and optionally sends a test
 * email when DIAGNOSTIC_EMAIL_TO is explicitly supplied.
 *
 * Usage:
 *   npm run diagnostics:email --workspace=@verifieddoc/api
 *   DIAGNOSTIC_EMAIL_TO=you@example.com npm run diagnostics:email --workspace=@verifieddoc/api
 */
import { env } from "../src/config/env.js";
import { maskEmail } from "../src/lib/mask-email.js";
import { readSanitizedUpstreamError } from "../src/lib/provider-errors.js";

const RESEND_API_URL = "https://api.resend.com/emails";
const RESEND_ONBOARDING_FROM = "onboarding@resend.dev";

function senderDomain(mailFrom: string): string {
  const at = mailFrom.lastIndexOf("@");
  return at >= 0 ? mailFrom.slice(at + 1) : "unknown";
}

async function main() {
  console.log("VerifiedDoc email diagnostic");
  console.log("----------------------------");
  console.log(`RESEND_API_KEY: ${env.RESEND_API_KEY ? "set" : "MISSING"}`);
  console.log(`MAIL_FROM: ${env.MAIL_FROM ?? "(unset)"}`);
  console.log(`NODE_ENV: ${env.NODE_ENV}`);

  if (!env.RESEND_API_KEY) {
    console.error("FAIL: RESEND_API_KEY is not set");
    process.exitCode = 1;
    return;
  }

  if (!env.MAIL_FROM) {
    console.error("FAIL: MAIL_FROM is not set");
    process.exitCode = 1;
    return;
  }

  if (env.NODE_ENV === "production" && env.MAIL_FROM.toLowerCase() === RESEND_ONBOARDING_FROM) {
    console.error("FAIL: MAIL_FROM must not be onboarding@resend.dev in production");
    process.exitCode = 1;
    return;
  }

  console.log(`sender domain: ${senderDomain(env.MAIL_FROM)}`);

  const diagnosticTo = process.env.DIAGNOSTIC_EMAIL_TO?.trim();
  if (!diagnosticTo) {
    console.log("DIAGNOSTIC_EMAIL_TO not set — configuration check only (no email sent)");
    console.log("PASS: email configuration looks present");
    return;
  }

  console.log(`sending diagnostic email to: ${maskEmail(diagnosticTo)}`);

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [diagnosticTo],
      subject: "VerifiedDoc email diagnostic",
      text: "This is a VerifiedDoc Resend diagnostic message. No OTP is included."
    })
  });

  if (!response.ok) {
    const upstream = await readSanitizedUpstreamError(response);
    console.error(
      `FAIL: Resend rejected diagnostic email status=${response.status} code=${upstream.code ?? "n/a"} message=${upstream.message ?? "n/a"}`
    );
    process.exitCode = 1;
    return;
  }

  console.log("PASS: diagnostic email accepted by Resend");
}

main().catch((error) => {
  console.error("FAIL: unexpected diagnostic error");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
