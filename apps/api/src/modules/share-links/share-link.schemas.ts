import { z } from "zod";

const MAX_DISCLOSED_CLAIMS = 20;

const claimNameSchema = z.string().trim().min(1).max(100);

export const createShareLinkSchema = z
  .object({
    expiresInHours: z.number().int().min(1).max(168),
    maxViews: z.number().int().min(1).max(100).optional(),
    disclosedClaims: z.array(claimNameSchema).max(MAX_DISCLOSED_CLAIMS).optional().default([]),
    includeHolderName: z.boolean().optional().default(false),
    includeReferenceNo: z.boolean().optional().default(false)
  })
  .strict()
  .superRefine((value, context) => {
    const uniqueClaims = new Set(value.disclosedClaims);

    if (uniqueClaims.size !== value.disclosedClaims.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "disclosedClaims must contain unique claim names",
        path: ["disclosedClaims"]
      });
    }
  });

export type CreateShareLinkInput = z.infer<typeof createShareLinkSchema>;
