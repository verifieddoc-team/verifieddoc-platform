import { z } from "zod";

const isoDateSchema = z.string().trim().min(1);

export const organizationAuditLogQuerySchema = z.object({
  action: z.string().trim().min(1).max(100).optional(),
  resourceType: z.string().trim().min(1).max(100).optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20)
});

export type OrganizationAuditLogQuery = z.infer<typeof organizationAuditLogQuerySchema>;

export const platformAuditLogQuerySchema = organizationAuditLogQuerySchema.extend({
  organizationId: z.string().trim().min(1).optional(),
  actorId: z.string().trim().min(1).optional()
});

export type PlatformAuditLogQuery = z.infer<typeof platformAuditLogQuerySchema>;
