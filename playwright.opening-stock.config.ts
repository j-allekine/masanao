import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Initial-count journeys need a clean posted-stock ledger, separate from the
// general suite's receiving/issuance fixture history.
export default defineConfig({ ...base, testDir: "./tests/opening-stock-e2e" });
