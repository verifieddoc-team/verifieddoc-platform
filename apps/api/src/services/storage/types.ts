export interface CreateSignedUploadUrlParams {
  path: string;
  contentType: string;
  /**
   * Optional TTL hint for adapters that support custom expiry (e.g. in-memory).
   * Supabase signed upload URLs are fixed at two hours by the provider; that
   * adapter ignores this value for the upstream request and returns the real
   * provider expiry on `expiresAt`.
   */
  expiresInSeconds?: number;
  /** When true and supported, allow overwriting an existing object at the path. */
  upsert?: boolean;
}

export interface CreateSignedUploadUrlResult {
  path: string;
  uploadUrl: string;
  token: string;
  expiresAt: Date;
}

export interface CreateSignedDownloadUrlParams {
  path: string;
  expiresInSeconds?: number;
}

export interface CreateSignedDownloadUrlResult {
  downloadUrl: string;
  expiresAt: Date;
}

export interface StorageService {
  createSignedUploadUrl(params: CreateSignedUploadUrlParams): Promise<CreateSignedUploadUrlResult>;
  createSignedDownloadUrl(params: CreateSignedDownloadUrlParams): Promise<CreateSignedDownloadUrlResult>;
  objectExists(path: string): Promise<boolean>;
  getObject(path: string): Promise<Buffer>;
  deleteObject(path: string): Promise<void>;
}

/** Supabase Storage signed upload URLs are fixed at two hours. */
export const SUPABASE_SIGNED_UPLOAD_TTL_SECONDS = 2 * 60 * 60;
