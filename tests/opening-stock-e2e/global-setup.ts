import { copyFileSync } from "node:fs";
import globalSetup from "../e2e/global-setup";
import { openingStockBaselinePath } from "./database-fixture";

export default async function openingStockGlobalSetup() {
  await globalSetup();
  const databasePath = process.env.MASANAO_E2E_DATABASE_PATH!;
  // Setup has closed its SQLite connection. Preserve only this run's seed.
  copyFileSync(databasePath, openingStockBaselinePath(databasePath));
}
