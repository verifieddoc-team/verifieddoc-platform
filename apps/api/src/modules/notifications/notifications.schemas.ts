import { z } from "zod";

export const listNotificationsQuerySchema = z.object({
  unreadOnly: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "true"),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20)
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
