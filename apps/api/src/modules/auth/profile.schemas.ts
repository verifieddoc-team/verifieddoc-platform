import { z } from "zod";

export const updateProfileSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional()
  })
  .refine((data) => data.firstName !== undefined || data.lastName !== undefined, {
    message: "At least one field must be provided"
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
