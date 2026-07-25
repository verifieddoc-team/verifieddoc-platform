import type {
  ApiErrorPayload,
  AuthSession,
  CreateShareLinkResponse,
  PaginatedResponse,
  PublicVerificationResponse,
  SafeCredential,
} from "@verifieddoc/contracts";

const baseUrl = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1"
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
  if (options.body) headers.set("content-type", "application/json");
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
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
  return (await response.json()) as T;
}

export const mobileApi = {
  login(email: string, password: string) {
    return request<AuthSession>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  wallet(accessToken: string) {
    return request<PaginatedResponse<SafeCredential>>(
      "/credentials?page=1&limit=50",
      {},
      accessToken,
    );
  },
  createShareLink(
    accessToken: string,
    credentialId: string,
    input: {
      expiresInHours: number;
      maxViews?: number;
      disclosedClaims: string[];
      includeHolderName: boolean;
      includeReferenceNo: boolean;
    },
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
  verify(token: string) {
    return request<PublicVerificationResponse>(
      `/verify/${encodeURIComponent(token)}`,
    );
  },
};
