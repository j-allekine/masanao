-- Existing Items are sample data. Apply the placeholder once, without a default
-- on future writes or any changes to stock/history tables.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "baseUnitId" TEXT NOT NULL,
    "note" TEXT,
    "reorderLevel" TEXT NOT NULL,
    "issuanceQuantityPolicy" TEXT NOT NULL DEFAULT 'allow-decimals',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "item_baseUnitId_fkey" FOREIGN KEY ("baseUnitId") REFERENCES "unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_item" ("id", "name", "normalizedName", "categoryId", "baseUnitId", "note", "reorderLevel", "issuanceQuantityPolicy", "isActive", "createdAt", "updatedAt")
SELECT "id", "name", "normalizedName", "categoryId", "baseUnitId", "note", '10', "issuanceQuantityPolicy", "isActive", "createdAt", "updatedAt" FROM "item";
DROP TABLE "item";
ALTER TABLE "new_item" RENAME TO "item";
CREATE UNIQUE INDEX "item_normalized_name_key" ON "item"("normalizedName");
CREATE INDEX "item_categoryId_idx" ON "item"("categoryId");
CREATE INDEX "item_baseUnitId_idx" ON "item"("baseUnitId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
