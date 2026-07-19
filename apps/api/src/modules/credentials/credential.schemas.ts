import { CredentialStatus, OrganizationRole } from "@prisma/client";
import { z } from "zod";

const MAX_ISSUED_AT_FUTURE_MS = 365 * 24 * 60 * 60 * 1000;
const MAX_CLAIM_KEYS = 20;
const MAX_CLAIM_KEY_LENGTH = 100;
const MAX_CLAIM_STRING_LENGTH = 500;
const PROHIBITED_CLAIM_KEYS = new Set(["__proto__", "prototype", "constructor"]);

const claimKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_CLAIM_KEY_LENGTH)
  .superRefine((key, context) => {
    if (PROHIBITED_CLAIM_KEYS.has(key)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Claim key "${key}" is not allowed`
      });
    }
  });

const claimValueSchema = z.union([
  z.string().max(MAX_CLAIM_STRING_LENGTH),
  z.number(),
  z.boolean(),
  z.null()
]);

export const claimsSchema = z
  .record(claimKeySchema, claimValueSchema)
  .superRefine((value, context) => {
    if (Object.keys(value).length > MAX_CLAIM_KEYS) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Claims may contain no more than ${MAX_CLAIM_KEYS} keys`
      });
    }
  });

export const issueCredentialSchema = z
  .object({
    holderEmail: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
    title: z.string().trim().min(1).max(200),
    credentialType: z.string().trim().min(1).max(100),
    referenceNo: z.string().trim().min(3).max(100),
    description: z.string().trim().min(1).max(2000).optional(),
    issuedAt: z.coerce.date(),
    expiresAt: z.coerce.date().optional(),
    claims: claimsSchema.optional()
  })
  .strict()
  .superRefine((value, context) => {
    const latestAllowedIssuedAt = new Date(Date.now() + MAX_ISSUED_AT_FUTURE_MS);
    if (value.issuedAt.getTime() > latestAllowedIssuedAt.getTime()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "issuedAt cannot be more than one year in the future",
        path: ["issuedAt"]
      });
    }

    if (value.expiresAt && value.expiresAt.getTime() <= value.issuedAt.getTime()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "expiresAt must be later than issuedAt",
        path: ["expiresAt"]
      });
    }
  });

export type IssueCredentialInput = z.infer<typeof issueCredentialSchema>;

export const holderCredentialListQuerySchema = z.object({
  status: z.nativeEnum(CredentialStatus).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20)
});

export type HolderCredentialListQuery = z.infer<typeof holderCredentialListQuerySchema>;

export const organizationCredentialListQuerySchema = z.object({
  status: z.nativeEnum(CredentialStatus).optional(),
  holderId: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20)
});

export type OrganizationCredentialListQuery = z.infer<typeof organizationCredentialListQuerySchema>;

export const revokeCredentialSchema = z
  .object({
    reason: z.string().trim().min(5).max(1000)
  })
  .strict();

export type RevokeCredentialInput = z.infer<typeof revokeCredentialSchema>;

export const CREDENTIAL_ISSUER_ROLES = [
  OrganizationRole.ORGANIZATION_ADMIN,
  OrganizationRole.ORGANIZATION_ISSUER
] as const;
