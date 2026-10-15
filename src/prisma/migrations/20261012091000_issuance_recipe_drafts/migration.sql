-- CreateTable
CREATE TABLE "issuance_record" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mealScheduleId" TEXT NOT NULL,
    "mealPax" INTEGER,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "issuance_record_mealScheduleId_fkey" FOREIGN KEY ("mealScheduleId") REFERENCES "meal_schedule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "issuance_recipe_snapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issuanceRecordId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "recipeName" TEXT NOT NULL,
    "baselinePax" INTEGER NOT NULL,
    "sourceRevision" TEXT NOT NULL,
    "targetMode" TEXT NOT NULL,
    "targetPax" INTEGER,
    CONSTRAINT "issuance_recipe_snapshot_issuanceRecordId_fkey" FOREIGN KEY ("issuanceRecordId") REFERENCES "issuance_record" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "issuance_recipe_snapshot_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipe" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "issuance_recipe_ingredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipeSnapshotId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "enteredQuantity" TEXT NOT NULL,
    "conversionFactor" TEXT NOT NULL,
    "selectedUnitId" TEXT NOT NULL,
    "selectedUnitName" TEXT NOT NULL,
    "selectedUnitAbbreviation" TEXT NOT NULL,
    "baseUnitId" TEXT NOT NULL,
    "baseUnitName" TEXT NOT NULL,
    "baseUnitAbbreviation" TEXT NOT NULL,
    CONSTRAINT "issuance_recipe_ingredient_recipeSnapshotId_fkey" FOREIGN KEY ("recipeSnapshotId") REFERENCES "issuance_recipe_snapshot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "issuance_recipe_ingredient_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "issuance_recipe_ingredient_selectedUnitId_fkey" FOREIGN KEY ("selectedUnitId") REFERENCES "unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "issuance_recipe_ingredient_baseUnitId_fkey" FOREIGN KEY ("baseUnitId") REFERENCES "unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "issuance_record_mealScheduleId_key" ON "issuance_record"("mealScheduleId");

-- CreateIndex
CREATE INDEX "issuance_recipe_snapshot_recipeId_idx" ON "issuance_recipe_snapshot"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "issuance_recipe_snapshot_issuanceRecordId_recipeId_key" ON "issuance_recipe_snapshot"("issuanceRecordId", "recipeId");

-- CreateIndex
CREATE INDEX "issuance_recipe_ingredient_recipeSnapshotId_idx" ON "issuance_recipe_ingredient"("recipeSnapshotId");

-- CreateIndex
CREATE INDEX "issuance_recipe_ingredient_itemId_idx" ON "issuance_recipe_ingredient"("itemId");


