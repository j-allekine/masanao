CREATE TABLE "recipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "preparationNote" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "recipe_ingredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "enteredQuantity" TEXT NOT NULL,
    "itemUnitConversionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "recipe_ingredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "recipe_ingredient_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "recipe_ingredient_itemUnitConversionId_fkey" FOREIGN KEY ("itemUnitConversionId") REFERENCES "item_unit_conversion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "recipe_normalized_name_key" ON "recipe"("normalizedName");
CREATE UNIQUE INDEX "recipe_ingredient_recipeId_itemId_key" ON "recipe_ingredient"("recipeId", "itemId");
CREATE INDEX "recipe_ingredient_recipeId_idx" ON "recipe_ingredient"("recipeId");
CREATE INDEX "recipe_ingredient_itemId_idx" ON "recipe_ingredient"("itemId");
CREATE INDEX "recipe_ingredient_itemUnitConversionId_idx" ON "recipe_ingredient"("itemUnitConversionId");
