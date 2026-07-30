export function maskEmail(email) {
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return email || "";
  }

  const [localPart, domain] = email.split("@");

  if (localPart.length <= 2) {
    // Too short to meaningfully mask — show first char + mask
    return `${localPart.charAt(0)}***@${domain}`;
  }

  const visible = localPart.slice(0, 2);
  const maskedLength = Math.max(localPart.length - 2, 4); // keep mask visually consistent
  const masked = "*".repeat(maskedLength);

  return `${visible}${masked}@${domain}`;
}