import Database from "better-sqlite3";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

it("backfills sample Items once without a future default or history changes", () => {
  const db = new Database(":memory:");
  const directory = join(process.cwd(), "src/prisma/migrations");
  const migrationName = "20261019090000_add_item_reorder_level";
  try {
    for (const name of readdirSync(directory).filter((name) => name < migrationName && name !== "migration_lock.toml").sort()) db.exec(readFileSync(join(directory, name, "migration.sql"), "utf8"));
    db.exec(`INSERT INTO item (id, name, normalizedName, categoryId, baseUnitId, updatedAt) VALUES ('sample', 'Sample', 'sample', 'default-category-staples-dry-goods', 'default-unit-kilogram', CURRENT_TIMESTAMP);
      INSERT INTO vendor (id, name, normalizedName, updatedAt) VALUES ('vendor', 'Vendor', 'vendor', CURRENT_TIMESTAMP);
      INSERT INTO purchase_order (id, purchaseOrderNo, normalizedPurchaseOrderNo, vendorId, updatedAt) VALUES ('po', 'PO', 'po', 'vendor', CURRENT_TIMESTAMP);
      INSERT INTO delivery_receipt (id, purchaseOrderId, vendorId, vendorName, purchaseOrderNo, receiptNo, normalizedReceiptNo, receiptDate) VALUES ('receipt', 'po', 'vendor', 'Vendor', 'PO', 'DR', 'dr', CURRENT_TIMESTAMP);
      INSERT INTO delivery_receipt_line (id, deliveryReceiptId, itemId, selectedUnitId, baseUnitId, itemName, selectedUnitName, baseUnitName, enteredQuantity, conversionFactor, calculatedBaseUnitQuantity) VALUES ('line', 'receipt', 'sample', 'default-unit-kilogram', 'default-unit-kilogram', 'Sample', 'Kilogram', 'Kilogram', '1.000000000000000001', '1', '1.000000000000000001');
      INSERT INTO inventory_ledger_movement (id, deliveryReceiptLineId, itemId, baseUnitId, quantity, movementType, occurredAt) VALUES ('old-stock', 'line', 'sample', 'default-unit-kilogram', '1.000000000000000001', 'stock-in', CURRENT_TIMESTAMP);`);
    const beforeItem = db.prepare("SELECT * FROM item").get() as Record<string, unknown>;
    const history = db.prepare("SELECT * FROM inventory_ledger_movement").all();
    const documents = ["purchase_order", "delivery_receipt", "delivery_receipt_line", "issuance_record", "issuance_receipt_allocation", "item_unit_conversion"].map((table) => ({ table, rows: db.prepare(`SELECT * FROM ${table}`).all() }));
    db.exec(readFileSync(join(directory, migrationName, "migration.sql"), "utf8"));
    expect(db.prepare("SELECT * FROM item").get()).toEqual({ ...beforeItem, reorderLevel: "10" });
    expect(db.prepare("SELECT * FROM inventory_ledger_movement").all()).toEqual(history);
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
    for (const { table, rows } of documents) expect(db.prepare(`SELECT * FROM ${table}`).all()).toEqual(rows);
    expect((db.prepare("PRAGMA table_info(item)").all() as Array<{ name: string; notnull: number; dflt_value: unknown }>).find((column) => column.name === "reorderLevel")).toMatchObject({ notnull: 1, dflt_value: null });
    expect(() => db.exec(`INSERT INTO item (id, name, normalizedName, categoryId, baseUnitId, updatedAt) VALUES ('new', 'New', 'new', 'default-category-staples-dry-goods', 'default-unit-kilogram', CURRENT_TIMESTAMP)`)).toThrow(/NOT NULL/);
    db.exec(`UPDATE item SET reorderLevel = '0.125' WHERE id = 'sample'`);
    // The repository seeds only default lookups through these migrations; there is no Item seed command.
    for (const name of ["20260915090000_add_default_units", "20260915091000_add_default_categories", "20260915092000_add_default_offices"]) db.exec(readFileSync(join(directory, name, "migration.sql"), "utf8"));
    expect(db.prepare("SELECT reorderLevel FROM item WHERE id = 'sample'").get()).toEqual({ reorderLevel: "0.125" });
    expect(db.prepare("SELECT * FROM inventory_ledger_movement").all()).toEqual(history);
  } finally { db.close(); }
});
