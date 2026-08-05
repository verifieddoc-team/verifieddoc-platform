import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const DEFAULT_TEST_DATABASE_URL =
  "postgresql://verifieddoc:verifieddoc@localhost:5432/verifieddoc_test?schema=public";

export const DETERMINISTIC_TEST_ENV = {
  NODE_ENV: "test",
  PUBLIC_WEB_URL: "http://localhost:3000",
  CORS_ORIGINS: "http://localhost:3000",
  JWT_ACCESS_SECRET: "test-access-secret-with-at-least-32-characters",
  JWT_REFRESH_SECRET: "test-refresh-secret-with-at-least-32-characters"
} as const;

/**
 * Apply isolated API test environment values.
 *
 * Database URL precedence:
 * 1. Existing process.env.TEST_DATABASE_URL (CI/shell)
 * 2. Optional apps/api/.env.test TEST_DATABASE_URL
 * 3. Default local verifieddoc_test URL
 *
 * Deterministic values always win for NODE_ENV, PUBLIC_WEB_URL, CORS_ORIGINS,
 * and test-only JWT secrets.
 *
 * apps/api/.env is intentionally not loaded for tests, so development Supabase
 * DATABASE_URL / PUBLIC_WEB_URL values cannot silently leak into the suite.
 */
export function applyTestEnvironment(): Record<string, string> {
  loadEnv({
    path: path.join(apiRoot, ".env.test"),
    override: false
  });

  const databaseUrl = process.env.TEST_DATABASE_URL?.trim() || DEFAULT_TEST_DATABASE_URL;

  const testEnv: Record<string, string> = {
    ...DETERMINISTIC_TEST_ENV,
    DATABASE_URL: databaseUrl,
    TEST_DATABASE_URL: databaseUrl
  };

  Object.assign(process.env, testEnv);
  return testEnv;
}

export function getTestDatabaseName(databaseUrl = process.env.DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL): string {
  const parsed = new URL(databaseUrl);
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, "").split("/")[0] ?? "");

  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(databaseName)) {
    throw new Error(`Refusing to use unsafe test database name: ${databaseName}`);
  }

  return databaseName;
}

export function toMaintenanceDatabaseUrl(databaseUrl: string): string {
  const parsed = new URL(databaseUrl);
  parsed.pathname = "/postgres";
  return parsed.toString();
}
