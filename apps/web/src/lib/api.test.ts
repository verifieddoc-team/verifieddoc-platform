import { afterEach, describe, expect, it, vi } from "vitest";
import { api, apiBaseUrl } from "./api";

describe("web API client contract paths", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses an /api/v1 base URL without a trailing slash", () => {
    expect(apiBaseUrl.endsWith("/api/v1")).toBe(true);
    expect(apiBaseUrl.endsWith("/api/v1/")).toBe(false);
  });

  it("calls canonical holder, credential, share-link, org, and admin paths with Bearer auth", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ url: String(input), init: init ?? {} });
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );

    await api.getHolderDashboard("access-token");
    await api.listWallet("access-token");
    await api.getCredential("access-token", "cred_1");
    await api.createShareLink("access-token", "cred_1", { expiresInHours: 24 });
    await api.listShareLinks("access-token", "cred_1");
    await api.revokeShareLink("access-token", "cred_1", "share_1");
    await api.issueCredential("access-token", "org_1", {
      holderEmail: "holder@example.com",
      title: "Certificate",
      credentialType: "TRAINING_CERTIFICATE",
      referenceNo: "REF-100",
      issuedAt: "2026-08-05T00:00:00.000Z",
    });
    await api.reviewOrganization("access-token", "org_1", {
      decision: "APPROVE",
    });
    await api.acceptInvitation("access-token", { token: "invite-token" });
    await api.login("holder@example.com", "password");
    await api.refresh("refresh-token");
    await api.logout("refresh-token");

    const paths = calls.map((call) => call.url.replace(apiBaseUrl, ""));
    expect(paths).toEqual([
      "/holder/dashboard",
      "/credentials?page=1&limit=50",
      "/credentials/cred_1",
      "/credentials/cred_1/share-links",
      "/credentials/cred_1/share-links",
      "/credentials/cred_1/share-links/share_1/revoke",
      "/organizations/org_1/credentials",
      "/admin/organizations/org_1/review",
      "/invitations/accept",
      "/auth/login",
      "/auth/refresh",
      "/auth/logout",
    ]);

    for (const call of calls.slice(0, 9)) {
      const headers = new Headers(call.init.headers);
      expect(headers.get("authorization")).toBe("Bearer access-token");
    }

    const reviewCall = calls.find((call) =>
      call.url.endsWith("/admin/organizations/org_1/review"),
    );
    expect(reviewCall?.init.method).toBe("PATCH");
    expect(JSON.parse(String(reviewCall?.init.body))).toEqual({
      decision: "APPROVE",
    });

    const loginCall = calls.find((call) => call.url.endsWith("/auth/login"));
    expect(new Headers(loginCall?.init.headers).get("authorization")).toBeNull();
  });
});
