CREATE TABLE "vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "contactNumber" TEXT,
    "email" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CHECK ("name" = trim("name") AND length("name") BETWEEN 1 AND 200),
    CHECK ("contactPerson" IS NULL OR ("contactPerson" = trim("contactPerson") AND length("contactPerson") <= 150)),
    CHECK ("contactNumber" IS NULL OR ("contactNumber" = trim("contactNumber") AND length("contactNumber") <= 50)),
    CHECK ("email" IS NULL OR ("email" = trim("email") AND length("email") <= 254)),
    CHECK ("address" IS NULL OR ("address" = trim("address") AND length("address") <= 500))
);

CREATE UNIQUE INDEX "vendor_name_nocase_key"
ON "vendor" ("name" COLLATE NOCASE);
