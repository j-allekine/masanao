CREATE TABLE "vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "contactPerson" TEXT,
    "contactNumber" TEXT,
    "email" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CHECK ("name" = trim("name", char(9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279)) AND length("name") BETWEEN 1 AND 200),
    CHECK ("contactPerson" IS NULL OR ("contactPerson" = trim("contactPerson", char(9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279)) AND length("contactPerson") BETWEEN 1 AND 150 AND length(trim("contactPerson", char(9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279))) >= 1)),
    CHECK ("contactNumber" IS NULL OR ("contactNumber" = trim("contactNumber", char(9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279)) AND length("contactNumber") BETWEEN 1 AND 50 AND length(trim("contactNumber", char(9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279))) >= 1)),
    CHECK ("address" IS NULL OR ("address" = trim("address", char(9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279)) AND length("address") BETWEEN 1 AND 500 AND length(trim("address", char(9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279))) >= 1)),
    CHECK (length("normalizedName") >= 1),
    -- SQLite has no built-in regular-expression operator. This practical ASCII
    -- shape mirrors Zod's z.email() convention for ordinary email addresses;
    -- the server schema remains the authoritative full validator.
    CHECK ("email" IS NULL OR (
        "email" = trim("email", char(9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279))
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

CREATE UNIQUE INDEX "vendor_normalized_name_key"
ON "vendor" ("normalizedName");
