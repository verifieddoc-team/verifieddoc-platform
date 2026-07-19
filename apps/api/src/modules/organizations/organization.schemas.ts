import { OrganizationStatus } from "@prisma/client";
import { z } from "zod";

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
    description: z.string().trim().min(1).max(2000).optional()
  })
  .strict();

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

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