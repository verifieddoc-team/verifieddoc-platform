import { env } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";
import type {
  CreateSignedDownloadUrlParams,
  CreateSignedDownloadUrlResult,
  CreateSignedUploadUrlParams,
  CreateSignedUploadUrlResult,
  StorageService
} from "./types.js";

function requireSupabaseConfig() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.SUPABASE_STORAGE_BUCKET) {
    throw new AppError(
      503,
      "SERVICE_UNAVAILABLE",
      "Document storage is not configured"
    );
  }

  return {
    baseUrl: env.SUPABASE_URL.replace(/\/+$/, ""),
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    bucket: env.SUPABASE_STORAGE_BUCKET
  };
}

function objectUrl(baseUrl: string, bucket: string, path: string): string {
  const normalized = path.replace(/^\/+/, "");
  return `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${normalized
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

export class SupabaseStorageAdapter implements StorageService {
  async createSignedUploadUrl(params: CreateSignedUploadUrlParams): Promise<CreateSignedUploadUrlResult> {
    const { baseUrl, serviceRoleKey, bucket } = requireSupabaseConfig();
    const path = params.path.replace(/^\/+/, "");
    const expiresInSeconds = params.expiresInSeconds ?? 900;

    const response = await fetch(
      `${baseUrl}/storage/v1/object/upload/sign/${encodeURIComponent(bucket)}/${path
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/")}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ expiresIn: expiresInSeconds })
      }
    );

    if (!response.ok) {
      throw new AppError(503, "SERVICE_UNAVAILABLE", "Unable to create signed upload URL");
    }

    const payload = (await response.json()) as { url?: string; token?: string };
    if (!payload.url || !payload.token) {
      throw new AppError(503, "SERVICE_UNAVAILABLE", "Invalid signed upload response");
    }

    const uploadUrl = payload.url.startsWith("http")
      ? payload.url
      : `${baseUrl}/storage/v1${payload.url.startsWith("/") ? "" : "/"}${payload.url}`;

    return {
      path,
      uploadUrl,
      token: payload.token,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000)
    };
  }

  async createSignedDownloadUrl(
    params: CreateSignedDownloadUrlParams
  ): Promise<CreateSignedDownloadUrlResult> {
    const { baseUrl, serviceRoleKey, bucket } = requireSupabaseConfig();
    const path = params.path.replace(/^\/+/, "");
    const expiresInSeconds = params.expiresInSeconds ?? 900;

    const response = await fetch(
      `${baseUrl}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${path
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/")}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ expiresIn: expiresInSeconds })
      }
    );

    if (!response.ok) {
      throw new AppError(503, "SERVICE_UNAVAILABLE", "Unable to create signed download URL");
    }

    const payload = (await response.json()) as { signedURL?: string; signedUrl?: string };
    const signedPath = payload.signedURL ?? payload.signedUrl;
    if (!signedPath) {
      throw new AppError(503, "SERVICE_UNAVAILABLE", "Invalid signed download response");
    }

    const downloadUrl = signedPath.startsWith("http")
      ? signedPath
      : `${baseUrl}/storage/v1${signedPath.startsWith("/") ? "" : "/"}${signedPath}`;

    return {
      downloadUrl,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000)
    };
  }

  async objectExists(path: string): Promise<boolean> {
    const { baseUrl, serviceRoleKey, bucket } = requireSupabaseConfig();
    const response = await fetch(objectUrl(baseUrl, bucket, path), {
      method: "HEAD",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey
      }
    });

    if (response.status === 404) {
      return false;
    }

    if (!response.ok) {
      throw new AppError(503, "SERVICE_UNAVAILABLE", "Unable to check object existence");
    }

    return true;
  }

  async getObject(path: string): Promise<Buffer> {
    const { baseUrl, serviceRoleKey, bucket } = requireSupabaseConfig();
    const response = await fetch(objectUrl(baseUrl, bucket, path), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey
      }
    });

    if (response.status === 404) {
      throw new AppError(404, "NOT_FOUND", "Object not found");
    }

    if (!response.ok) {
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
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prefixes: [normalized] })
    });

    if (!response.ok && response.status !== 404) {
      throw new AppError(503, "SERVICE_UNAVAILABLE", "Unable to delete object");
    }
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
