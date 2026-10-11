import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

it("defaults existing Items while preserving inventory and conversion history", () => {
  const database = new Database(":memory:");

  try {
    database.exec(`
      CREATE TABLE "item" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "baseUnitId" TEXT NOT NULL
      );
      CREATE TABLE "item_unit_conversion" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "itemId" TEXT NOT NULL,
        "baseUnitQuantity" TEXT NOT NULL
      );
      CREATE TABLE "inventory_ledger_movement" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "itemId" TEXT NOT NULL,
        "quantity" TEXT NOT NULL
      );
      INSERT INTO "item" VALUES ('rice', 'Rice', 'kilogram');
      INSERT INTO "item_unit_conversion" VALUES ('sack', 'rice', '25.00');
      INSERT INTO "inventory_ledger_movement" VALUES ('stock-in', 'rice', '12.500');
    `);

    database.exec(
      readFileSync(
        join(
          process.cwd(),
          "src/prisma/migrations/20261012090000_add_item_issuance_quantity_policy/migration.sql",
        ),
        "utf8",
      ),
    );

    expect(
      database
        .prepare('SELECT "id", "issuanceQuantityPolicy" FROM "item"')
        .get(),
    ).toEqual({ id: "rice", issuanceQuantityPolicy: "allow-decimals" });
    expect(
      database.prepare('SELECT * FROM "item_unit_conversion"').all(),
    ).toEqual([{ id: "sack", itemId: "rice", baseUnitQuantity: "25.00" }]);
    expect(
      database.prepare('SELECT * FROM "inventory_ledger_movement"').all(),
    ).toEqual([{ id: "stock-in", itemId: "rice", quantity: "12.500" }]);
  } finally {
    database.close();
  }
});
