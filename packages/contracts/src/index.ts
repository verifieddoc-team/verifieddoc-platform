export type PlatformRole = "HOLDER" | "VERIFIER" | "PLATFORM_ADMIN";

export type OrganizationRole =
  | "ORGANIZATION_ADMIN"
  | "ORGANIZATION_ISSUER";

export type OrganizationStatus =
  | "PENDING"
  | "VERIFIED"
  | "REJECTED"
  | "SUSPENDED";

export type CredentialStatus = "ACTIVE" | "EXPIRED" | "REVOKED";
export type ShareLinkState = "ACTIVE" | "EXPIRED" | "REVOKED" | "EXHAUSTED";
export type InvitationState = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
export type VerificationResult = "VALID" | "EXPIRED" | "REVOKED";

export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: PlatformRole;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  registrationNumber: string | null;
  website: string | null;
  contactEmail: string;
  country: string;
  description: string | null;
  status: OrganizationStatus;
  rejectionReason: string | null;
  reviewedAt: string | null;
  reviewedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMembershipView {
  organization: Organization;
  membershipRole: OrganizationRole;
}

export interface OrganizationMemberProfile {
  user: PublicUser;
  membershipRole: OrganizationRole;
  joinedAt: string;
}

export type SafeClaimValue = string | number | boolean | null;
export type SafeClaims = Record<string, SafeClaimValue>;

export interface CredentialOrganizationSummary {
  id?: string;
  name: string;
  slug: string;
}

export interface SafeCredential {
  id: string;
  publicId: string;
  title: string;
  description: string | null;
  credentialType: string;
  referenceNo: string;
  status: CredentialStatus;
  effectiveStatus: CredentialStatus;
  issuedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  revocationReason: string | null;
  claims: SafeClaims | null;
  organization: CredentialOrganizationSummary;
  holder?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface ShareLinkSummary {
  id: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  maxViews: number | null;
  viewCount: number;
  lastViewedAt: string | null;
  disclosedClaims: string[];
  includeHolderName: boolean;
  includeReferenceNo: boolean;
  state: ShareLinkState;
  verificationUrl?: string;
}

export interface CreateShareLinkResponse {
  shareLink: ShareLinkSummary;
  token: string;
  verificationPath: string;
  verificationUrl: string;
}

export interface InvitationSummary {
  id: string;
  email: string;
  role: OrganizationRole;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  state: InvitationState;
  invitationUrl?: string;
}

export interface PublicVerifiedCredential {
  publicId: string;
  title: string;
  credentialType: string;
  effectiveStatus: CredentialStatus;
  issuedAt: string;
  expiresAt: string | null;
  revokedAt?: string;
  organization: {
    name: string;
    slug: string;
  };
  holderName?: string;
  referenceNo?: string;
  claims?: SafeClaims;
}

export interface PublicVerificationResponse {
  result: VerificationResult;
  credential: PublicVerifiedCredential;
}

export interface SafeAuditLogEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  organizationId: string | null;
  actor: PublicUser | null;
  ipAddress: string | null;
  userAgent: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
