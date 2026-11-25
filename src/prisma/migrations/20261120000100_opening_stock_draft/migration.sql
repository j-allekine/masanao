-- CreateTable
CREATE TABLE "opening_stock_setup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'not-started',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "attemptId" TEXT,
    "countDate" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "postedAt" DATETIME,
    "postedById" TEXT,
    "postedByName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "opening_stock_line" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "openingStockId" TEXT NOT NULL,
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
    CONSTRAINT "opening_stock_line_openingStockId_fkey" FOREIGN KEY ("openingStockId") REFERENCES "opening_stock_setup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "opening_stock_line_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "opening_stock_line_selectedUnitId_fkey" FOREIGN KEY ("selectedUnitId") REFERENCES "unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "opening_stock_line_baseUnitId_fkey" FOREIGN KEY ("baseUnitId") REFERENCES "unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "opening_stock_line_conversionId_fkey" FOREIGN KEY ("conversionId") REFERENCES "item_unit_conversion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "opening_stock_discard" (
    "attemptId" TEXT NOT NULL PRIMARY KEY,
    "openingStockId" TEXT NOT NULL,
    "resultingRevision" INTEGER NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "discardedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "opening_stock_discard_openingStockId_fkey" FOREIGN KEY ("openingStockId") REFERENCES "opening_stock_setup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "opening_stock_setup_attemptId_key" ON "opening_stock_setup"("attemptId");

-- CreateIndex
CREATE INDEX "opening_stock_line_openingStockId_position_idx" ON "opening_stock_line"("openingStockId", "position");

-- CreateIndex
CREATE INDEX "opening_stock_line_itemId_idx" ON "opening_stock_line"("itemId");
