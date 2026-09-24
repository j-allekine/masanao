import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "src",
  "prisma",
  "migrations",
  "20260924090000_replace_delivery_variance_with_receipt_amounts",
  "migration.sql",
);

describe("Delivery Receipt amounts migration", () => {
  it("rebuilds receipt lines that are already referenced by stock-in movements", () => {
    const database = new Database(":memory:");
    database.pragma("foreign_keys = ON");

    try {
      database.exec(`
        CREATE TABLE "delivery_receipt" ("id" TEXT NOT NULL PRIMARY KEY);
        CREATE TABLE "item" ("id" TEXT NOT NULL PRIMARY KEY);
        CREATE TABLE "unit" ("id" TEXT NOT NULL PRIMARY KEY);
        CREATE TABLE "delivery_receipt_line" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "deliveryReceiptId" TEXT NOT NULL,
          "itemId" TEXT NOT NULL,
          "selectedUnitId" TEXT NOT NULL,
          "baseUnitId" TEXT NOT NULL,
          "itemName" TEXT NOT NULL,
          "selectedUnitName" TEXT NOT NULL,
          "baseUnitName" TEXT NOT NULL,
          "enteredQuantity" TEXT NOT NULL,
          "conversionFactor" TEXT NOT NULL,
          "calculatedBaseUnitQuantity" TEXT NOT NULL,
          "actualReceivedBaseUnitQuantity" TEXT NOT NULL,
          "varianceNote" TEXT,
          FOREIGN KEY ("deliveryReceiptId") REFERENCES "delivery_receipt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
          FOREIGN KEY ("itemId") REFERENCES "item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
          FOREIGN KEY ("selectedUnitId") REFERENCES "unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
          FOREIGN KEY ("baseUnitId") REFERENCES "unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
        CREATE TABLE "inventory_ledger_movement" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "deliveryReceiptLineId" TEXT NOT NULL,
          FOREIGN KEY ("deliveryReceiptLineId") REFERENCES "delivery_receipt_line" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
        INSERT INTO "delivery_receipt" VALUES ('receipt');
        INSERT INTO "item" VALUES ('item');
        INSERT INTO "unit" VALUES ('unit');
        INSERT INTO "delivery_receipt_line" VALUES ('line', 'receipt', 'item', 'unit', 'unit', 'Rice', 'Kilogram', 'Kilogram', '2', '1', '2', '2', NULL);
        INSERT INTO "inventory_ledger_movement" VALUES ('stock-in', 'line');
      `);

      database.exec(`BEGIN;${readFileSync(migrationPath, "utf8")}COMMIT;`);

      expect(database.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
      expect(database.prepare('SELECT "deliveryReceiptLineId" FROM "inventory_ledger_movement"').get()).toEqual({ deliveryReceiptLineId: "line" });
      expect(database.prepare('PRAGMA table_info("delivery_receipt_line")').all().map((column: { name: string }) => column.name)).toEqual(expect.arrayContaining(["unitPrice", "lineAmount"]));
      expect(database.prepare('PRAGMA table_info("delivery_receipt_line")').all().map((column: { name: string }) => column.name)).not.toEqual(expect.arrayContaining(["actualReceivedBaseUnitQuantity", "varianceNote"]));
    } finally {
      database.close();
    }
  });
});
