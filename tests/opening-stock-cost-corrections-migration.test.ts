import Database from "better-sqlite3";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

const directory = join(process.cwd(), "src/prisma/migrations");
const current = "20261121000400_opening_stock_cost_replacements";
function migrate(db: Database.Database, before?: string) {
  for (const entry of readdirSync(directory, { withFileTypes: true }).filter(entry => entry.isDirectory() && (!before || entry.name < before)).sort((a, b) => a.name.localeCompare(b.name))) db.exec(readFileSync(join(directory, entry.name, "migration.sql"), "utf8"));
}

it("applies the complete migration chain with indexed replacement lineage and nullable cost evidence", () => {
  const db = new Database(":memory:");
  try {
    migrate(db);
    expect(db.prepare("PRAGMA table_info(opening_stock_correction_line)").all()).toEqual(expect.arrayContaining([expect.objectContaining({ name: "sourceQuantity", type: "TEXT", notnull: 0 }), expect.objectContaining({ name: "sourceAmount", type: "TEXT", notnull: 0 })]));
    expect(db.prepare("PRAGMA index_info(opening_stock_source_originalSourceId_idx)").all()).toEqual([expect.objectContaining({ name: "originalSourceId" })]);
    expect(db.prepare("PRAGMA foreign_key_list(opening_stock_source)").all()).toEqual(expect.arrayContaining([expect.objectContaining({ from: "originalSourceId", table: "opening_stock_source", to: "id", on_delete: "RESTRICT" })]));
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  } finally { db.close(); }
});

