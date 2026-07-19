import { z } from "zod";

const isoDateTimeSchema = z
  .string()
  .trim()
  .min(1, "Datetime value cannot be empty")
  .datetime({ offset: true, message: "Must be a valid ISO 8601 datetime with a timezone offset or Z suffix" });

const auditLogQueryBaseFields = {
  action: z.string().trim().min(1).max(100).optional(),
  resourceType: z.string().trim().min(1).max(100).optional(),
  from: isoDateTimeSchema.optional(),
  to: isoDateTimeSchema.optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20)
};

type AuditDateRangeInput = {
  from?: string;
  to?: string;
};

function validateAuditDateRange(data: AuditDateRangeInput, context: z.RefinementCtx) {
  if (data.from && data.to && new Date(data.from).getTime() > new Date(data.to).getTime()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "from must be less than or equal to to",
      path: ["from"]
    });
  }
}

export const organizationAuditLogQuerySchema = z
  .object(auditLogQueryBaseFields)
  .superRefine(validateAuditDateRange);

export type OrganizationAuditLogQuery = z.infer<typeof organizationAuditLogQuerySchema>;

export const platformAuditLogQuerySchema = z
  .object({
    ...auditLogQueryBaseFields,
    organizationId: z.string().trim().min(1).optional(),
    actorId: z.string().trim().min(1).optional()
  })
  .superRefine(validateAuditDateRange);

export type PlatformAuditLogQuery = z.infer<typeof platformAuditLogQuerySchema>;
