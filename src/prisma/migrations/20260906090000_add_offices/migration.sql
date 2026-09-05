-- CreateTable
CREATE TABLE "office" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "headName" TEXT,
    "headDesignation" TEXT,
    "officialEmail" TEXT,
    "contactNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "normalizedAbbreviation" TEXT,
    CHECK ("name" = trim("name") AND length("name") BETWEEN 1 AND 200),
    CHECK ("abbreviation" IS NULL OR ("abbreviation" = trim("abbreviation") AND length("abbreviation") BETWEEN 1 AND 20)),
    CHECK ("headName" IS NULL OR ("headName" = trim("headName") AND length("headName") BETWEEN 1 AND 200)),
    CHECK ("headDesignation" IS NULL OR ("headDesignation" = trim("headDesignation") AND length("headDesignation") BETWEEN 1 AND 150)),
    CHECK ("officialEmail" IS NULL OR ("officialEmail" = trim("officialEmail") AND length("officialEmail") BETWEEN 1 AND 254)),
    CHECK ("contactNumber" IS NULL OR ("contactNumber" = trim("contactNumber") AND length("contactNumber") BETWEEN 1 AND 100))
);

-- Normalized identity values are internal comparison keys. The public Office
-- record exposes only the LGU-maintained display fields.
CREATE UNIQUE INDEX "office_normalizedName_key"
ON "office" ("normalizedName");

CREATE UNIQUE INDEX "office_normalizedAbbreviation_key"
ON "office" ("normalizedAbbreviation");
