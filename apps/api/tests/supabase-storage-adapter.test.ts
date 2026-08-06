import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "../src/config/env.js";
import { AppError } from "../src/lib/errors.js";
import { logger } from "../src/lib/logger.js";
import {
  extractSignedUploadToken,
  resetSupabaseStorageAdapterForTests,
  resolveSupabaseStorageUrl,
  SupabaseStorageAdapter
} from "../src/services/storage/supabase-storage.adapter.js";
import { SUPABASE_SIGNED_UPLOAD_TTL_SECONDS } from "../src/services/storage/types.js";

const SERVICE_ROLE_KEY = "service-role-test-key-do-not-log";
const BASE_URL = "https://example.supabase.co";
const BUCKET = "verifieddoc-docs";

describe("SupabaseStorageAdapter signed upload", () => {
  const originalFetch = globalThis.fetch;
  const previous = {
    url: env.SUPABASE_URL,
    key: env.SUPABASE_SERVICE_ROLE_KEY,
    bucket: env.SUPABASE_STORAGE_BUCKET
  };

  beforeEach(() => {
    env.SUPABASE_URL = BASE_URL;
    env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_ROLE_KEY;
    env.SUPABASE_STORAGE_BUCKET = BUCKET;
    resetSupabaseStorageAdapterForTests();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    env.SUPABASE_URL = previous.url;
    env.SUPABASE_SERVICE_ROLE_KEY = previous.key;
    env.SUPABASE_STORAGE_BUCKET = previous.bucket;
    resetSupabaseStorageAdapterForTests();
    vi.restoreAllMocks();
  });

  it("sends {} and does not send expiresIn; extracts token from payload.url", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe("{}");
      expect(String(init?.body)).not.toContain("expiresIn");
      const headers = init?.headers as Record<string, string>;
      expect(headers["x-upsert"]).toBeUndefined();

      return new Response(
        JSON.stringify({
          url: `/object/upload/sign/${BUCKET}/org/docs/file.pdf?token=upload-token-from-url`
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const adapter = new SupabaseStorageAdapter();
    const result = await adapter.createSignedUploadUrl({
      path: "org/docs/file.pdf",
      contentType: "application/pdf",
      expiresInSeconds: 900
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toBe(
      `${BASE_URL}/storage/v1/object/upload/sign/${encodeURIComponent(BUCKET)}/org/docs/file.pdf`
    );

    expect(result.token).toBe("upload-token-from-url");
    expect(result.uploadUrl).toContain("token=upload-token-from-url");
    expect(result.uploadUrl.startsWith("https://")).toBe(true);
    expect(result.expiresAt.getTime()).toBeGreaterThan(
      Date.now() + (SUPABASE_SIGNED_UPLOAD_TTL_SECONDS - 5) * 1000
    );
  });

  it("does not require a separate payload.token field", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          url: `https://example.supabase.co/storage/v1/object/upload/sign/${BUCKET}/a.bin?token=only-in-url`
        }),
        { status: 200 }
      )
    ) as unknown as typeof fetch;

    const adapter = new SupabaseStorageAdapter();
    const result = await adapter.createSignedUploadUrl({
      path: "a.bin",
      contentType: "application/octet-stream"
    });

    expect(result.token).toBe("only-in-url");
  });

  it("handles absolute and relative provider URLs", () => {
    const relative = resolveSupabaseStorageUrl(
      BASE_URL,
      `/object/upload/sign/${BUCKET}/x.pdf?token=rel`
    );
    expect(relative.toString()).toBe(
      `${BASE_URL}/storage/v1/object/upload/sign/${BUCKET}/x.pdf?token=rel`
    );

    const absolute = resolveSupabaseStorageUrl(
      BASE_URL,
      `${BASE_URL}/storage/v1/object/upload/sign/${BUCKET}/y.pdf?token=abs`
    );
    expect(absolute.toString()).toBe(
      `${BASE_URL}/storage/v1/object/upload/sign/${BUCKET}/y.pdf?token=abs`
    );

    expect(extractSignedUploadToken(relative)).toBe("rel");
  });

  it("rejects missing token query parameter", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ url: `/object/upload/sign/${BUCKET}/no-token.pdf` }), {
        status: 200
      })
    ) as unknown as typeof fetch;

    const adapter = new SupabaseStorageAdapter();
    await expect(
      adapter.createSignedUploadUrl({
        path: "no-token.pdf",
        contentType: "application/pdf"
      })
    ).rejects.toMatchObject({
      status: 503,
      code: "SERVICE_UNAVAILABLE"
    });
  });

  it("returns generic SERVICE_UNAVAILABLE for bucket-not-found and unauthorized", async () => {
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => undefined as never);

    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ statusCode: "404", error: "Bucket not found", message: "Bucket not found" }), {
        status: 404
      })
    ) as unknown as typeof fetch;

    const adapter = new SupabaseStorageAdapter();
    await expect(
      adapter.createSignedUploadUrl({ path: "x.pdf", contentType: "application/pdf" })
    ).rejects.toBeInstanceOf(AppError);
    await expect(
      adapter.createSignedUploadUrl({ path: "x.pdf", contentType: "application/pdf" })
    ).rejects.toMatchObject({
      status: 503,
      code: "SERVICE_UNAVAILABLE",
      message: "Unable to create signed upload URL"
    });

    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: "Unauthorized", message: "Invalid API key" }), {
        status: 401
      })
    ) as unknown as typeof fetch;

    await expect(
      adapter.createSignedUploadUrl({ path: "y.pdf", contentType: "application/pdf" })
    ).rejects.toMatchObject({
      status: 503,
      code: "SERVICE_UNAVAILABLE",
      message: "Unable to create signed upload URL"
    });

    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).toContain("supabase-storage");
    expect(logged).toContain("Bucket not found");
    expect(logged).toContain("Unauthorized");
    expect(logged).not.toContain(SERVICE_ROLE_KEY);
    expect(logged).not.toContain("Bearer ");
    expect(logged).not.toContain("token=");
  });

  it("sends x-upsert only when upsert is explicitly enabled", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string>;
      expect(headers["x-upsert"]).toBe("true");
      return new Response(
        JSON.stringify({
          url: `/object/upload/sign/${BUCKET}/upsert.pdf?token=upsert-token`
        }),
        { status: 200 }
      );
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const adapter = new SupabaseStorageAdapter();
    await adapter.createSignedUploadUrl({
      path: "upsert.pdf",
      contentType: "application/pdf",
      upsert: true
    });
  });
});
