import { parsePhoneNumberFromString } from "libphonenumber-js";
import { AppError } from "./errors.js";

export function normalizePhoneE164(input: string): string {
  const trimmed = input.trim();
  const parsed = parsePhoneNumberFromString(trimmed);

  if (!parsed || !parsed.isValid()) {
    throw new AppError(400, "VALIDATION_ERROR", "phone must be a valid international E.164 number");
  }

  return parsed.format("E.164");
}

export function tryNormalizePhoneE164(input: string | undefined | null): string | null {
  if (input === undefined || input === null || input.trim() === "") {
    return null;
  }

  return normalizePhoneE164(input);
}
