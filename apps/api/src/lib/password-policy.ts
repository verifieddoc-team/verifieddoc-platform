import { z } from "zod";

export const passwordPolicySchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[0-9]/, "Password must contain a number")
  .regex(/[^A-Za-z0-9]/, "Password must contain a special character");

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const emailPolicySchema = z
  .string()
  .trim()
  .email("A valid email address is required")
  .transform(normalizeEmail);

export function validatePassword(password: string): string {
  return passwordPolicySchema.parse(password);
}

export function validateEmail(email: string): string {
  return emailPolicySchema.parse(email);
}
