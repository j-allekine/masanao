CREATE TABLE "issuance_item_total" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "issuanceRecordId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "calculatedNumerator" TEXT NOT NULL,
  "calculatedDenominator" TEXT NOT NULL,
  "finalQuantity" TEXT NOT NULL,
  "adjusted" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "issuance_item_total_issuanceRecordId_fkey" FOREIGN KEY ("issuanceRecordId") REFERENCES "issuance_record" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "issuance_item_total_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "issuance_item_total_issuanceRecordId_itemId_key" ON "issuance_item_total"("issuanceRecordId", "itemId");
