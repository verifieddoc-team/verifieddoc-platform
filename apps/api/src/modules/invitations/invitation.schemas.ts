import { OrganizationRole } from "@prisma/client";
import { z } from "zod";

export const createInvitationSchema = z
  .object({
    email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
    role: z.enum([OrganizationRole.ORGANIZATION_ADMIN, OrganizationRole.ORGANIZATION_ISSUER]),
    expiresInHours: z.number().int().min(1).max(168).optional().default(72)
  })
  .strict();

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

export const acceptInvitationSchema = z
  .object({
    token: z.string().trim().min(1)
  })
  .strict();

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
