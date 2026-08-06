import { z } from "zod";

export const pageLimitSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export type PageLimitInput = z.infer<typeof pageLimitSchema>;

export function paginationSkipTake(page: number, limit: number) {
  return {
    skip: (page - 1) * limit,
    take: limit
  };
}

export function paginationMeta(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit))
  };
}
