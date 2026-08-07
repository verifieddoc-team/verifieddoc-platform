const baseUrl = (
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  "http://localhost:4000/api/v1"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request(path, options = {}, accessToken) {
  const headers = new Headers(options.headers);

  if (options.body) {
    headers.set("content-type", "application/json");
  }

  if (accessToken) {
    headers.set(
      "authorization",
      `Bearer ${accessToken}`
    );
  }

  const response = await fetch(
    `${baseUrl}${path}`,
    {
      ...options,
      headers,
    }
  );

  if (!response.ok) {
    let payload;

    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }

    throw new ApiError(
      payload?.error?.code ?? "REQUEST_FAILED",
      payload?.error?.message ??
        "The request could not be completed.",
      response.status
    );
  }

  // Some successful API operations, such as logout,
  // intentionally return no response body.
  if (response.status === 204) {
    return null;
  }

  return await response.json();
}

export const mobileApi = {
  // Authentication

  login(email, password) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
      }),
    });
  },

  register(input) {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  me(accessToken) {
    return request(
      "/auth/me",
      {},
      accessToken
    );
  },

  refresh(refreshToken) {
    return request("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({
        refreshToken,
      }),
    });
  },

  logout(refreshToken) {
    return request("/auth/logout", {
      method: "POST",
      body: JSON.stringify({
        refreshToken,
      }),
    });
  },

  // Organizations

  organizations(accessToken) {
    return request(
      "/organizations",
      {},
      accessToken
    );
  },

  organization(accessToken, organizationId) {
    return request(
      `/organizations/${encodeURIComponent(
        organizationId
      )}`,
      {},
      accessToken
    );
  },

  organizationCredentials(
    accessToken,
    organizationId
  ) {
    return request(
      `/organizations/${encodeURIComponent(
        organizationId
      )}/credentials?page=1&limit=50`,
      {},
      accessToken
    );
  },

  issueOrganizationCredential(
    accessToken,
    organizationId,
    input
  ) {
    return request(
      `/organizations/${encodeURIComponent(
        organizationId
      )}/credentials`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      accessToken
    );
  },

  revokeOrganizationCredential(
    accessToken,
    organizationId,
    credentialId,
    reason
  ) {
    return request(
      `/organizations/${encodeURIComponent(
        organizationId
      )}/credentials/${encodeURIComponent(
        credentialId
      )}/revoke`,
      {
        method: "PATCH",
        body: JSON.stringify({
          reason,
        }),
      },
      accessToken
    );
  },

  // Holder wallet

  wallet(accessToken) {
    return request(
      "/credentials?page=1&limit=50",
      {},
      accessToken
    );
  },

  credential(accessToken, credentialId) {
    return request(
      `/credentials/${encodeURIComponent(
        credentialId
      )}`,
      {},
      accessToken
    );
  },

  // Credential sharing

  shareLinks(accessToken, credentialId) {
    return request(
      `/credentials/${encodeURIComponent(
        credentialId
      )}/share-links`,
      {},
      accessToken
    );
  },

  createShareLink(
    accessToken,
    credentialId,
    input
  ) {
    return request(
      `/credentials/${encodeURIComponent(
        credentialId
      )}/share-links`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      accessToken
    );
  },

  revokeShareLink(
    accessToken,
    credentialId,
    shareLinkId
  ) {
    return request(
      `/credentials/${encodeURIComponent(
        credentialId
      )}/share-links/${encodeURIComponent(
        shareLinkId
      )}/revoke`,
      {
        method: "PATCH",
      },
      accessToken
    );
  },

  // Public verification

  verify(token) {
    return request(
      `/verify/${encodeURIComponent(token)}`
    );
  },
};
