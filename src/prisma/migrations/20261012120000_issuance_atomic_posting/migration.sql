ALTER TABLE "issuance_record" ADD COLUMN "postedAt" DATETIME;
ALTER TABLE "issuance_record" ADD COLUMN "postingEvidence" TEXT;

-- Preserve every stock-in row and its unique receipt source. Stock-out belongs
-- to one issuance Item total; no movement may have both sources or no source.
CREATE TABLE "new_inventory_ledger_movement" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "deliveryReceiptLineId" TEXT,
  "issuanceItemTotalId" TEXT,
  "itemId" TEXT NOT NULL,
  "baseUnitId" TEXT NOT NULL,
  "quantity" TEXT NOT NULL,
  "movementType" TEXT NOT NULL,
  "occurredAt" DATETIME NOT NULL,
  CONSTRAINT "inventory_ledger_source_direction_check" CHECK (
    ("movementType" = 'stock-in' AND "deliveryReceiptLineId" IS NOT NULL AND "issuanceItemTotalId" IS NULL)
    OR ("movementType" = 'stock-out' AND "deliveryReceiptLineId" IS NULL AND "issuanceItemTotalId" IS NOT NULL)
  ),
  FOREIGN KEY ("deliveryReceiptLineId") REFERENCES "delivery_receipt_line"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("issuanceItemTotalId") REFERENCES "issuance_item_total"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("itemId") REFERENCES "item"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("baseUnitId") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_inventory_ledger_movement" ("id", "deliveryReceiptLineId", "itemId", "baseUnitId", "quantity", "movementType", "occurredAt")
SELECT "id", "deliveryReceiptLineId", "itemId", "baseUnitId", "quantity", "movementType", "occurredAt" FROM "inventory_ledger_movement";
DROP TABLE "inventory_ledger_movement";
ALTER TABLE "new_inventory_ledger_movement" RENAME TO "inventory_ledger_movement";
CREATE UNIQUE INDEX "inventory_ledger_movement_deliveryReceiptLineId_key" ON "inventory_ledger_movement"("deliveryReceiptLineId");
CREATE UNIQUE INDEX "inventory_ledger_movement_issuanceItemTotalId_key" ON "inventory_ledger_movement"("issuanceItemTotalId");
CREATE INDEX "inventory_ledger_movement_itemId_idx" ON "inventory_ledger_movement"("itemId");
