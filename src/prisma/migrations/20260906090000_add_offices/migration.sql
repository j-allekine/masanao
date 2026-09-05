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
    CHECK ("name" = trim("name") AND length("name") BETWEEN 1 AND 200),
    CHECK ("abbreviation" IS NULL OR ("abbreviation" = trim("abbreviation") AND length("abbreviation") BETWEEN 1 AND 20)),
    CHECK ("headName" IS NULL OR ("headName" = trim("headName") AND length("headName") BETWEEN 1 AND 200)),
    CHECK ("headDesignation" IS NULL OR ("headDesignation" = trim("headDesignation") AND length("headDesignation") BETWEEN 1 AND 150)),
    CHECK ("officialEmail" IS NULL OR ("officialEmail" = trim("officialEmail") AND length("officialEmail") BETWEEN 1 AND 254)),
    CHECK ("contactNumber" IS NULL OR ("contactNumber" = trim("contactNumber") AND length("contactNumber") BETWEEN 1 AND 100))
);

-- SQLite's NOCASE collation provides case-insensitive identity checks while
-- preserving the LGU-maintained display casing in the stored columns.
CREATE UNIQUE INDEX "office_name_nocase_key"
ON "office" ("name" COLLATE NOCASE);

CREATE UNIQUE INDEX "office_abbreviation_nocase_key"
ON "office" ("abbreviation" COLLATE NOCASE);
