-- CreateTable
CREATE TABLE "unit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "normalizedAbbreviation" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "unit_normalizedName_key" ON "unit"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "unit_normalizedAbbreviation_key" ON "unit"("normalizedAbbreviation");
