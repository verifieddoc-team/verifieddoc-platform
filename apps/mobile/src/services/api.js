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

async function request(path, options = {}, accessToken) {
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
  return await response.json();
}

export const mobileApi = {
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

  me(accessToken) {
    return request("/auth/me", {}, accessToken);
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

  organizations(accessToken) {
    return request("/organizations", {}, accessToken);
  },

  wallet(accessToken) {
    return request("/credentials?page=1&limit=50", {}, accessToken);
  },
credential(accessToken, credentialId) {
  return request(
    `/credentials/${encodeURIComponent(credentialId)}`,
    {},
    accessToken,
  );
},

shareLinks(accessToken, credentialId) {
  return request(
    `/credentials/${encodeURIComponent(credentialId)}/share-links`,
    {},
    accessToken,
  );
},

revokeShareLink(accessToken, credentialId, shareLinkId) {
  return request(
    `/credentials/${encodeURIComponent(
      credentialId
    )}/share-links/${encodeURIComponent(
      shareLinkId
    )}/revoke`,
    {
      method: "PATCH",
    },
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

  verify(token) {
    return request(`/verify/${encodeURIComponent(token)}`);
  },
};
