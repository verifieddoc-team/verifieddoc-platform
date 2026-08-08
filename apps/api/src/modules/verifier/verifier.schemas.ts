import {
  VerificationMethod,
  VerificationOutcome,
  VerificationRequestStatus
} from "@prisma/client";
import { z } from "zod";

export const verifierDashboardQuerySchema = z.object({}).strict().optional();

export const createVerificationSchema = z.discriminatedUnion("method", [
  z
    .object({
      method: z.literal(VerificationMethod.SHARE_TOKEN),
      token: z.string().trim().min(1).max(500)
    })
    .strict(),
  z
    .object({
      method: z.literal(VerificationMethod.QR),
      token: z.string().trim().min(1).max(500)
    })
    .strict(),
  z
    .object({
      method: z.literal(VerificationMethod.PUBLIC_ID),
      publicId: z.string().trim().min(1).max(100)
    })
    .strict()
]);

export type CreateVerificationInput = z.infer<typeof createVerificationSchema>;

export const listVerificationsQuerySchema = z.object({
  result: z.nativeEnum(VerificationOutcome).optional(),
  method: z.nativeEnum(VerificationMethod).optional(),
  organizationId: z.string().trim().min(1).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20)
});

export type ListVerificationsQuery = z.infer<typeof listVerificationsQuerySchema>;

export const saveOrganizationSchema = z
  .object({
    organizationId: z.string().trim().min(1)
  })
  .strict();

export type SaveOrganizationInput = z.infer<typeof saveOrganizationSchema>;

export const createVerificationRequestSchema = z
  .object({
    credentialPublicId: z.string().trim().min(1).optional(),
    /** @deprecated Prefer credentialPublicId (PRD canonical). */
    credentialId: z.string().trim().min(1).optional(),
    note: z.string().trim().min(1).max(2000).optional(),
    /** @deprecated Prefer note. */
    requesterNote: z.string().trim().min(1).max(2000).optional()
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.credentialPublicId && !value.credentialId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "credentialPublicId is required",
        path: ["credentialPublicId"]
      });
    }
  });

export type CreateVerificationRequestInput = z.infer<typeof createVerificationRequestSchema>;

export const listVerificationRequestsQuerySchema = z.object({
  status: z.nativeEnum(VerificationRequestStatus).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20)
});

export type ListVerificationRequestsQuery = z.infer<typeof listVerificationRequestsQuerySchema>;

export const fileVerificationUploadUrlSchema = z
  .object({
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

export type FileVerificationUploadUrlInput = z.infer<typeof fileVerificationUploadUrlSchema>;
