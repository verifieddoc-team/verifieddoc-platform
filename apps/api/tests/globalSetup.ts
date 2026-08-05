import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import {
  applyTestEnvironment,
  getTestDatabaseName,
  toMaintenanceDatabaseUrl
} from "./loadTestEnv.js";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function ensureTestDatabaseExists(databaseUrl: string) {
  const databaseName = getTestDatabaseName(databaseUrl);
  const admin = new PrismaClient({
    datasources: {
      db: {
        url: toMaintenanceDatabaseUrl(databaseUrl)
      }
    }
  });

  try {
    const existing = await admin.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = '${databaseName}') AS "exists"`
    );

    if (!existing[0]?.exists) {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
    }
  } finally {
    await admin.$disconnect();
  }
}

export default async function globalSetup() {
  const testEnv = applyTestEnvironment();
  const databaseUrl = testEnv.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("TEST DATABASE_URL was not configured for API tests");
  }

  await ensureTestDatabaseExists(databaseUrl);

  execSync("npx prisma migrate deploy", {
    cwd: apiRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      ...testEnv
    }
  });
}
