import type {
  ApiErrorPayload,
  AuthSession,
  PaginatedResponse,
  PublicVerificationResponse,
  SafeAuditLogEntry,
  SafeCredential,
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
  listOrganizations(accessToken: string) {
    return request<{ organizations: OrganizationMembershipView[] }>(
      "/organizations",
      {},
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
};
