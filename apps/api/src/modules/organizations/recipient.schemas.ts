import { z } from "zod";

export const createRecipientInvitationSchema = z
  .object({
    email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
    expiresInHours: z.number().int().min(1).max(168).optional().default(72)
  })
  .strict();

export type CreateRecipientInvitationInput = z.infer<typeof createRecipientInvitationSchema>;

export const acceptRecipientInvitationSchema = z
  .object({
    token: z.string().trim().min(1)
  })
  .strict();

export type AcceptRecipientInvitationInput = z.infer<typeof acceptRecipientInvitationSchema>;
