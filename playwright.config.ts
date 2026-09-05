import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { defineConfig } from "@playwright/test";

const configuredDatabasePath = process.env.MASANAO_E2E_DATABASE_PATH?.trim();
const e2eDatabasePath = (
  configuredDatabasePath ?? join(tmpdir(), `masanao-e2e-${randomUUID()}.db`)
).replaceAll("\\", "/");
const e2eDatabaseUrl = `file:${e2eDatabasePath}`;
const e2eDistDir = process.env.NEXT_DIST_DIR ?? `.next-e2e-${randomUUID()}`;
const e2eAuthSecret =
  "e2e-only-secret-that-is-long-enough-for-better-auth-testing";
const requestedPort = Number(process.env.MASANAO_E2E_PORT);
const e2ePort =
  Number.isInteger(requestedPort) && requestedPort >= 1024 && requestedPort <= 65535
    ? requestedPort
    : 3019;
const e2eBaseUrl = `http://localhost:${e2ePort}`;

process.env.MASANAO_E2E_TSCONFIG_CONTENT = readFileSync(
  join(process.cwd(), "tsconfig.json"),
  "utf8",
);
process.env.MASANAO_E2E_DATABASE_PATH = e2eDatabasePath;
process.env.DATABASE_URL = e2eDatabaseUrl;
process.env.BETTER_AUTH_SECRET = e2eAuthSecret;
process.env.BETTER_AUTH_URL = e2eBaseUrl;
process.env.NEXT_DIST_DIR = e2eDistDir;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  workers: 1,
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL: e2eBaseUrl,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `pnpm exec next dev --hostname 127.0.0.1 --port ${e2ePort}`,
    env: {
      DATABASE_URL: e2eDatabaseUrl,
      MASANAO_E2E_DATABASE_PATH: e2eDatabasePath,
      BETTER_AUTH_SECRET: e2eAuthSecret,
      BETTER_AUTH_URL: e2eBaseUrl,
      DISABLE_ERD: "true",
      NEXT_DIST_DIR: e2eDistDir,
    },
    reuseExistingServer: false,
    timeout: 120_000,
    url: e2eBaseUrl,
  },
});