it("preserves posted opening, issuance and reduction rows and retains exact replacement provenance constraints", () => {
  const db = new Database(":memory:"); db.pragma("foreign_keys = ON");
  try {
    migrate(db, current);
    db.exec(`
      INSERT INTO item (id,name,normalizedName,categoryId,baseUnitId,reorderLevel,createdAt,updatedAt) VALUES ('item','Rice','rice','default-category-staples-dry-goods','default-unit-kilogram','1',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      INSERT INTO opening_stock_setup (id,status,revision,attemptId,countDate,note,updatedAt) VALUES ('opening-stock','posted',2,'attempt','2026-11-01','Original',CURRENT_TIMESTAMP);
      INSERT INTO item_unit_conversion (id,itemId,alternateUnitId,baseUnitQuantity,updatedAt) VALUES ('pack-conversion','item','default-unit-pack','3',CURRENT_TIMESTAMP);
      INSERT INTO opening_stock_line (id,openingStockId,position,itemId,itemName,quantity,selectedUnitId,selectedUnitName,selectedUnitAbbreviation,conversionId,conversionFactor,baseUnitId,baseUnitName,baseUnitAbbreviation,openingUnitCost,calculatedBaseUnitQuantity,lineAmount) VALUES ('count-line','opening-stock',0,'item','Rice','1','default-unit-pack','Pack','pack','pack-conversion','3','default-unit-kilogram','Kilogram','kg','0.01','3','0.01');
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
    db.exec(`
      UPDATE opening_stock_correction_line SET sourceId='source',sourceReference='OS-0001',sourcePosition=0,openingUnitCost='',lineAmount='0.01',beforeQuantity='2',beforeValueCentavos='1',afterQuantity='1',afterValueCentavos='0',sourceState='[["source",1]]' WHERE id='line';
      UPDATE opening_stock_correction SET status='posted',postedAt='2026-11-03',postedById='admin',postedByName='Administrator',reason='Count included excess stock',revision=2 WHERE id='correction';
      INSERT INTO opening_stock_withdrawal (id,sourceId,correctionLineId,kind,sequence,quantity,beforeQuantity,afterQuantity,costCentavos,postedAt) VALUES ('retired','source','line','correction-retirement',2,'1','1','2','1','2026-11-03');
      INSERT INTO inventory_ledger_movement (id,openingStockCorrectionLineId,itemId,baseUnitId,quantity,movementType,occurredAt) VALUES ('reduction-out','line','item','default-unit-kilogram','1','stock-out','2026-11-03');
      UPDATE opening_stock_source SET revision=2,openingStockLineId='count-line' WHERE id='source';
    `);
    const tables = ["opening_stock_line", "opening_stock_setup", "opening_stock_source", "opening_stock_withdrawal", "inventory_ledger_movement", "issuance_record", "issuance_item_total", "opening_stock_correction"];
    const rows = () => Object.fromEntries(tables.map(table => [table, db.prepare(`SELECT * FROM ${table} ORDER BY id`).all()]));
    const original = rows();
    const originalLines = db.prepare("SELECT * FROM opening_stock_correction_line ORDER BY id").all();
    db.exec(readFileSync(join(directory, current, "migration.sql"), "utf8"));
    expect(rows()).toEqual(original);
    expect(db.prepare("SELECT * FROM opening_stock_correction_line ORDER BY id").all()).toEqual(originalLines.map(line => ({ ...(line as object), sourceQuantity: null, sourceAmount: null })));
    db.exec(`
      INSERT INTO opening_stock_correction (id,openingStockId,reference,kind,status,reason,createdById,createdByName,postedAt,postedById,postedByName,updatedAt) VALUES ('cost','opening-stock','OS-0001-C0002','correct-remaining-cost','posted','Verified cost','admin','Administrator','2026-11-04','admin','Administrator',CURRENT_TIMESTAMP);
      INSERT INTO opening_stock_correction_line (id,correctionId,position,itemId,itemName,quantity,selectedUnitId,selectedUnitName,selectedUnitAbbreviation,conversionFactor,baseUnitId,baseUnitName,baseUnitAbbreviation,sourceId,sourceReference,sourcePosition,sourceQuantity,sourceAmount,openingUnitCost,lineAmount,beforeQuantity,beforeValueCentavos,afterQuantity,afterValueCentavos) VALUES ('cost-line','cost',0,'item','Rice','1','default-unit-kilogram','Kilogram','kg','1','default-unit-kilogram','Kilogram','kg','source','OS-0001',0,'3','0.01','0.02','0.02','1','0','1','2');
      INSERT INTO opening_stock_withdrawal (id,sourceId,correctionLineId,kind,sequence,quantity,beforeQuantity,afterQuantity,costCentavos,postedAt) VALUES ('cost-retired','source','cost-line','correction-retirement',3,'1','2','3','0','2026-11-04');
      INSERT INTO opening_stock_source (id,openingStockId,correctionLineId,originalSourceId,itemId,baseUnitId,itemName,baseUnitName,baseUnitAbbreviation,reference,countDate,position,quantity,amount,postedAt) VALUES ('replacement','opening-stock','cost-line','source','item','default-unit-kilogram','Rice','Kilogram','kg','OS-0001-C0002','2026-11-01',0,'1','0.02','2026-11-04');
      INSERT INTO inventory_ledger_movement (id,openingStockCorrectionLineId,itemId,baseUnitId,quantity,movementType,occurredAt) VALUES ('replacement-out','cost-line','item','default-unit-kilogram','1','stock-out','2026-11-04');
      INSERT INTO inventory_ledger_movement (id,openingStockSourceId,itemId,baseUnitId,quantity,movementType,occurredAt) VALUES ('replacement-in','replacement','item','default-unit-kilogram','1','stock-in','2026-11-04');
    `);
    expect(db.prepare("SELECT sourceQuantity,sourceAmount,beforeQuantity,afterQuantity FROM opening_stock_correction_line WHERE id='cost-line'").get()).toEqual({ sourceQuantity: "3", sourceAmount: "0.01", beforeQuantity: "1", afterQuantity: "1" });
    expect(db.prepare("SELECT originalSourceId,position,revision FROM opening_stock_source WHERE id='replacement'").get()).toEqual({ originalSourceId: "source", position: 0, revision: 0 });
    expect(db.prepare("SELECT COUNT(*) AS count FROM opening_stock_withdrawal WHERE sourceId='replacement'").get()).toEqual({ count: 0 });
    const movement = db.prepare("INSERT INTO inventory_ledger_movement (id,deliveryReceiptLineId,issuanceItemTotalId,openingStockSourceId,openingStockCorrectionLineId,itemId,baseUnitId,quantity,movementType,occurredAt) VALUES (?,?,?,?,?,'item','default-unit-kilogram','1',?,CURRENT_TIMESTAMP)");
    for (const [receipt, issue, source, correction, direction] of [[null, null, null, null, "stock-out"], [null, null, null, "cost-line", "stock-in"], [null, "total", null, "cost-line", "stock-out"], [null, null, "replacement", "cost-line", "stock-out"], [null, null, "replacement", null, "stock-out"]]) expect(() => movement.run("invalid", receipt, issue, source, correction, direction)).toThrow(/CHECK/);
    expect(() => movement.run("duplicate-in", null, null, "replacement", null, "stock-in")).toThrow(/UNIQUE/);
    expect(() => movement.run("duplicate-out", null, null, null, "cost-line", "stock-out")).toThrow(/UNIQUE/);
    expect(() => db.exec("UPDATE opening_stock_source SET originalSourceId='missing' WHERE id='replacement'")).toThrow(/FOREIGN KEY/);
    expect(() => db.exec("DELETE FROM opening_stock_source WHERE id='source'")).toThrow(/FOREIGN KEY/);
    expect(() => db.exec("DELETE FROM opening_stock_correction_line WHERE id='cost-line'")).toThrow(/FOREIGN KEY/);
    expect(db.prepare("SELECT postingEvidence FROM issuance_record WHERE id='issue'").get()).toEqual({ postingEvidence: '{"original":"immutable"}' });
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  } finally { db.close(); }
});
