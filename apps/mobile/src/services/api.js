const baseUrl = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function buildQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

async function request(path, options = {}, accessToken) {
  if (!path.startsWith("/")) {
    throw new Error(`API path must be relative and start with "/": ${path}`);
  }

  const headers = new Headers(options.headers);
  if (options.body) headers.set("content-type", "application/json");
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  if (!response.ok) {
    let payload;
    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }
    throw new ApiError(
      payload?.error.code ?? "REQUEST_FAILED",
      payload?.error.message ?? "The request could not be completed.",
      response.status,
    );
  }
  if (response.status === 204) return undefined;
  return await response.json();
}

/**
 * Canonical paths are relative to EXPO_PUBLIC_API_BASE_URL (…/api/v1).
 * Do not call the base URL alone. Do not invent /verifier/* or /organizations/me/* routes.
 */
export const mobileApi = {
  baseUrl,
  health() {
    return request("/health");
  },
  ready() {
    return request("/ready");
  },
  login(email, password) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  register(input) {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  refresh(refreshToken) {
    return request("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  },
  logout(refreshToken) {
    return request("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  },
  me(accessToken) {
    return request("/auth/me", {}, accessToken);
  },
  getHolderDashboard(accessToken) {
    return request("/holder/dashboard", {}, accessToken);
  },
  wallet(accessToken, params = {}) {
    return request(
      `/credentials${buildQuery({
        page: params.page ?? 1,
        limit: params.limit ?? 50,
        status: params.status,
      })}`,
      {},
      accessToken,
    );
  },
  getCredential(accessToken, credentialId) {
    return request(
      `/credentials/${encodeURIComponent(credentialId)}`,
      {},
      accessToken,
    );
  },
  createShareLink(accessToken, credentialId, input) {
    return request(
      `/credentials/${encodeURIComponent(credentialId)}/share-links`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  listShareLinks(accessToken, credentialId) {
    return request(
      `/credentials/${encodeURIComponent(credentialId)}/share-links`,
      {},
      accessToken,
    );
  },
  revokeShareLink(accessToken, credentialId, shareLinkId) {
    return request(
      `/credentials/${encodeURIComponent(credentialId)}/share-links/${encodeURIComponent(shareLinkId)}/revoke`,
      { method: "PATCH" },
      accessToken,
    );
  },
  verify(token) {
    return request(`/verify/${encodeURIComponent(token)}`);
  },
  listOrganizations(accessToken) {
    return request("/organizations", {}, accessToken);
  },
  issueCredential(accessToken, organizationId, input) {
    return request(
      `/organizations/${encodeURIComponent(organizationId)}/credentials`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  listOrganizationCredentials(accessToken, organizationId, params = {}) {
    return request(
      `/organizations/${encodeURIComponent(organizationId)}/credentials${buildQuery({
        page: params.page ?? 1,
        limit: params.limit ?? 50,
        status: params.status,
      })}`,
      {},
      accessToken,
    );
  },
  revokeOrganizationCredential(accessToken, organizationId, credentialId, input) {
    return request(
      `/organizations/${encodeURIComponent(organizationId)}/credentials/${encodeURIComponent(credentialId)}/revoke`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
  acceptInvitation(accessToken, token) {
    return request(
      "/invitations/accept",
      {
        method: "POST",
        body: JSON.stringify({ token }),
      },
      accessToken,
    );
  },
  listAdminOrganizations(accessToken, params = {}) {
    return request(
      `/admin/organizations${buildQuery({
        status: params.status ?? "PENDING",
        page: params.page ?? 1,
        limit: params.limit ?? 50,
      })}`,
      {},
      accessToken,
    );
  },
  reviewOrganization(accessToken, organizationId, input) {
    return request(
      `/admin/organizations/${encodeURIComponent(organizationId)}/review`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
      accessToken,
    );
  },
};
