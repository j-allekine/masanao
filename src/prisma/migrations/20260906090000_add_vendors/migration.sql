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
    CHECK ("name" = trim("name", ' ' || char(9) || char(10) || char(11) || char(12) || char(13)) AND length("name") BETWEEN 1 AND 200),
    CHECK ("contactPerson" IS NULL OR ("contactPerson" = trim("contactPerson", ' ' || char(9) || char(10) || char(11) || char(12) || char(13)) AND length("contactPerson") BETWEEN 1 AND 150 AND length(replace(replace(replace(replace(replace(replace("contactPerson", ' ', ''), char(9), ''), char(10), ''), char(11), ''), char(12), ''), char(13), '')) >= 1)),
    CHECK ("contactNumber" IS NULL OR ("contactNumber" = trim("contactNumber", ' ' || char(9) || char(10) || char(11) || char(12) || char(13)) AND length("contactNumber") BETWEEN 1 AND 50 AND length(replace(replace(replace(replace(replace(replace("contactNumber", ' ', ''), char(9), ''), char(10), ''), char(11), ''), char(12), ''), char(13), '')) >= 1)),
    CHECK ("address" IS NULL OR ("address" = trim("address", ' ' || char(9) || char(10) || char(11) || char(12) || char(13)) AND length("address") BETWEEN 1 AND 500 AND length(replace(replace(replace(replace(replace(replace("address", ' ', ''), char(9), ''), char(10), ''), char(11), ''), char(12), ''), char(13), '')) >= 1)),
    -- SQLite has no built-in regular-expression operator. This practical ASCII
    -- shape mirrors Zod's z.email() convention for ordinary email addresses;
    -- the server schema remains the authoritative full validator.
    CHECK ("email" IS NULL OR (
        "email" = trim("email", ' ' || char(9) || char(10) || char(11) || char(12) || char(13))
        AND length("email") BETWEEN 1 AND 254
        AND "email" NOT GLOB '*[^''A-Za-z0-9_+.@-]*'
        AND instr("email", '@') > 1
        AND instr(substr("email", instr("email", '@') + 1), '@') = 0
        AND instr(substr("email", instr("email", '@') + 1), '.') > 0
        AND substr("email", 1, 1) <> '.'
        AND substr("email", instr("email", '@') - 1, 1) GLOB '[A-Za-z0-9_+-]'
        AND "email" NOT GLOB '*..*'
        AND substr("email", instr("email", '@') + 1) NOT GLOB '*[^A-Za-z0-9.-]*'
        AND substr("email", instr("email", '@') + 1, 1) GLOB '[A-Za-z0-9]'
        AND substr("email", instr("email", '@') + 1) NOT GLOB '*.-*'
        AND substr("email", instr("email", '@') + 1) NOT GLOB '*-*.'
        AND substr("email", instr("email", '@') + 1) NOT GLOB '*-'
        AND substr("email", -2) GLOB '[A-Za-z][A-Za-z]'
        AND substr("email", -1) GLOB '[A-Za-z]'
    ))
);

CREATE UNIQUE INDEX "vendor_name_nocase_key"
ON "vendor" ("name" COLLATE NOCASE);
