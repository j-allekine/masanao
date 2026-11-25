import Database from "better-sqlite3";
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { openingStockBaselinePath, restoreOpeningStockBaseline } from "./opening-stock-e2e/database-fixture";

it("restores singleton journeys in place while retaining seeded fixtures and leaving sibling databases alone", () => {
  const directory = mkdtempSync(join(tmpdir(), "masanao-opening-browser-"));
  const path = join(directory, "journeys.db");
  const siblingPath = join(directory, "general.db");
  const seed = new Database(path);
  seed.exec(`
    CREATE TABLE vendor (id TEXT PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE opening_stock_setup (id TEXT PRIMARY KEY, status TEXT NOT NULL);
    CREATE TABLE opening_stock_source (id TEXT PRIMARY KEY, setupId TEXT REFERENCES opening_stock_setup(id));
    INSERT INTO vendor VALUES ('seeded-vendor', 'Seeded receiving fixture');
  `);
  seed.close();
  copyFileSync(path, openingStockBaselinePath(path));
  copyFileSync(path, siblingPath);
  // Keep the app-like connection open across both resets, including its statement.
  const app = new Database(path);
  const general = new Database(siblingPath);
  const current = app.prepare("SELECT * FROM opening_stock_setup");
  try {
    general.exec("INSERT INTO opening_stock_setup VALUES ('sibling-count', 'posted')");
    for (let journey = 0; journey < 2; journey++) {
      app.exec(`INSERT INTO opening_stock_setup VALUES ('opening-stock', 'posted'); INSERT INTO opening_stock_source VALUES ('source', 'opening-stock'); DELETE FROM vendor;`);
      restoreOpeningStockBaseline(path);
      expect(current.all()).toEqual([]);
      expect(app.prepare("SELECT * FROM opening_stock_source").all()).toEqual([]);
      expect(app.prepare("SELECT name FROM vendor").get()).toEqual({ name: "Seeded receiving fixture" });
      expect(app.pragma("foreign_key_check")).toEqual([]);
      expect(general.prepare("SELECT status FROM opening_stock_setup").get()).toEqual({ status: "posted" });
    }
  } finally {
    app.close();
    general.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
