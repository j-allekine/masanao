PRAGMA foreign_keys=OFF;

-- Product decision: permanently remove superseded actual-received and variance
-- values from historic Delivery Receipt Lines. They are not archived or backfilled.
CREATE TABLE "new_delivery_receipt_line" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deliveryReceiptId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "selectedUnitId" TEXT NOT NULL,
    "baseUnitId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "selectedUnitName" TEXT NOT NULL,
    "baseUnitName" TEXT NOT NULL,
    "enteredQuantity" TEXT NOT NULL,
    "conversionFactor" TEXT NOT NULL,
    "calculatedBaseUnitQuantity" TEXT NOT NULL,
    "unitPrice" TEXT,
    "lineAmount" TEXT,
    CONSTRAINT "delivery_receipt_line_deliveryReceiptId_fkey" FOREIGN KEY ("deliveryReceiptId") REFERENCES "delivery_receipt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "delivery_receipt_line_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "delivery_receipt_line_selectedUnitId_fkey" FOREIGN KEY ("selectedUnitId") REFERENCES "unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "delivery_receipt_line_baseUnitId_fkey" FOREIGN KEY ("baseUnitId") REFERENCES "unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_delivery_receipt_line" (
    "id", "deliveryReceiptId", "itemId", "selectedUnitId", "baseUnitId",
    "itemName", "selectedUnitName", "baseUnitName", "enteredQuantity",
    "conversionFactor", "calculatedBaseUnitQuantity"
)
SELECT
    "id", "deliveryReceiptId", "itemId", "selectedUnitId", "baseUnitId",
    "itemName", "selectedUnitName", "baseUnitName", "enteredQuantity",
    "conversionFactor", "calculatedBaseUnitQuantity"
FROM "delivery_receipt_line";

DROP TABLE "delivery_receipt_line";
ALTER TABLE "new_delivery_receipt_line" RENAME TO "delivery_receipt_line";

CREATE INDEX "delivery_receipt_line_deliveryReceiptId_idx" ON "delivery_receipt_line"("deliveryReceiptId");
CREATE INDEX "delivery_receipt_line_itemId_idx" ON "delivery_receipt_line"("itemId");

PRAGMA foreign_keys=ON;
