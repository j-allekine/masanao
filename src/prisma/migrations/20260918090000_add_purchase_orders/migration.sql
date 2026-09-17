CREATE TABLE "purchase_order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseOrderNo" TEXT NOT NULL,
    "normalizedPurchaseOrderNo" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "purchase_order_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CHECK ("purchaseOrderNo" = trim("purchaseOrderNo", char(9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279)) AND length("purchaseOrderNo") BETWEEN 1 AND 100),
    CHECK (length("normalizedPurchaseOrderNo") BETWEEN 1 AND 100),
    CHECK ("referenceNumber" IS NULL OR ("referenceNumber" = trim("referenceNumber", char(9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279)) AND length("referenceNumber") BETWEEN 1 AND 100)),
    CHECK ("note" IS NULL OR ("note" = trim("note", char(9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279)) AND length("note") BETWEEN 1 AND 500))
);

CREATE UNIQUE INDEX "purchase_order_no_nocase_key"
ON "purchase_order" ("purchaseOrderNo" COLLATE NOCASE);

CREATE UNIQUE INDEX "purchase_order_normalized_no_key"
ON "purchase_order" ("normalizedPurchaseOrderNo");

CREATE INDEX "purchase_order_vendorId_idx"
ON "purchase_order" ("vendorId");
