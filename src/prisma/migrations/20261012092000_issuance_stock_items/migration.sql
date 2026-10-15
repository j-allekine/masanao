CREATE TABLE "issuance_stock_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issuanceRecordId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "enteredQuantity" TEXT NOT NULL,
    "conversionId" TEXT,
    "conversionFactor" TEXT NOT NULL,
    "selectedUnitId" TEXT NOT NULL,
    "selectedUnitName" TEXT NOT NULL,
    "selectedUnitAbbreviation" TEXT NOT NULL,
    "baseUnitId" TEXT NOT NULL,
    "baseUnitName" TEXT NOT NULL,
    "baseUnitAbbreviation" TEXT NOT NULL,
    CONSTRAINT "issuance_stock_item_issuanceRecordId_fkey" FOREIGN KEY ("issuanceRecordId") REFERENCES "issuance_record" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "issuance_stock_item_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "issuance_stock_item_selectedUnitId_fkey" FOREIGN KEY ("selectedUnitId") REFERENCES "unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "issuance_stock_item_baseUnitId_fkey" FOREIGN KEY ("baseUnitId") REFERENCES "unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "issuance_stock_item_issuanceRecordId_idx" ON "issuance_stock_item"("issuanceRecordId");
CREATE INDEX "issuance_stock_item_itemId_idx" ON "issuance_stock_item"("itemId");
