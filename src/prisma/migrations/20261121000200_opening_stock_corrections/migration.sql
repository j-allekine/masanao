-- CreateTable
CREATE TABLE "opening_stock_correction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "openingStockId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'add-omitted',
    "status" TEXT NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft', 'posted')),
    "revision" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "postedAt" DATETIME,
    "postedById" TEXT,
    "postedByName" TEXT,
    "discardedAt" DATETIME,
    "discardedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CHECK (("status" = 'draft' AND "postedAt" IS NULL AND "postedById" IS NULL) OR ("status" = 'posted' AND "postedAt" IS NOT NULL AND "postedById" IS NOT NULL AND "discardedAt" IS NULL)),
    CONSTRAINT "opening_stock_correction_openingStockId_fkey" FOREIGN KEY ("openingStockId") REFERENCES "opening_stock_setup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "opening_stock_correction_line" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "correctionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" TEXT NOT NULL DEFAULT '',
    "selectedUnitId" TEXT NOT NULL,
    "selectedUnitName" TEXT NOT NULL,
    "selectedUnitAbbreviation" TEXT NOT NULL,
    "conversionId" TEXT,
    "conversionFactor" TEXT NOT NULL,
    "baseUnitId" TEXT NOT NULL,
    "baseUnitName" TEXT NOT NULL,
    "baseUnitAbbreviation" TEXT NOT NULL,
    "openingUnitCost" TEXT NOT NULL DEFAULT '',
    "zeroCostReason" TEXT NOT NULL DEFAULT '',
    "calculatedBaseUnitQuantity" TEXT,
    "lineAmount" TEXT,
    "beforeQuantity" TEXT NOT NULL DEFAULT '0',
    "beforeValueCentavos" TEXT NOT NULL DEFAULT '0',
    "afterQuantity" TEXT,
    "afterValueCentavos" TEXT,
    "sourceState" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "opening_stock_correction_line_correctionId_fkey" FOREIGN KEY ("correctionId") REFERENCES "opening_stock_correction" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "opening_stock_correction_line_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "opening_stock_correction_line_selectedUnitId_fkey" FOREIGN KEY ("selectedUnitId") REFERENCES "unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "opening_stock_correction_line_baseUnitId_fkey" FOREIGN KEY ("baseUnitId") REFERENCES "unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "opening_stock_correction_line_conversionId_fkey" FOREIGN KEY ("conversionId") REFERENCES "item_unit_conversion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_opening_stock_source" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "openingStockId" TEXT NOT NULL,
    "openingStockLineId" TEXT,
    "correctionLineId" TEXT,
    "originalSourceId" TEXT,
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
    CONSTRAINT "opening_stock_source_openingStockId_fkey" FOREIGN KEY ("openingStockId") REFERENCES "opening_stock_setup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "opening_stock_source_correctionLineId_fkey" FOREIGN KEY ("correctionLineId") REFERENCES "opening_stock_correction_line" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "opening_stock_source_originalSourceId_fkey" FOREIGN KEY ("originalSourceId") REFERENCES "opening_stock_source" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
    CONSTRAINT "opening_stock_source_openingStockLineId_fkey" FOREIGN KEY ("openingStockLineId") REFERENCES "opening_stock_line" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "opening_stock_source_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "opening_stock_source_baseUnitId_fkey" FOREIGN KEY ("baseUnitId") REFERENCES "unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_opening_stock_source" ("amount", "baseUnitAbbreviation", "baseUnitId", "baseUnitName", "countDate", "id", "itemId", "itemName", "openingStockId", "openingStockLineId", "position", "postedAt", "quantity", "reference", "revision") SELECT "amount", "baseUnitAbbreviation", "baseUnitId", "baseUnitName", "countDate", "id", "itemId", "itemName", "openingStockId", "openingStockLineId", "position", "postedAt", "quantity", "reference", "revision" FROM "opening_stock_source";
DROP TABLE "opening_stock_source";
ALTER TABLE "new_opening_stock_source" RENAME TO "opening_stock_source";
CREATE UNIQUE INDEX "opening_stock_source_openingStockLineId_key" ON "opening_stock_source"("openingStockLineId");
CREATE UNIQUE INDEX "opening_stock_source_correctionLineId_key" ON "opening_stock_source"("correctionLineId");
CREATE INDEX "opening_stock_source_itemId_position_idx" ON "opening_stock_source"("itemId", "position");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "opening_stock_correction_reference_key" ON "opening_stock_correction"("reference");

-- CreateIndex
CREATE INDEX "opening_stock_correction_openingStockId_createdAt_idx" ON "opening_stock_correction"("openingStockId", "createdAt");

-- CreateIndex
CREATE INDEX "opening_stock_correction_line_correctionId_position_idx" ON "opening_stock_correction_line"("correctionId", "position");
