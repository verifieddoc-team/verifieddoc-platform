import {
  OrganizationDocumentType,
  OrganizationStatus,
  VerificationRequestStatus
} from "@prisma/client";
import { z } from "zod";
import { normalizeIndustryInput } from "../../lib/industries.js";

const REGISTRATION_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
const REGISTRATION_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png"
] as const;

const slugSchema = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .pipe(
    z
      .string()
      .min(3, "Slug must be at least 3 characters")
      .max(100, "Slug must be at most 100 characters")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must contain lowercase letters, numbers, and hyphens")
  );

const secureWebsiteSchema = z
  .string()
  .trim()
  .max(500)
  .superRefine((value, context) => {
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(value);
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Website must be a valid http:// or https:// URL"
      });
      return;
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Website must use http:// or https://"
      });
    }
  });

export const createOrganizationSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    slug: slugSchema,
    registrationNumber: z.string().trim().min(1).max(100).optional(),
    website: secureWebsiteSchema.optional(),
    contactEmail: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
    country: z.string().trim().min(2).max(100),
    description: z.string().trim().min(1).max(2000).optional(),
    /** Figma-only optional metadata; not required by the PRD. */
    industry: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .transform((value) => normalizeIndustryInput(value))
      .optional(),
    /** Figma-only optional metadata; HR email/phone are not required on create. */
    hrContactName: z.string().trim().min(1).max(200).optional()
  })
  .strict();

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const updateOrganizationSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    registrationNumber: z.string().trim().min(1).max(100).nullable().optional(),
    website: secureWebsiteSchema.nullable().optional(),
    contactEmail: z
      .string()
      .trim()
      .email()
      .max(320)
      .transform((value) => value.toLowerCase())
      .optional(),
    country: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().min(1).max(2000).nullable().optional(),
    industry: z.string().trim().min(2).max(100).nullable().optional(),
    hrContactName: z.string().trim().min(1).max(200).nullable().optional(),
    hrContactEmail: z
      .string()
      .trim()
      .email()
      .max(320)
      .transform((value) => value.toLowerCase())
      .nullable()
      .optional(),
    hrContactPhone: z.string().trim().min(3).max(32).nullable().optional()
  })
  .strict()
  .superRefine((value, context) => {
    if (Object.keys(value).length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field must be provided"
      });
    }
  });

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

export const adminOrganizationListQuerySchema = z.object({
  status: z.nativeEnum(OrganizationStatus).optional().default(OrganizationStatus.PENDING),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20)
});

export type AdminOrganizationListQuery = z.infer<typeof adminOrganizationListQuerySchema>;

export const reviewOrganizationSchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT"]),
    rejectionReason: z.string().trim().min(1).max(1000).optional()
  })
  .strict()
  .superRefine((value, context) => {
    if (value.decision === "REJECT" && !value.rejectionReason) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "rejectionReason is required when decision is REJECT",
        path: ["rejectionReason"]
      });
    }
  });

export type ReviewOrganizationInput = z.infer<typeof reviewOrganizationSchema>;

export const organizationVerificationRequestsQuerySchema = z.object({
  status: z.nativeEnum(VerificationRequestStatus).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20)
});

export type OrganizationVerificationRequestsQuery = z.infer<
  typeof organizationVerificationRequestsQuerySchema
>;

export const reviewVerificationRequestSchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT"]),
    note: z.string().trim().min(1).max(2000).optional()
  })
  .strict();

export type ReviewVerificationRequestInput = z.infer<typeof reviewVerificationRequestSchema>;

export const registrationDocumentUploadUrlSchema = z
  .object({
    documentType: z.nativeEnum(OrganizationDocumentType),
    originalFileName: z.string().trim().min(1).max(255),
    mimeType: z.enum(REGISTRATION_DOCUMENT_MIME_TYPES),
    sizeBytes: z.number().int().positive().max(REGISTRATION_DOCUMENT_MAX_BYTES)
  })
  .strict();

export type RegistrationDocumentUploadUrlInput = z.infer<typeof registrationDocumentUploadUrlSchema>;

export const reviewRegistrationDocumentSchema = z
  .object({
    decision: z.enum(["VERIFY", "REJECT"]),
    rejectionReason: z.string().trim().min(1).max(1000).optional()
  })
  .strict()
  .superRefine((value, context) => {
    if (value.decision === "REJECT" && !value.rejectionReason) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "rejectionReason is required when decision is REJECT",
        path: ["rejectionReason"]
      });
    }
  });

export type ReviewRegistrationDocumentInput = z.infer<typeof reviewRegistrationDocumentSchema>;

export const REGISTRATION_DOCUMENT_ALLOWED_MIME_TYPES = REGISTRATION_DOCUMENT_MIME_TYPES;
export const REGISTRATION_DOCUMENT_MAX_SIZE_BYTES = REGISTRATION_DOCUMENT_MAX_BYTES;