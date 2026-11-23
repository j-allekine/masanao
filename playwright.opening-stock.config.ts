import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// These singleton journeys run on their own database, never the general suite's.
export default defineConfig({
  ...base,
  testDir: "./tests/opening-stock-e2e",
  workers: 1,
  fullyParallel: false,
  globalSetup: "./tests/opening-stock-e2e/global-setup.ts",
});
