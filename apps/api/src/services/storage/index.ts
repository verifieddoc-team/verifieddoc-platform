import { env } from "../../config/env.js";
import { clearMemoryStorage, getMemoryStorageAdapter } from "./memory-storage.adapter.js";
import { getSupabaseStorageAdapter, isSupabaseStorageConfigured } from "./supabase-storage.adapter.js";
import type { StorageService } from "./types.js";

export type {
  CreateSignedDownloadUrlParams,
  CreateSignedDownloadUrlResult,
  CreateSignedUploadUrlParams,
  CreateSignedUploadUrlResult,
  StorageService
} from "./types.js";
export { clearMemoryStorage, getMemoryStorageAdapter };
export { isSupabaseStorageConfigured };

export function isDocumentStorageConfigured(): boolean {
  return env.DOCUMENT_UPLOADS_ENABLED && isSupabaseStorageConfigured();
}

export function getStorageService(): StorageService {
  if (env.NODE_ENV === "test") {
    return getMemoryStorageAdapter();
  }

  if (env.DOCUMENT_UPLOADS_ENABLED && isSupabaseStorageConfigured()) {
    return getSupabaseStorageAdapter();
  }

  if (env.NODE_ENV !== "production") {
    return getMemoryStorageAdapter();
  }

  // Production without storage config: return Supabase adapter so callers get SERVICE_UNAVAILABLE.
  return getSupabaseStorageAdapter();
}
