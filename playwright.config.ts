import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { defineConfig } from "@playwright/test";

const e2eDatabasePath = join(
  tmpdir(),
  `masanao-e2e-${randomUUID()}.db`,
).replaceAll("\\", "/");
const e2eDatabaseUrl = `file:${e2eDatabasePath}`;
const e2eDistDir = `.next-e2e-${randomUUID()}`;
const e2eAuthSecret =
  "e2e-only-secret-that-is-long-enough-for-better-auth-testing";
const e2eBaseUrl = "http://localhost:3019";

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
    command: "pnpm exec next dev --hostname 127.0.0.1 --port 3019",
    env: {
      DATABASE_URL: e2eDatabaseUrl,
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
