import type {
  AcceptInvitationResponse,
  AdminOrganization,
  ApiErrorPayload,
  AuthSession,
  CreateInvitationInput,
  CreateInvitationResponse,
  CreateOrganizationInput,
  CreateShareLinkInput,
  CreateShareLinkResponse,
  IssueCredentialInput,
  OrganizationMemberProfile,
  PaginatedResponse,
  PublicVerificationResponse,
  ReviewOrganizationInput,
  SafeAuditLogEntry,
  SafeCredential,
  ShareLinkSummary,
  OrganizationMembershipView,
} from "@verifieddoc/contracts";

const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let payload: ApiErrorPayload | undefined;
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      payload = undefined;
    }
    throw new ApiError(
      payload?.error.code ?? "REQUEST_FAILED",
      payload?.error.message ?? "The request could not be completed.",
      response.status,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  login(email: string, password: string) {
    return request<AuthSession>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  register(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: "HOLDER" | "VERIFIER";
  }) {
    return request<AuthSession>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  refresh(refreshToken: string) {
    return request<AuthSession>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  },
  logout(refreshToken: string) {
    return request<void>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  },
  me(accessToken: string) {
    return request<{ user: AuthSession["user"] }>("/auth/me", {}, accessToken);
  },
  verifyCredential(token: string) {
    return request<PublicVerificationResponse>(
      `/verify/${encodeURIComponent(token)}`,
    );
  },
  listWallet(accessToken: string) {
    return request<PaginatedResponse<SafeCredential>>(
      "/credentials?page=1&limit=50",
      {},
      accessToken,
    );
  },
  getCredential(accessToken: string, credentialId: string) {
    return request<{ credential: SafeCredential }>(
      `/credentials/${encodeURIComponent(credentialId)}`,
      {},
      accessToken,
    );
  },
  createShareLink(
    accessToken: string,
    credentialId: string,
    input: CreateShareLinkInput,
  ) {
    return request<CreateShareLinkResponse>(
      `/credentials/${encodeURIComponent(credentialId)}/share-links`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  listShareLinks(accessToken: string, credentialId: string) {
    return request<{ data: ShareLinkSummary[] }>(
      `/credentials/${encodeURIComponent(credentialId)}/share-links`,
      {},
      accessToken,
    );
  },
  revokeShareLink(
    accessToken: string,
    credentialId: string,
    shareLinkId: string,
  ) {
    return request<{ shareLink: ShareLinkSummary }>(
      `/credentials/${encodeURIComponent(credentialId)}/share-links/${encodeURIComponent(shareLinkId)}/revoke`,
      { method: "PATCH" },
      accessToken,
    );
  },
  listOrganizations(accessToken: string) {
    return request<{ organizations: OrganizationMembershipView[] }>(
      "/organizations",
      {},
      accessToken,
    );
  },
  applyForOrganization(accessToken: string, input: CreateOrganizationInput) {
    return request<OrganizationMembershipView>(
      "/organizations",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  getOrganization(accessToken: string, organizationId: string) {
    return request<OrganizationMembershipView>(
      `/organizations/${encodeURIComponent(organizationId)}`,
      {},
      accessToken,
    );
  },
  listOrganizationCredentials(accessToken: string, organizationId: string) {
    return request<PaginatedResponse<SafeCredential>>(
      `/organizations/${encodeURIComponent(organizationId)}/credentials?page=1&limit=100`,
      {},
      accessToken,
    );
  },
  issueCredential(
    accessToken: string,
    organizationId: string,
    input: IssueCredentialInput,
  ) {
    return request<{ credential: SafeCredential }>(
      `/organizations/${encodeURIComponent(organizationId)}/credentials`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  revokeCredential(
    accessToken: string,
    organizationId: string,
    credentialId: string,
    reason: string,
  ) {
    return request<{ credential: SafeCredential }>(
      `/organizations/${encodeURIComponent(organizationId)}/credentials/${encodeURIComponent(credentialId)}/revoke`,
      {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      },
      accessToken,
    );
  },
  listOrganizationMembers(accessToken: string, organizationId: string) {
    return request<{ members: OrganizationMemberProfile[] }>(
      `/organizations/${encodeURIComponent(organizationId)}/members`,
      {},
      accessToken,
    );
  },
  updateOrganizationMember(
    accessToken: string,
    organizationId: string,
    userId: string,
    role: OrganizationMemberProfile["membershipRole"],
  ) {
    return request<{ member: OrganizationMemberProfile }>(
      `/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(userId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ role }),
      },
      accessToken,
    );
  },
  removeOrganizationMember(
    accessToken: string,
    organizationId: string,
    userId: string,
  ) {
    return request<void>(
      `/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(userId)}`,
      { method: "DELETE" },
      accessToken,
    );
  },
  listInvitations(accessToken: string, organizationId: string) {
    return request<{ data: import("@verifieddoc/contracts").InvitationSummary[] }>(
      `/organizations/${encodeURIComponent(organizationId)}/invitations`,
      {},
      accessToken,
    );
  },
  createInvitation(
    accessToken: string,
    organizationId: string,
    input: CreateInvitationInput,
  ) {
    return request<CreateInvitationResponse>(
      `/organizations/${encodeURIComponent(organizationId)}/invitations`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  revokeInvitation(
    accessToken: string,
    organizationId: string,
    invitationId: string,
  ) {
    return request<{ invitation: import("@verifieddoc/contracts").InvitationSummary }>(
      `/organizations/${encodeURIComponent(organizationId)}/invitations/${encodeURIComponent(invitationId)}/revoke`,
      { method: "PATCH" },
      accessToken,
    );
  },
  acceptInvitation(accessToken: string, token: string) {
    return request<AcceptInvitationResponse>(
      "/invitations/accept",
      {
        method: "POST",
        body: JSON.stringify({ token }),
      },
      accessToken,
    );
  },
  listOrganizationAudit(accessToken: string, organizationId: string) {
    return request<PaginatedResponse<SafeAuditLogEntry>>(
      `/organizations/${organizationId}/audit-logs?page=1&limit=50`,
      {},
      accessToken,
    );
  },
  listAdminOrganizations(
    accessToken: string,
    status: AdminOrganization["status"] = "PENDING",
  ) {
    return request<PaginatedResponse<AdminOrganization>>(
      `/admin/organizations?status=${encodeURIComponent(status)}&page=1&limit=100`,
      {},
      accessToken,
    );
  },
  reviewOrganization(
    accessToken: string,
    organizationId: string,
    input: ReviewOrganizationInput,
  ) {
    return request<{ organization: AdminOrganization }>(
      `/admin/organizations/${encodeURIComponent(organizationId)}/review`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  listPlatformAudit(accessToken: string) {
    return request<PaginatedResponse<SafeAuditLogEntry>>(
      "/admin/audit-logs?page=1&limit=100",
      {},
      accessToken,
    );
  },
  health() {
    return request<{ status: string; service: string; version: string }>("/health");
  },
  ready() {
    return request<{ status: string; service: string }>("/ready");
  },
};
