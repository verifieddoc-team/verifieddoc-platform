import { PlatformRole } from "@prisma/client";
import { z } from "zod";
import { passwordPolicySchema } from "../../lib/password-policy.js";

const publicRegistrationRoleSchema = z.enum([PlatformRole.HOLDER, PlatformRole.VERIFIER]);

export const registerSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: passwordPolicySchema,
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  role: publicRegistrationRoleSchema.optional().default(PlatformRole.HOLDER)
});

export const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1)
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1)
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
