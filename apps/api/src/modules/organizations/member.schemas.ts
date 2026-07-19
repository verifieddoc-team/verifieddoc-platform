import { OrganizationRole } from "@prisma/client";
import { z } from "zod";

export const updateMemberRoleSchema = z
  .object({
    role: z.enum([OrganizationRole.ORGANIZATION_ADMIN, OrganizationRole.ORGANIZATION_ISSUER])
  })
  .strict();

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
