ALTER TABLE "opening_stock_setup" ADD COLUMN "reference" TEXT NOT NULL DEFAULT 'OS-0001';

CREATE TABLE "opening_stock_source" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "openingStockId" TEXT NOT NULL,
  "openingStockLineId" TEXT,
  "itemId" TEXT NOT NULL,
  "baseUnitId" TEXT NOT NULL,
  "itemName" TEXT NOT NULL,
  "baseUnitName" TEXT NOT NULL,
  "baseUnitAbbreviation" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "countDate" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "quantity" TEXT NOT NULL,
  "amount" TEXT NOT NULL,
  "postedAt" DATETIME NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY ("openingStockId") REFERENCES "opening_stock_setup"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("openingStockLineId") REFERENCES "opening_stock_line"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("baseUnitId") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "opening_stock_source_openingStockLineId_key" ON "opening_stock_source"("openingStockLineId");
CREATE INDEX "opening_stock_source_itemId_position_idx" ON "opening_stock_source"("itemId", "position");

CREATE TABLE "opening_stock_withdrawal" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sourceId" TEXT NOT NULL,
  "issuanceItemTotalId" TEXT,
  "kind" TEXT NOT NULL DEFAULT 'issuance',
  "sequence" INTEGER NOT NULL CHECK ("sequence" > 0),
  "quantity" TEXT NOT NULL,
  "beforeQuantity" TEXT NOT NULL,
  "afterQuantity" TEXT NOT NULL,
  "costCentavos" TEXT NOT NULL,
  "postedAt" DATETIME NOT NULL,
  CHECK ("kind" = 'issuance' AND "issuanceItemTotalId" IS NOT NULL),
  FOREIGN KEY ("sourceId") REFERENCES "opening_stock_source"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("issuanceItemTotalId") REFERENCES "issuance_item_total"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "opening_stock_withdrawal_sourceId_sequence_key" ON "opening_stock_withdrawal"("sourceId", "sequence");
CREATE UNIQUE INDEX "opening_stock_withdrawal_sourceId_issuanceItemTotalId_key" ON "opening_stock_withdrawal"("sourceId", "issuanceItemTotalId");
CREATE INDEX "opening_stock_withdrawal_issuanceItemTotalId_idx" ON "opening_stock_withdrawal"("issuanceItemTotalId");

-- Preserve the manual exactly-one-source constraint while adding opening stock.
CREATE TABLE "new_inventory_ledger_movement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "deliveryReceiptLineId" TEXT,
  "issuanceItemTotalId" TEXT,
  "openingStockSourceId" TEXT,
  "itemId" TEXT NOT NULL,
  "baseUnitId" TEXT NOT NULL,
  "quantity" TEXT NOT NULL,
  "movementType" TEXT NOT NULL,
  "occurredAt" DATETIME NOT NULL,
  CONSTRAINT "inventory_ledger_source_direction_check" CHECK (
    ("movementType" = 'stock-in' AND "deliveryReceiptLineId" IS NOT NULL AND "issuanceItemTotalId" IS NULL AND "openingStockSourceId" IS NULL)
    OR ("movementType" = 'stock-in' AND "deliveryReceiptLineId" IS NULL AND "issuanceItemTotalId" IS NULL AND "openingStockSourceId" IS NOT NULL)
    OR ("movementType" = 'stock-out' AND "deliveryReceiptLineId" IS NULL AND "issuanceItemTotalId" IS NOT NULL AND "openingStockSourceId" IS NULL)
  ),
  FOREIGN KEY ("deliveryReceiptLineId") REFERENCES "delivery_receipt_line"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("issuanceItemTotalId") REFERENCES "issuance_item_total"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("openingStockSourceId") REFERENCES "opening_stock_source"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("baseUnitId") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_inventory_ledger_movement" ("id", "deliveryReceiptLineId", "issuanceItemTotalId", "itemId", "baseUnitId", "quantity", "movementType", "occurredAt")
SELECT "id", "deliveryReceiptLineId", "issuanceItemTotalId", "itemId", "baseUnitId", "quantity", "movementType", "occurredAt" FROM "inventory_ledger_movement";
DROP TABLE "inventory_ledger_movement";
ALTER TABLE "new_inventory_ledger_movement" RENAME TO "inventory_ledger_movement";
CREATE UNIQUE INDEX "inventory_ledger_movement_deliveryReceiptLineId_key" ON "inventory_ledger_movement"("deliveryReceiptLineId");
CREATE UNIQUE INDEX "inventory_ledger_movement_issuanceItemTotalId_key" ON "inventory_ledger_movement"("issuanceItemTotalId");
CREATE UNIQUE INDEX "inventory_ledger_movement_openingStockSourceId_key" ON "inventory_ledger_movement"("openingStockSourceId");
CREATE INDEX "inventory_ledger_movement_itemId_idx" ON "inventory_ledger_movement"("itemId");
