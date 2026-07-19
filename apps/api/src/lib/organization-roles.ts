import { OrganizationRole } from "@prisma/client";
import { z } from "zod";

export const organizationRoleSchema = z.nativeEnum(OrganizationRole);

export const ORGANIZATION_MEMBERSHIP_ROLES = [
  OrganizationRole.ORGANIZATION_ADMIN,
  OrganizationRole.ORGANIZATION_ISSUER
] as const;

export function isOrganizationRole(value: unknown): value is OrganizationRole {
  return organizationRoleSchema.safeParse(value).success;
}
