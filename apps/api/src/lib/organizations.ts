import type { Organization, OrganizationRole } from "@prisma/client";

export type PublicOrganization = Pick<
  Organization,
  | "id"
  | "name"
  | "slug"
  | "registrationNumber"
  | "website"
  | "contactEmail"
  | "country"
  | "description"
  | "status"
  | "rejectionReason"
  | "reviewedAt"
  | "createdAt"
  | "updatedAt"
>;

export type AdminOrganization = PublicOrganization & {
  reviewedById: string | null;
};

export function toPublicOrganization(organization: Organization): PublicOrganization {
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    registrationNumber: organization.registrationNumber,
    website: organization.website,
    contactEmail: organization.contactEmail,
    country: organization.country,
    description: organization.description,
    status: organization.status,
    rejectionReason: organization.rejectionReason,
    reviewedAt: organization.reviewedAt,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt
  };
}

export function toAdminOrganization(organization: Organization): AdminOrganization {
  return {
    ...toPublicOrganization(organization),
    reviewedById: organization.reviewedById
  };
}

export interface OrganizationMembershipView {
  organization: PublicOrganization;
  membershipRole: OrganizationRole;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function buildPaginationMetadata(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit)
  };
}
