/**
 * Safe Supabase storage diagnostic.
 *
 * Confirms configuration presence, GETs the configured bucket, and requests a
 * signed upload URL for a disposable diagnostics path. Never prints secrets,
 * signed URLs, or tokens. Never uploads a real document.
 *
 * Usage:
 *   npm run diagnostics:storage --workspace=@verifieddoc/api
 */
import { randomBytes } from "node:crypto";
import { env } from "../src/config/env.js";
import {
  getSupabaseStorageAdapter,
  isSupabaseStorageConfigured
} from "../src/services/storage/supabase-storage.adapter.js";

function present(label: string, value: unknown): void {
  console.log(`${label}: ${value ? "set" : "MISSING"}`);
}

async function main() {
  console.log("VerifiedDoc storage diagnostic");
  console.log("------------------------------");
  present("SUPABASE_URL", env.SUPABASE_URL);
  present("SUPABASE_SERVICE_ROLE_KEY", env.SUPABASE_SERVICE_ROLE_KEY);
  present("SUPABASE_STORAGE_BUCKET", env.SUPABASE_STORAGE_BUCKET);
  console.log(`DOCUMENT_UPLOADS_ENABLED: ${env.DOCUMENT_UPLOADS_ENABLED}`);
  console.log(`bucket name: ${env.SUPABASE_STORAGE_BUCKET ?? "(unset)"}`);

  if (!isSupabaseStorageConfigured()) {
    console.error("FAIL: required Supabase storage variables are missing");
    process.exitCode = 1;
    return;
  }

  const adapter = getSupabaseStorageAdapter();

  const bucketResult = await adapter.getBucketMetadata();
  console.log(`GET bucket status: ${bucketResult.status}`);
  if (!bucketResult.ok) {
    console.error(
      `FAIL: bucket check failed code=${bucketResult.upstreamCode ?? "n/a"} message=${bucketResult.upstreamMessage ?? "n/a"}`
    );
    process.exitCode = 1;
    return;
  }
  console.log("GET bucket: ok");

  const diagnosticsPath = `diagnostics/${new Date().toISOString().slice(0, 10)}/${randomBytes(8).toString("hex")}.bin`;

  try {
    const signed = await adapter.createSignedUploadUrl({
      path: diagnosticsPath,
      contentType: "application/octet-stream"
    });
    // Intentionally do not print uploadUrl or token.
    console.log("createSignedUploadUrl: ok");
    console.log(`expiresAt: ${signed.expiresAt.toISOString()}`);
    console.log(`path prefix: diagnostics/`);
    console.log("PASS: storage provider checks succeeded (no file uploaded)");
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error(`FAIL: signed upload URL request failed (${message})`);
    console.error("Inspect Railway/API logs for sanitized supabase-storage provider details.");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("FAIL: unexpected diagnostic error");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
