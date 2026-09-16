CREATE TABLE "item_unit_conversion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "itemId" TEXT NOT NULL,
  "alternateUnitId" TEXT NOT NULL,
  "baseUnitQuantity" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "item_unit_conversion_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "item_unit_conversion_alternateUnitId_fkey" FOREIGN KEY ("alternateUnitId") REFERENCES "unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "item_unit_conversion_itemId_alternateUnitId_baseUnitQuantity_key"
ON "item_unit_conversion"("itemId", "alternateUnitId", "baseUnitQuantity");

CREATE INDEX "item_unit_conversion_itemId_idx" ON "item_unit_conversion"("itemId");
CREATE INDEX "item_unit_conversion_alternateUnitId_idx" ON "item_unit_conversion"("alternateUnitId");
