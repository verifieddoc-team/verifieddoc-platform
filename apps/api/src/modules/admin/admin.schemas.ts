import {
  FraudAlertSeverity,
  FraudAlertStatus,
  FraudAlertType,
  PlatformRole,
  UserStatus,
  VerificationMethod,
  VerificationOutcome,
  VerificationRequestStatus
} from "@prisma/client";
import { z } from "zod";

const isoDateTimeSchema = z
  .string()
  .trim()
  .min(1, "Datetime value cannot be empty")
  .datetime({
    offset: true,
    message: "Must be a valid ISO 8601 datetime with a timezone offset or Z suffix"
  });

function validateDateRange(data: { from?: string; to?: string }, context: z.RefinementCtx) {
  if (data.from && data.to && new Date(data.from).getTime() > new Date(data.to).getTime()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "from must be less than or equal to to",
      path: ["from"]
    });
  }
}

const paginationFields = {
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20)
};

export const adminUsersQuerySchema = z.object({
  role: z.nativeEnum(PlatformRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  ...paginationFields
});

export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;

export const adminUserStatusSchema = z
  .discriminatedUnion("action", [
    z
      .object({
        action: z.literal("SUSPEND"),
        reason: z.string().trim().min(1).max(1000)
      })
      .strict(),
    z
      .object({
        action: z.literal("REINSTATE")
      })
      .strict()
  ]);

export type AdminUserStatusInput = z.infer<typeof adminUserStatusSchema>;

export const adminVerificationsQuerySchema = z
  .object({
    result: z.nativeEnum(VerificationOutcome).optional(),
    method: z.nativeEnum(VerificationMethod).optional(),
    organizationId: z.string().trim().min(1).optional(),
    verifierId: z.string().trim().min(1).optional(),
    from: isoDateTimeSchema.optional(),
    to: isoDateTimeSchema.optional(),
    ...paginationFields
  })
  .superRefine(validateDateRange);

export type AdminVerificationsQuery = z.infer<typeof adminVerificationsQuerySchema>;

export const adminVerificationRequestsQuerySchema = z
  .object({
    status: z.nativeEnum(VerificationRequestStatus).optional(),
    organizationId: z.string().trim().min(1).optional(),
    holderId: z.string().trim().min(1).optional(),
    from: isoDateTimeSchema.optional(),
    to: isoDateTimeSchema.optional(),
    ...paginationFields
  })
  .superRefine(validateDateRange);

export type AdminVerificationRequestsQuery = z.infer<typeof adminVerificationRequestsQuerySchema>;

export const adminFraudAlertsQuerySchema = z
  .object({
    status: z.nativeEnum(FraudAlertStatus).optional(),
    type: z.nativeEnum(FraudAlertType).optional(),
    severity: z.nativeEnum(FraudAlertSeverity).optional(),
    from: isoDateTimeSchema.optional(),
    to: isoDateTimeSchema.optional(),
    ...paginationFields
  })
  .superRefine(validateDateRange);

export type AdminFraudAlertsQuery = z.infer<typeof adminFraudAlertsQuerySchema>;

export const adminFraudAlertStatusSchema = z
  .object({
    status: z.enum([
      FraudAlertStatus.ACKNOWLEDGED,
      FraudAlertStatus.RESOLVED,
      FraudAlertStatus.DISMISSED
    ])
  })
  .strict();

export type AdminFraudAlertStatusInput = z.infer<typeof adminFraudAlertStatusSchema>;

export const adminReportsQuerySchema = z
  .object({
    from: isoDateTimeSchema,
    to: isoDateTimeSchema
  })
  .superRefine(validateDateRange);

export type AdminReportsQuery = z.infer<typeof adminReportsQuerySchema>;

export const adminReportsExportQuerySchema = z
  .object({
    from: isoDateTimeSchema,
    to: isoDateTimeSchema,
    format: z.enum(["csv"]).default("csv")
  })
  .superRefine(validateDateRange);

export type AdminReportsExportQuery = z.infer<typeof adminReportsExportQuerySchema>;
