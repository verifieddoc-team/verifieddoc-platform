import { z } from "zod";

export const holderActivityTypeSchema = z.enum([
  "CREDENTIAL_ISSUED",
  "SHARE_LINK_CREATED",
  "VERIFICATION_EVENT",
  "VERIFICATION_REQUEST"
]);

export type HolderActivityType = z.infer<typeof holderActivityTypeSchema>;

export const holderActivityQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  type: holderActivityTypeSchema.optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional()
});

export type HolderActivityQuery = z.infer<typeof holderActivityQuerySchema>;

export const holderVerificationRequestsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20)
});

export type HolderVerificationRequestsQuery = z.infer<typeof holderVerificationRequestsQuerySchema>;

export const personalDocumentUploadUrlSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    documentType: z.string().trim().min(1).max(100),
    originalFileName: z.string().trim().min(1).max(255),
    mimeType: z
      .string()
      .trim()
      .min(3)
      .max(200)
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_+.]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_+.]*$/),
    sizeBytes: z.number().int().positive().max(25 * 1024 * 1024)
  })
  .strict();

export type PersonalDocumentUploadUrlInput = z.infer<typeof personalDocumentUploadUrlSchema>;
