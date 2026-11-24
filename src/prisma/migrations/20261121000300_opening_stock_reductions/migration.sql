-- Correction source identity and immutable reviewed provenance.
ALTER TABLE "opening_stock_correction_line" ADD COLUMN "sourceId" TEXT REFERENCES "opening_stock_source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "opening_stock_correction_line" ADD COLUMN "sourceReference" TEXT;
ALTER TABLE "opening_stock_correction_line" ADD COLUMN "sourcePosition" INTEGER;
CREATE TABLE "new_opening_stock_withdrawal" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sourceId" TEXT NOT NULL,
  "issuanceItemTotalId" TEXT,
  "correctionLineId" TEXT,
  "kind" TEXT NOT NULL DEFAULT 'issuance',
  "sequence" INTEGER NOT NULL CHECK ("sequence" > 0),
  "quantity" TEXT NOT NULL,
  "beforeQuantity" TEXT NOT NULL,
  "afterQuantity" TEXT NOT NULL,
  "costCentavos" TEXT NOT NULL,
  "postedAt" DATETIME NOT NULL,
  CHECK (("kind" = 'issuance' AND "issuanceItemTotalId" IS NOT NULL AND "correctionLineId" IS NULL) OR ("kind" = 'correction-retirement' AND "issuanceItemTotalId" IS NULL AND "correctionLineId" IS NOT NULL)),
  FOREIGN KEY ("correctionLineId") REFERENCES "opening_stock_correction_line"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("sourceId") REFERENCES "opening_stock_source"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("issuanceItemTotalId") REFERENCES "issuance_item_total"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_opening_stock_withdrawal" ("id", "sourceId", "issuanceItemTotalId", "kind", "sequence", "quantity", "beforeQuantity", "afterQuantity", "costCentavos", "postedAt") SELECT "id", "sourceId", "issuanceItemTotalId", "kind", "sequence", "quantity", "beforeQuantity", "afterQuantity", "costCentavos", "postedAt" FROM "opening_stock_withdrawal";
DROP TABLE "opening_stock_withdrawal";
ALTER TABLE "new_opening_stock_withdrawal" RENAME TO "opening_stock_withdrawal";
CREATE UNIQUE INDEX "opening_stock_withdrawal_sourceId_sequence_key" ON "opening_stock_withdrawal"("sourceId", "sequence");
CREATE UNIQUE INDEX "opening_stock_withdrawal_sourceId_issuanceItemTotalId_key" ON "opening_stock_withdrawal"("sourceId", "issuanceItemTotalId");
CREATE INDEX "opening_stock_withdrawal_issuanceItemTotalId_idx" ON "opening_stock_withdrawal"("issuanceItemTotalId");

CREATE UNIQUE INDEX "opening_stock_withdrawal_correctionLineId_key" ON "opening_stock_withdrawal"("correctionLineId");
CREATE TABLE "new_inventory_ledger_movement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "deliveryReceiptLineId" TEXT,
  "issuanceItemTotalId" TEXT,
  "openingStockSourceId" TEXT,
  "openingStockCorrectionLineId" TEXT,
  "itemId" TEXT NOT NULL,
  "baseUnitId" TEXT NOT NULL,
  "quantity" TEXT NOT NULL,
  "movementType" TEXT NOT NULL,
  "occurredAt" DATETIME NOT NULL,
  CONSTRAINT "inventory_ledger_source_direction_check" CHECK (
    ("movementType" = 'stock-in' AND "deliveryReceiptLineId" IS NOT NULL AND "issuanceItemTotalId" IS NULL AND "openingStockSourceId" IS NULL AND "openingStockCorrectionLineId" IS NULL)
    OR ("movementType" = 'stock-in' AND "deliveryReceiptLineId" IS NULL AND "issuanceItemTotalId" IS NULL AND "openingStockSourceId" IS NOT NULL AND "openingStockCorrectionLineId" IS NULL)
    OR ("movementType" = 'stock-out' AND "deliveryReceiptLineId" IS NULL AND "issuanceItemTotalId" IS NOT NULL AND "openingStockSourceId" IS NULL AND "openingStockCorrectionLineId" IS NULL)
    OR ("movementType" = 'stock-out' AND "deliveryReceiptLineId" IS NULL AND "issuanceItemTotalId" IS NULL AND "openingStockSourceId" IS NULL AND "openingStockCorrectionLineId" IS NOT NULL)
  ),
  FOREIGN KEY ("deliveryReceiptLineId") REFERENCES "delivery_receipt_line"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("issuanceItemTotalId") REFERENCES "issuance_item_total"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("openingStockCorrectionLineId") REFERENCES "opening_stock_correction_line"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("openingStockSourceId") REFERENCES "opening_stock_source"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("baseUnitId") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_inventory_ledger_movement" ("id", "deliveryReceiptLineId", "issuanceItemTotalId", "openingStockSourceId", "itemId", "baseUnitId", "quantity", "movementType", "occurredAt")
SELECT "id", "deliveryReceiptLineId", "issuanceItemTotalId", "openingStockSourceId", "itemId", "baseUnitId", "quantity", "movementType", "occurredAt" FROM "inventory_ledger_movement";
DROP TABLE "inventory_ledger_movement";
ALTER TABLE "new_inventory_ledger_movement" RENAME TO "inventory_ledger_movement";
CREATE UNIQUE INDEX "inventory_ledger_movement_deliveryReceiptLineId_key" ON "inventory_ledger_movement"("deliveryReceiptLineId");
CREATE UNIQUE INDEX "inventory_ledger_movement_issuanceItemTotalId_key" ON "inventory_ledger_movement"("issuanceItemTotalId");
CREATE UNIQUE INDEX "inventory_ledger_movement_openingStockSourceId_key" ON "inventory_ledger_movement"("openingStockSourceId");
CREATE INDEX "inventory_ledger_movement_itemId_idx" ON "inventory_ledger_movement"("itemId");
CREATE UNIQUE INDEX "inventory_ledger_movement_openingStockCorrectionLineId_key" ON "inventory_ledger_movement"("openingStockCorrectionLineId");
