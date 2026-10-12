import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Unified issuance ledger migration", () => {
  it("preserves receipt evidence, unique sources and exact one-source direction constraints", () => {
    const database = new Database(":memory:"); database.pragma("foreign_keys = ON");
    try {
      database.exec(`
        CREATE TABLE item (id TEXT PRIMARY KEY);
        CREATE TABLE unit (id TEXT PRIMARY KEY);
        CREATE TABLE delivery_receipt_line (id TEXT PRIMARY KEY);
        CREATE TABLE issuance_record (id TEXT PRIMARY KEY);
        CREATE TABLE issuance_item_total (id TEXT PRIMARY KEY);
        CREATE TABLE inventory_ledger_movement (
          id TEXT PRIMARY KEY, deliveryReceiptLineId TEXT NOT NULL UNIQUE,
          itemId TEXT NOT NULL, baseUnitId TEXT NOT NULL, quantity TEXT NOT NULL,
          movementType TEXT NOT NULL, occurredAt DATETIME NOT NULL,
          FOREIGN KEY (deliveryReceiptLineId) REFERENCES delivery_receipt_line(id) ON DELETE RESTRICT
        );
        INSERT INTO item VALUES ('item'); INSERT INTO unit VALUES ('unit');
        INSERT INTO delivery_receipt_line VALUES ('receipt-line'); INSERT INTO issuance_item_total VALUES ('issuance-total');
        INSERT INTO inventory_ledger_movement VALUES ('legacy','receipt-line','item','unit','10.123456789123456789','stock-in','2026-09-12T00:00:00.000Z');
      `);
      const legacy = database.prepare("SELECT * FROM inventory_ledger_movement").get();
      database.exec(`BEGIN; ${readFileSync(join(process.cwd(), "src/prisma/migrations/20261012120000_issuance_atomic_posting/migration.sql"), "utf8")} COMMIT;`);
      expect(database.prepare("SELECT id,deliveryReceiptLineId,itemId,baseUnitId,quantity,movementType,occurredAt FROM inventory_ledger_movement WHERE id='legacy'").get()).toEqual(legacy);
      expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
      const insert = database.prepare("INSERT INTO inventory_ledger_movement (id,deliveryReceiptLineId,issuanceItemTotalId,itemId,baseUnitId,quantity,movementType,occurredAt) VALUES (?, ?, ?, 'item', 'unit', '1.123456789', ?, CURRENT_TIMESTAMP)");
      expect(() => insert.run("receipt-duplicate", "receipt-line", null, "stock-in")).toThrow(/UNIQUE/);
      for (const [receipt, issuance, direction] of [[null, null, "stock-in"], [null, null, "stock-out"], ["receipt-line", "issuance-total", "stock-in"], ["receipt-line", "issuance-total", "stock-out"], [null, "issuance-total", "stock-in"], ["receipt-line", null, "stock-out"], [null, "issuance-total", "unknown"]]) expect(() => insert.run("invalid", receipt, issuance, direction)).toThrow(/CHECK/);
      insert.run("stock-out", null, "issuance-total", "stock-out");
      expect(() => insert.run("issuance-duplicate", null, "issuance-total", "stock-out")).toThrow(/UNIQUE/);
      expect(database.prepare("SELECT quantity,deliveryReceiptLineId,issuanceItemTotalId FROM inventory_ledger_movement WHERE id='stock-out'").get()).toEqual({ quantity: "1.123456789", deliveryReceiptLineId: null, issuanceItemTotalId: "issuance-total" });
      expect(() => database.exec("DELETE FROM delivery_receipt_line")).toThrow(/FOREIGN KEY/);
      expect(() => database.exec("DELETE FROM issuance_item_total")).toThrow(/FOREIGN KEY/);
    } finally { database.close(); }
  });
});
