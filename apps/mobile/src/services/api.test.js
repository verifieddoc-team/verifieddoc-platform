import { describe, expect, it, jest, afterEach } from "@jest/globals";
import { mobileApi } from "./api";

describe("mobile API client contract paths", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("uses an /api/v1 base URL without a trailing slash", () => {
    expect(mobileApi.baseUrl.endsWith("/api/v1")).toBe(true);
    expect(mobileApi.baseUrl.endsWith("/api/v1/")).toBe(false);
  });

  it("calls canonical holder dashboard and verify paths", async () => {
    const calls = [];
    global.fetch = jest.fn(async (url, init = {}) => {
      calls.push({ url: String(url), init });
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      };
    });

    await mobileApi.getHolderDashboard("access-token");
    await mobileApi.wallet("access-token");
    await mobileApi.verify("share-token");
    await mobileApi.reviewOrganization("access-token", "org_1", {
      decision: "APPROVE",
    });

    const paths = calls.map((call) => call.url.replace(mobileApi.baseUrl, ""));
    expect(paths).toEqual([
      "/holder/dashboard",
      "/credentials?page=1&limit=50",
      "/verify/share-token",
      "/admin/organizations/org_1/review",
    ]);
    expect(calls[0].init.headers.get("authorization")).toBe("Bearer access-token");
  });
});
