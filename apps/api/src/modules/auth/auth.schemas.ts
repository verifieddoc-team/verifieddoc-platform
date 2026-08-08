import { PlatformRole } from "@prisma/client";
import { z } from "zod";
import { passwordPolicySchema } from "../../lib/password-policy.js";

export const registrationAccountTypeSchema = z.enum(["HOLDER", "VERIFIER"]);
export type RegistrationAccountType = z.infer<typeof registrationAccountTypeSchema>;

const publicRegistrationRoleSchema = z.enum([PlatformRole.HOLDER, PlatformRole.VERIFIER]);

const fullNameSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, " "))
  .pipe(z.string().min(2).max(200));

const phoneSchema = z.string().trim().min(3).max(32);

const personalCanonicalBase = {
  fullName: fullNameSchema,
  email: z.string().email().transform((value) => value.toLowerCase()),
  phone: phoneSchema,
  password: passwordPolicySchema,
  confirmPassword: z.string().min(1),
  acceptedTerms: z.literal(true)
};

const legacyBase = {
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: passwordPolicySchema,
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  role: publicRegistrationRoleSchema.optional().default(PlatformRole.HOLDER)
};

const forbiddenCompanyFields = {
  companyName: true,
  industry: true,
  hrContact: true,
  hrcontact: true,
  country: true
} as const;

function rejectCompanyFields(value: Record<string, unknown>, context: z.RefinementCtx) {
  for (const key of Object.keys(forbiddenCompanyFields)) {
    if (value[key] !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${key} is not allowed for personal Holder or Verifier registration`,
        path: [key]
      });
    }
  }
}

function requirePasswordMatch(value: { password: string; confirmPassword?: string }, context: z.RefinementCtx) {
  if (value.confirmPassword !== undefined && value.confirmPassword !== value.password) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "confirmPassword must match password",
      path: ["confirmPassword"]
    });
  }
}

function requireAccountTypeRoleAgreement(
  value: { accountType?: string; role?: string },
  context: z.RefinementCtx
) {
  if (!value.accountType || !value.role) {
    return;
  }

  if (value.accountType !== value.role) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "accountType and role must agree when both are supplied",
      path: ["accountType"]
    });
  }
}

const holderCanonicalSchema = z
  .object({
    accountType: z.literal("HOLDER"),
    ...personalCanonicalBase,
    role: publicRegistrationRoleSchema.optional()
  })
  .strict()
  .superRefine((value, context) => {
    requirePasswordMatch(value, context);
    requireAccountTypeRoleAgreement(value, context);
    rejectCompanyFields(value as Record<string, unknown>, context);
  });

const verifierCanonicalSchema = z
  .object({
    accountType: z.literal("VERIFIER"),
    ...personalCanonicalBase,
    role: publicRegistrationRoleSchema.optional()
  })
  .strict()
  .superRefine((value, context) => {
    requirePasswordMatch(value, context);
    requireAccountTypeRoleAgreement(value, context);
    rejectCompanyFields(value as Record<string, unknown>, context);
  });

const legacyRegisterSchema = z
  .object({
    ...legacyBase
  })
  .strict()
  .superRefine((value, context) => {
    rejectCompanyFields(value as Record<string, unknown>, context);
  });

export const registerSchema = z.union([
  holderCanonicalSchema,
  verifierCanonicalSchema,
  legacyRegisterSchema
]);

export type RegisterInput = z.infer<typeof registerSchema>;

export type CanonicalPersonalRegisterInput =
  | z.infer<typeof holderCanonicalSchema>
  | z.infer<typeof verifierCanonicalSchema>;
export type LegacyRegisterInput = z.infer<typeof legacyRegisterSchema>;

export const loginSchema = z
  .object({
    email: z.string().email().transform((value) => value.toLowerCase()),
    password: z.string().min(1)
  })
  .strict();

export const refreshSchema = z.object({
  refreshToken: z.string().min(1)
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1)
});

export const verifyEmailSchema = z
  .object({
    requestId: z.string().trim().min(1),
    otp: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "otp must be a six-digit code")
  })
  .strict();

export const resendEmailVerificationSchema = z
  .object({
    email: z.string().email().transform((value) => value.toLowerCase())
  })
  .strict();

export const updateProfileSchema = z
  .object({
    fullName: fullNameSchema.optional(),
    phone: phoneSchema.optional(),
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional()
  })
  .strict()
  .superRefine((value, context) => {
    const hasFullName = value.fullName !== undefined;
    const hasFirst = value.firstName !== undefined;
    const hasLast = value.lastName !== undefined;

    if (!hasFullName && !(hasFirst && hasLast) && value.phone === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide fullName, firstName+lastName, and/or phone",
        path: ["fullName"]
      });
    }

    if ((hasFirst && !hasLast) || (!hasFirst && hasLast)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "firstName and lastName must be supplied together",
        path: ["lastName"]
      });
    }
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordPolicySchema
  })
  .strict();

export const passwordResetRequestSchema = z
  .object({
    email: z.string().email().transform((value) => value.toLowerCase())
  })
  .strict();

export const passwordResetVerifySchema = z
  .object({
    requestId: z.string().trim().min(1),
    otp: z.string().trim().min(4).max(12)
  })
  .strict();

export const passwordResetConfirmSchema = z
  .object({
    resetToken: z.string().trim().min(1),
    newPassword: passwordPolicySchema
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetVerifyInput = z.infer<typeof passwordResetVerifySchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendEmailVerificationInput = z.infer<typeof resendEmailVerificationSchema>;
