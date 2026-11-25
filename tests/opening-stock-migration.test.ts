import Database from "better-sqlite3";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

it("adds opening sources without altering existing receipt, issuance, draft or ledger evidence", () => {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  const directory = join(process.cwd(), "src/prisma/migrations");
  const current = "20261120000200_opening_stock_posting";
  try {
    for (const entry of readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isDirectory() && entry.name < current).sort((a, b) => a.name.localeCompare(b.name))) db.exec(readFileSync(join(directory, entry.name, "migration.sql"), "utf8"));
    db.exec(`
      INSERT INTO item (id,name,normalizedName,categoryId,baseUnitId,reorderLevel,createdAt,updatedAt) VALUES ('migration-item','Migration Item','migration item','default-category-staples-dry-goods','default-unit-kilogram','10',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO vendor (id,name,normalizedName,createdAt,updatedAt) VALUES ('migration-vendor','Migration Supplier','migration supplier',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO purchase_order (id,purchaseOrderNo,normalizedPurchaseOrderNo,vendorId,createdAt,updatedAt) VALUES ('migration-po','MIGRATION-PO','migration-po','migration-vendor',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO delivery_receipt (id,purchaseOrderId,vendorId,vendorName,purchaseOrderNo,receiptNo,normalizedReceiptNo,receiptDate,postedAt) VALUES ('migration-receipt','migration-po','migration-vendor','Migration Supplier','MIGRATION-PO','MIGRATION-DR','migration-dr','2026-10-01','2026-10-01');
      INSERT INTO delivery_receipt_line (id,deliveryReceiptId,itemId,selectedUnitId,baseUnitId,itemName,selectedUnitName,baseUnitName,enteredQuantity,conversionFactor,calculatedBaseUnitQuantity,unitPrice,lineAmount) VALUES ('migration-line','migration-receipt','migration-item','default-unit-kilogram','default-unit-kilogram','Historical Item','Kilogram','Kilogram','10.123456789123456789','1','10.123456789123456789','50','506.17283945617283945');
      INSERT INTO activity_design (id,activityDesignNo,fiscalYear,title,createdAt,updatedAt) VALUES ('migration-design','MIGRATION-AD',2026,'Migration',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO activity (id,activityDesignId,name,officeName,scheduledDate,createdAt,updatedAt) VALUES ('migration-activity','migration-design','Meal','Kitchen','2026-10-02',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO meal_schedule (id,activityId,label,mealTime,createdAt,updatedAt) VALUES ('migration-meal','migration-activity','Lunch','12:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO issuance_record (id,mealScheduleId,status,revision,postedAt,postingEvidence,createdAt,updatedAt) VALUES ('migration-issue','migration-meal','posted',2,'2026-10-02','{"original":"immutable"}',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO issuance_item_total (id,issuanceRecordId,itemId,calculatedNumerator,calculatedDenominator,finalQuantity,adjusted) VALUES ('migration-total','migration-issue','migration-item','2','1','2',0);
      INSERT INTO issuance_receipt_allocation (id,issuanceItemTotalId,deliveryReceiptLineId,quantity,basis,receiptNo,purchaseOrderNo,receiptDate) VALUES ('migration-allocation','migration-total','migration-line','2','fifo','MIGRATION-DR','MIGRATION-PO','2026-10-01');
      INSERT INTO inventory_ledger_movement (id,deliveryReceiptLineId,itemId,baseUnitId,quantity,movementType,occurredAt) VALUES ('migration-in','migration-line','migration-item','default-unit-kilogram','10.123456789123456789','stock-in','2026-10-01');
      INSERT INTO inventory_ledger_movement (id,issuanceItemTotalId,itemId,baseUnitId,quantity,movementType,occurredAt) VALUES ('migration-out','migration-total','migration-item','default-unit-kilogram','2','stock-out','2026-10-02');
      INSERT INTO opening_stock_setup (id,status,revision,attemptId,countDate,note,updatedAt) VALUES ('opening-stock','draft',3,'migration-attempt','2026-11-01','Saved count',CURRENT_TIMESTAMP);
    `);
    const read = () => ({ receipt: db.prepare("SELECT * FROM delivery_receipt_line").all(), issuance: db.prepare("SELECT * FROM issuance_record").all(), allocations: db.prepare("SELECT * FROM issuance_receipt_allocation").all(), movements: db.prepare("SELECT id,deliveryReceiptLineId,issuanceItemTotalId,itemId,baseUnitId,quantity,movementType,occurredAt FROM inventory_ledger_movement ORDER BY id").all() });
    const original = read();
    db.exec(readFileSync(join(directory, current, "migration.sql"), "utf8"));
    expect(read()).toEqual(original);
    expect(db.prepare("SELECT reference,status,revision,attemptId,note FROM opening_stock_setup").get()).toEqual({ reference: "OS-0001", status: "draft", revision: 3, attemptId: "migration-attempt", note: "Saved count" });
    db.exec(`INSERT INTO opening_stock_source (id,openingStockId,itemId,baseUnitId,itemName,baseUnitName,baseUnitAbbreviation,reference,countDate,position,quantity,amount,postedAt) VALUES ('new-source','opening-stock','migration-item','default-unit-kilogram','Opening Item','Kilogram','kg','OS-0001','2026-11-01',0,'2','0',CURRENT_TIMESTAMP)`);
    const insert = db.prepare("INSERT INTO inventory_ledger_movement (id,deliveryReceiptLineId,issuanceItemTotalId,openingStockSourceId,itemId,baseUnitId,quantity,movementType,occurredAt) VALUES (?, ?, ?, ?, 'migration-item','default-unit-kilogram','2',?,CURRENT_TIMESTAMP)");
    for (const [receipt, issuance, opening, direction] of [[null, null, null, "stock-in"], ["migration-line", null, "new-source", "stock-in"], [null, null, "new-source", "stock-out"], [null, "migration-total", "new-source", "stock-out"]]) expect(() => insert.run("invalid", receipt, issuance, opening, direction)).toThrow(/CHECK/);
    insert.run("opening-in", null, null, "new-source", "stock-in");
    expect(() => insert.run("duplicate-opening", null, null, "new-source", "stock-in")).toThrow(/UNIQUE/);
    expect(() => db.exec("DELETE FROM opening_stock_source WHERE id='new-source'")).toThrow(/FOREIGN KEY/);
    const beforeCorrections = read();
    for (const entry of readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isDirectory() && entry.name > current).sort((a, b) => a.name.localeCompare(b.name))) db.exec(readFileSync(join(directory, entry.name, "migration.sql"), "utf8"));
    expect(read()).toEqual(beforeCorrections);
    expect(db.prepare("SELECT openingStockSourceId,openingStockCorrectionLineId FROM inventory_ledger_movement WHERE id IN ('migration-in','migration-out') ORDER BY id").all()).toEqual([
      { openingStockSourceId: null, openingStockCorrectionLineId: null },
      { openingStockSourceId: null, openingStockCorrectionLineId: null },
    ]);
    expect(db.prepare("SELECT COUNT(*) AS count FROM opening_stock_source WHERE openingStockLineId IS NOT NULL OR correctionLineId IS NOT NULL").get()).toEqual({ count: 0 });
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  } finally { db.close(); }
});
