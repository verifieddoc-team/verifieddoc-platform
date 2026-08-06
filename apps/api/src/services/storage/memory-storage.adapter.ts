import { randomBytes } from "node:crypto";
import { AppError } from "../../lib/errors.js";
import type {
  CreateSignedDownloadUrlParams,
  CreateSignedDownloadUrlResult,
  CreateSignedUploadUrlParams,
  CreateSignedUploadUrlResult,
  StorageService
} from "./types.js";

interface StoredObject {
  data: Buffer;
  contentType: string;
}

const objects = new Map<string, StoredObject>();
const uploadTokens = new Map<string, { path: string; expiresAt: Date; contentType: string }>();

export class MemoryStorageAdapter implements StorageService {
  async createSignedUploadUrl(params: CreateSignedUploadUrlParams): Promise<CreateSignedUploadUrlResult> {
    const expiresInSeconds = params.expiresInSeconds ?? 900;
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const token = randomBytes(24).toString("base64url");
    const path = params.path.replace(/^\/+/, "");

    uploadTokens.set(token, {
      path,
      expiresAt,
      contentType: params.contentType
    });

    return {
      path,
      uploadUrl: `memory://upload/${encodeURIComponent(path)}?token=${token}`,
      token,
      expiresAt
    };
  }

  async createSignedDownloadUrl(
    params: CreateSignedDownloadUrlParams
  ): Promise<CreateSignedDownloadUrlResult> {
    const path = params.path.replace(/^\/+/, "");
    if (!objects.has(path)) {
      throw new AppError(404, "NOT_FOUND", "Object not found");
    }

    const expiresInSeconds = params.expiresInSeconds ?? 900;
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const token = randomBytes(24).toString("base64url");

    return {
      downloadUrl: `memory://download/${encodeURIComponent(path)}?token=${token}&expires=${expiresAt.getTime()}`,
      expiresAt
    };
  }

  async objectExists(path: string): Promise<boolean> {
    return objects.has(path.replace(/^\/+/, ""));
  }

  async getObject(path: string): Promise<Buffer> {
    const stored = objects.get(path.replace(/^\/+/, ""));
    if (!stored) {
      throw new AppError(404, "NOT_FOUND", "Object not found");
    }
    return Buffer.from(stored.data);
  }

  async deleteObject(path: string): Promise<void> {
    objects.delete(path.replace(/^\/+/, ""));
  }

  /** Test/helper: complete a signed upload or write an object directly. */
  async putObject(path: string, data: Buffer, contentType = "application/octet-stream"): Promise<void> {
    objects.set(path.replace(/^\/+/, ""), {
      data: Buffer.from(data),
      contentType
    });
  }

  async completeSignedUpload(token: string, data: Buffer): Promise<string> {
    const pending = uploadTokens.get(token);
    if (!pending) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid upload token");
    }
    if (pending.expiresAt <= new Date()) {
      uploadTokens.delete(token);
      throw new AppError(400, "VALIDATION_ERROR", "Upload token expired");
    }

    await this.putObject(pending.path, data, pending.contentType);
    uploadTokens.delete(token);
    return pending.path;
  }
}

let singleton: MemoryStorageAdapter | undefined;

export function getMemoryStorageAdapter(): MemoryStorageAdapter {
  if (!singleton) {
    singleton = new MemoryStorageAdapter();
  }
  return singleton;
}

export function clearMemoryStorage(): void {
  objects.clear();
  uploadTokens.clear();
}
