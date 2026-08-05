export interface CreateSignedUploadUrlParams {
  path: string;
  contentType: string;
  expiresInSeconds?: number;
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
