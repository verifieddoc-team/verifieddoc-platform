import { defineConfig } from "vitest/config";
import { applyTestEnvironment } from "./tests/loadTestEnv.js";

const testEnv = applyTestEnvironment();

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./tests/globalSetup.ts"],
    env: testEnv,
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 30_000,
    teardownTimeout: 10_000
  }
});
