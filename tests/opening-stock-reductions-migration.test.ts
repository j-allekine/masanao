import Database from "better-sqlite3";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

it("preserves prior opening issuance and enforces distinct correction withdrawal and ledger provenance", () => {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  const directory = join(process.cwd(), "src/prisma/migrations");
  const current = "20261121000300_opening_stock_reductions";
  try {
    for (const entry of readdirSync(directory, { withFileTypes: true }).filter(entry => entry.isDirectory() && entry.name < current).sort((a, b) => a.name.localeCompare(b.name))) db.exec(readFileSync(join(directory, entry.name, "migration.sql"), "utf8"));
    db.exec(`
      INSERT INTO item (id,name,normalizedName,categoryId,baseUnitId,reorderLevel,createdAt,updatedAt) VALUES ('item','Rice','rice','default-category-staples-dry-goods','default-unit-kilogram','1',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO opening_stock_setup (id,status,revision,attemptId,countDate,note,updatedAt) VALUES ('opening-stock','posted',2,'attempt','2026-11-01','Original',CURRENT_TIMESTAMP);
      INSERT INTO opening_stock_source (id,openingStockId,itemId,baseUnitId,itemName,baseUnitName,baseUnitAbbreviation,reference,countDate,position,quantity,amount,postedAt) VALUES ('source','opening-stock','item','default-unit-kilogram','Rice','Kilogram','kg','OS-0001','2026-11-01',0,'3','0.01','2026-11-01');
      INSERT INTO activity_design (id,activityDesignNo,fiscalYear,title,createdAt,updatedAt) VALUES ('design','AD',2026,'Meal',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO activity (id,activityDesignId,name,officeName,scheduledDate,createdAt,updatedAt) VALUES ('activity','design','Meal','Kitchen','2026-11-02',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO meal_schedule (id,activityId,label,mealTime,createdAt,updatedAt) VALUES ('meal','activity','Lunch','12:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO issuance_record (id,mealScheduleId,status,revision,postedAt,postingEvidence,createdAt,updatedAt) VALUES ('issue','meal','posted',2,'2026-11-02','{"original":"immutable"}',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO issuance_item_total (id,issuanceRecordId,itemId,calculatedNumerator,calculatedDenominator,finalQuantity,adjusted) VALUES ('total','issue','item','1','1','1',0);
      INSERT INTO opening_stock_withdrawal (id,sourceId,issuanceItemTotalId,kind,sequence,quantity,beforeQuantity,afterQuantity,costCentavos,postedAt) VALUES ('issued','source','total','issuance',1,'1','0','1','0','2026-11-02');
      INSERT INTO inventory_ledger_movement (id,openingStockSourceId,itemId,baseUnitId,quantity,movementType,occurredAt) VALUES ('original-in','source','item','default-unit-kilogram','3','stock-in','2026-11-01');
      INSERT INTO inventory_ledger_movement (id,issuanceItemTotalId,itemId,baseUnitId,quantity,movementType,occurredAt) VALUES ('original-out','total','item','default-unit-kilogram','1','stock-out','2026-11-02');
      INSERT INTO opening_stock_correction (id,openingStockId,reference,kind,createdById,createdByName,updatedAt) VALUES ('correction','opening-stock','OS-0001-C0001','reduce-remaining','admin','Administrator',CURRENT_TIMESTAMP);
      INSERT INTO opening_stock_correction_line (id,correctionId,position,itemId,itemName,quantity,selectedUnitId,selectedUnitName,selectedUnitAbbreviation,conversionFactor,baseUnitId,baseUnitName,baseUnitAbbreviation) VALUES ('line','correction',0,'item','Rice','1','default-unit-kilogram','Kilogram','kg','1','default-unit-kilogram','Kilogram','kg');
    `);
    const read = () => ({ sources: db.prepare("SELECT * FROM opening_stock_source").all(), withdrawals: db.prepare("SELECT id,sourceId,issuanceItemTotalId,kind,sequence,quantity,beforeQuantity,afterQuantity,costCentavos,postedAt FROM opening_stock_withdrawal").all(), movements: db.prepare("SELECT id,deliveryReceiptLineId,issuanceItemTotalId,openingStockSourceId,itemId,baseUnitId,quantity,movementType,occurredAt FROM inventory_ledger_movement ORDER BY id").all(), issuance: db.prepare("SELECT * FROM issuance_record").all() });
    const original = read();
    db.exec(readFileSync(join(directory, current, "migration.sql"), "utf8"));
    expect(read()).toEqual(original);
    db.exec("UPDATE opening_stock_correction_line SET sourceId='source',sourceReference='OS-0001',sourcePosition=0 WHERE id='line'");
    const withdraw = db.prepare("INSERT INTO opening_stock_withdrawal (id,sourceId,issuanceItemTotalId,correctionLineId,kind,sequence,quantity,beforeQuantity,afterQuantity,costCentavos,postedAt) VALUES (?,'source',?,?,?,2,'1','1','2','1',CURRENT_TIMESTAMP)");
    for (const [issue, correction, kind] of [[null, null, "issuance"], [null, "line", "issuance"], ["total", "line", "issuance"], ["total", null, "correction-retirement"], ["total", "line", "correction-retirement"], [null, null, "correction-retirement"], [null, "line", "other"]]) expect(() => withdraw.run("invalid", issue, correction, kind)).toThrow(/CHECK/);
    withdraw.run("retired", null, "line", "correction-retirement");
    expect(() => db.exec("INSERT INTO opening_stock_withdrawal (id,sourceId,correctionLineId,kind,sequence,quantity,beforeQuantity,afterQuantity,costCentavos,postedAt) VALUES ('duplicate','source','line','correction-retirement',3,'1','2','3','0',CURRENT_TIMESTAMP)")).toThrow(/UNIQUE/);
    const movement = db.prepare("INSERT INTO inventory_ledger_movement (id,deliveryReceiptLineId,issuanceItemTotalId,openingStockSourceId,openingStockCorrectionLineId,itemId,baseUnitId,quantity,movementType,occurredAt) VALUES (?,?,?,?,?,'item','default-unit-kilogram','1',?,CURRENT_TIMESTAMP)");
    for (const [receipt, issue, source, correction, direction] of [[null, null, null, null, "stock-out"], [null, null, null, "line", "stock-in"], [null, "total", null, "line", "stock-out"], [null, null, "source", "line", "stock-out"], [null, null, null, "line", "other"]]) expect(() => movement.run("invalid", receipt, issue, source, correction, direction)).toThrow(/CHECK/);
    movement.run("correction-out", null, null, null, "line", "stock-out");
    expect(() => movement.run("duplicate-correction", null, null, null, "line", "stock-out")).toThrow(/UNIQUE/);
    expect(() => db.exec("DELETE FROM opening_stock_correction_line WHERE id='line'")).toThrow(/FOREIGN KEY/);
    expect(() => db.exec("DELETE FROM opening_stock_source WHERE id='source'")).toThrow(/FOREIGN KEY/);
    expect(db.prepare("SELECT issuanceItemTotalId,correctionLineId FROM opening_stock_withdrawal WHERE id='retired'").get()).toEqual({ issuanceItemTotalId: null, correctionLineId: "line" });
    expect(db.prepare("SELECT issuanceItemTotalId,openingStockCorrectionLineId FROM inventory_ledger_movement WHERE id='correction-out'").get()).toEqual({ issuanceItemTotalId: null, openingStockCorrectionLineId: "line" });
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  } finally { db.close(); }
});
