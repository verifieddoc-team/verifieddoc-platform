import type {
  AcceptInvitationInput,
  AcceptInvitationResponse,
  AdminOrganization,
  ApiErrorPayload,
  AuthSession,
  CreateInvitationInput,
  CreateInvitationResponse,
  CreateOrganizationInput,
  CreateShareLinkInput,
  CreateShareLinkResponse,
  HolderDashboardResponse,
  HolderCredentialSummary,
  IssueCredentialInput,
  InvitationSummary,
  LoginInput,
  OrganizationMemberProfile,
  OrganizationMembershipView,
  OrganizationRole,
  PaginatedResponse,
  PublicUser,
  PublicVerificationResponse,
  RegisterInput,
  ReviewOrganizationInput,
  RevokeCredentialInput,
  SafeAuditLogEntry,
  SafeCredential,
  ServiceHealth,
  ServiceReadiness,
  ShareLinkSummary,
} from "@verifieddoc/contracts";

export const apiBaseUrl = (
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

function buildQuery(params?: Record<string, string | number | undefined>) {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  if (!path.startsWith("/")) {
    throw new Error(`API path must be relative and start with "/": ${path}`);
  }

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
  health() {
    return request<ServiceHealth>("/health");
  },
  ready() {
    return request<ServiceReadiness>("/ready");
  },
  login(email: string, password: string) {
    const body: LoginInput = { email, password };
    return request<AuthSession>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  register(input: RegisterInput) {
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
    return request<{ user: PublicUser }>("/auth/me", {}, accessToken);
  },
  getHolderDashboard(accessToken: string) {
    return request<HolderDashboardResponse>("/holder/dashboard", {}, accessToken);
  },
  verifyCredential(token: string) {
    return request<PublicVerificationResponse>(
      `/verify/${encodeURIComponent(token)}`,
    );
  },
  listWallet(
    accessToken: string,
    params?: { status?: string; page?: number; limit?: number },
  ) {
    return request<PaginatedResponse<HolderCredentialSummary>>(
      `/credentials${buildQuery({
        page: params?.page ?? 1,
        limit: params?.limit ?? 50,
        status: params?.status,
      })}`,
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
  createOrganization(accessToken: string, input: CreateOrganizationInput) {
    return request<{
      organization: OrganizationMembershipView["organization"];
      membershipRole: OrganizationRole;
    }>("/organizations", {
      method: "POST",
      body: JSON.stringify(input),
    }, accessToken);
  },
  listOrganizations(accessToken: string) {
    return request<{ organizations: OrganizationMembershipView[] }>(
      "/organizations",
      {},
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
  listOrganizationCredentials(
    accessToken: string,
    organizationId: string,
    params?: { status?: string; page?: number; limit?: number },
  ) {
    return request<PaginatedResponse<SafeCredential>>(
      `/organizations/${encodeURIComponent(organizationId)}/credentials${buildQuery({
        page: params?.page ?? 1,
        limit: params?.limit ?? 50,
        status: params?.status,
      })}`,
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
  revokeOrganizationCredential(
    accessToken: string,
    organizationId: string,
    credentialId: string,
    input: RevokeCredentialInput,
  ) {
    return request<{ credential: SafeCredential }>(
      `/organizations/${encodeURIComponent(organizationId)}/credentials/${encodeURIComponent(credentialId)}/revoke`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
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
  updateOrganizationMemberRole(
    accessToken: string,
    organizationId: string,
    userId: string,
    role: OrganizationRole,
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
  createOrganizationInvitation(
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
  listOrganizationInvitations(accessToken: string, organizationId: string) {
    return request<{ data: InvitationSummary[] }>(
      `/organizations/${encodeURIComponent(organizationId)}/invitations`,
      {},
      accessToken,
    );
  },
  revokeOrganizationInvitation(
    accessToken: string,
    organizationId: string,
    invitationId: string,
  ) {
    return request<{ invitation: InvitationSummary }>(
      `/organizations/${encodeURIComponent(organizationId)}/invitations/${encodeURIComponent(invitationId)}/revoke`,
      { method: "PATCH" },
      accessToken,
    );
  },
  acceptInvitation(accessToken: string, input: AcceptInvitationInput) {
    return request<AcceptInvitationResponse>(
      "/invitations/accept",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  listOrganizationAudit(
    accessToken: string,
    organizationId: string,
    params?: { page?: number; limit?: number },
  ) {
    return request<PaginatedResponse<SafeAuditLogEntry>>(
      `/organizations/${encodeURIComponent(organizationId)}/audit-logs${buildQuery({
        page: params?.page ?? 1,
        limit: params?.limit ?? 50,
      })}`,
      {},
      accessToken,
    );
  },
  listAdminOrganizations(
    accessToken: string,
    params?: { status?: string; page?: number; limit?: number },
  ) {
    return request<PaginatedResponse<AdminOrganization>>(
      `/admin/organizations${buildQuery({
        status: params?.status ?? "PENDING",
        page: params?.page ?? 1,
        limit: params?.limit ?? 50,
      })}`,
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
  listAdminAuditLogs(
    accessToken: string,
    params?: { page?: number; limit?: number; organizationId?: string },
  ) {
    return request<PaginatedResponse<SafeAuditLogEntry>>(
      `/admin/audit-logs${buildQuery({
        page: params?.page ?? 1,
        limit: params?.limit ?? 50,
        organizationId: params?.organizationId,
      })}`,
      {},
      accessToken,
    );
  },
};
