import { env } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { readSanitizedUpstreamError } from "../../lib/provider-errors.js";
import type {
  CreateSignedDownloadUrlParams,
  CreateSignedDownloadUrlResult,
  CreateSignedUploadUrlParams,
  CreateSignedUploadUrlResult,
  StorageService
} from "./types.js";
import { SUPABASE_SIGNED_UPLOAD_TTL_SECONDS } from "./types.js";

function requireSupabaseConfig() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.SUPABASE_STORAGE_BUCKET) {
    throw new AppError(503, "SERVICE_UNAVAILABLE", "Document storage is not configured");
  }

  return {
    baseUrl: env.SUPABASE_URL.replace(/\/+$/, ""),
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    bucket: env.SUPABASE_STORAGE_BUCKET
  };
}

function encodeObjectPath(path: string): string {
  return path
    .replace(/^\/+/, "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function objectUrl(baseUrl: string, bucket: string, path: string): string {
  return `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeObjectPath(path)}`;
}

function authHeaders(serviceRoleKey: string, extra: Record<string, string> = {}): Record<string, string> {
  return {
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
    ...extra
  };
}

/**
 * Resolve a Supabase Storage URL that may be absolute or relative.
 * Relative paths are joined under `{baseUrl}/storage/v1`.
 */
export function resolveSupabaseStorageUrl(baseUrl: string, maybeRelative: string): URL {
  const trimmed = maybeRelative.trim();
  if (!trimmed) {
    throw new AppError(503, "SERVICE_UNAVAILABLE", "Invalid signed upload response");
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return new URL(trimmed);
  }

  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (path.startsWith("/storage/v1/") || path === "/storage/v1") {
    return new URL(`${baseUrl}${path}`);
  }

  return new URL(`${baseUrl}/storage/v1${path}`);
}

export function extractSignedUploadToken(uploadUrl: URL): string {
  const token = uploadUrl.searchParams.get("token");
  if (!token) {
    throw new AppError(503, "SERVICE_UNAVAILABLE", "Invalid signed upload response");
  }
  return token;
}

async function logStorageFailure(
  operation: string,
  response: Response,
  bucket: string
): Promise<void> {
  const upstream = await readSanitizedUpstreamError(response);
  logger.error(
    {
      provider: "supabase-storage",
      operation,
      status: response.status,
      upstreamCode: upstream.code,
      upstreamMessage: upstream.message,
      bucket
    },
    "supabase-storage provider request failed"
  );
}

export class SupabaseStorageAdapter implements StorageService {
  async createSignedUploadUrl(params: CreateSignedUploadUrlParams): Promise<CreateSignedUploadUrlResult> {
    const { baseUrl, serviceRoleKey, bucket } = requireSupabaseConfig();
    const path = params.path.replace(/^\/+/, "");

    const headers = authHeaders(serviceRoleKey, {
      "Content-Type": "application/json"
    });
    // Official Supabase signed-upload signing uses x-upsert only when upsert is enabled.
    if (params.upsert === true) {
      headers["x-upsert"] = "true";
    }

    const response = await fetch(
      `${baseUrl}/storage/v1/object/upload/sign/${encodeURIComponent(bucket)}/${encodeObjectPath(path)}`,
      {
        method: "POST",
        headers,
        // Provider does not accept expiresIn for signed uploads; body must be {}.
        body: "{}"
      }
    );

    if (!response.ok) {
      await logStorageFailure("createSignedUploadUrl", response, bucket);
      throw new AppError(503, "SERVICE_UNAVAILABLE", "Unable to create signed upload URL");
    }

    let payload: { url?: unknown };
    try {
      payload = (await response.json()) as { url?: unknown };
    } catch {
      logger.error(
        {
          provider: "supabase-storage",
          operation: "createSignedUploadUrl",
          status: response.status,
          upstreamMessage: "invalid JSON response",
          bucket
        },
        "supabase-storage provider request failed"
      );
      throw new AppError(503, "SERVICE_UNAVAILABLE", "Unable to create signed upload URL");
    }

    if (typeof payload.url !== "string" || !payload.url.trim()) {
      logger.error(
        {
          provider: "supabase-storage",
          operation: "createSignedUploadUrl",
          status: response.status,
          upstreamMessage: "missing url field",
          bucket
        },
        "supabase-storage provider request failed"
      );
      throw new AppError(503, "SERVICE_UNAVAILABLE", "Unable to create signed upload URL");
    }

    const uploadUrl = resolveSupabaseStorageUrl(baseUrl, payload.url);
    const token = extractSignedUploadToken(uploadUrl);

    return {
      path,
      uploadUrl: uploadUrl.toString(),
      token,
      // Provider-fixed TTL (2 hours). Do not invent a shorter configurable expiry.
      expiresAt: new Date(Date.now() + SUPABASE_SIGNED_UPLOAD_TTL_SECONDS * 1000)
    };
  }

  async createSignedDownloadUrl(
    params: CreateSignedDownloadUrlParams
  ): Promise<CreateSignedDownloadUrlResult> {
    const { baseUrl, serviceRoleKey, bucket } = requireSupabaseConfig();
    const path = params.path.replace(/^\/+/, "");
    const expiresInSeconds = params.expiresInSeconds ?? 900;

    const response = await fetch(
      `${baseUrl}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${encodeObjectPath(path)}`,
      {
        method: "POST",
        headers: authHeaders(serviceRoleKey, { "Content-Type": "application/json" }),
        body: JSON.stringify({ expiresIn: expiresInSeconds })
      }
    );

    if (!response.ok) {
      await logStorageFailure("createSignedDownloadUrl", response, bucket);
      throw new AppError(503, "SERVICE_UNAVAILABLE", "Unable to create signed download URL");
    }

    const payload = (await response.json()) as { signedURL?: string; signedUrl?: string };
    const signedPath = payload.signedURL ?? payload.signedUrl;
    if (!signedPath) {
      throw new AppError(503, "SERVICE_UNAVAILABLE", "Invalid signed download response");
    }

    const downloadUrl = resolveSupabaseStorageUrl(baseUrl, signedPath).toString();

    return {
      downloadUrl,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000)
    };
  }

  async objectExists(path: string): Promise<boolean> {
    const { baseUrl, serviceRoleKey, bucket } = requireSupabaseConfig();
    const response = await fetch(objectUrl(baseUrl, bucket, path), {
      method: "HEAD",
      headers: authHeaders(serviceRoleKey)
    });

    if (response.status === 404) {
      return false;
    }

    if (!response.ok) {
      await logStorageFailure("objectExists", response, bucket);
      throw new AppError(503, "SERVICE_UNAVAILABLE", "Unable to check object existence");
    }

    return true;
  }

  async getObject(path: string): Promise<Buffer> {
    const { baseUrl, serviceRoleKey, bucket } = requireSupabaseConfig();
    const response = await fetch(objectUrl(baseUrl, bucket, path), {
      method: "GET",
      headers: authHeaders(serviceRoleKey)
    });

    if (response.status === 404) {
      throw new AppError(404, "NOT_FOUND", "Object not found");
    }

    if (!response.ok) {
      await logStorageFailure("getObject", response, bucket);
      throw new AppError(503, "SERVICE_UNAVAILABLE", "Unable to download object");
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async deleteObject(path: string): Promise<void> {
    const { baseUrl, serviceRoleKey, bucket } = requireSupabaseConfig();
    const normalized = path.replace(/^\/+/, "");

    const response = await fetch(`${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}`, {
      method: "DELETE",
      headers: authHeaders(serviceRoleKey, { "Content-Type": "application/json" }),
      body: JSON.stringify({ prefixes: [normalized] })
    });

    if (!response.ok && response.status !== 404) {
      await logStorageFailure("deleteObject", response, bucket);
      throw new AppError(503, "SERVICE_UNAVAILABLE", "Unable to delete object");
    }
  }

  /** Diagnostic helper: GET bucket metadata without logging secrets. */
  async getBucketMetadata(): Promise<{ status: number; ok: boolean; upstreamCode?: string; upstreamMessage?: string }> {
    const { baseUrl, serviceRoleKey, bucket } = requireSupabaseConfig();
    const response = await fetch(`${baseUrl}/storage/v1/bucket/${encodeURIComponent(bucket)}`, {
      method: "GET",
      headers: authHeaders(serviceRoleKey)
    });

    if (response.ok) {
      return { status: response.status, ok: true };
    }

    const upstream = await readSanitizedUpstreamError(response);
    return {
      status: response.status,
      ok: false,
      upstreamCode: upstream.code,
      upstreamMessage: upstream.message
    };
  }
}

let singleton: SupabaseStorageAdapter | undefined;

export function getSupabaseStorageAdapter(): SupabaseStorageAdapter {
  if (!singleton) {
    singleton = new SupabaseStorageAdapter();
  }
  return singleton;
}

export function isSupabaseStorageConfigured(): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && env.SUPABASE_STORAGE_BUCKET);
}

/** Test helper: reset the adapter singleton between cases. */
export function resetSupabaseStorageAdapterForTests() {
  singleton = undefined;
}
