/** Mask an email for client display without revealing the full local-part. */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) {
    return "***";
  }

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!domain) {
    return "***";
  }

  const visible = local.charAt(0);
  return `${visible}***@${domain}`;
}
