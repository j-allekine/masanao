CREATE TABLE "delivery_receipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchaseOrderId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "purchaseOrderNo" TEXT NOT NULL,
    "receiptNo" TEXT NOT NULL,
    "normalizedReceiptNo" TEXT NOT NULL,
    "receiptDate" DATETIME NOT NULL,
    "note" TEXT,
    "postedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "delivery_receipt_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "delivery_receipt_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "delivery_receipt_line" (
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
    "actualReceivedBaseUnitQuantity" TEXT NOT NULL,
    "varianceNote" TEXT,
    CONSTRAINT "delivery_receipt_line_deliveryReceiptId_fkey" FOREIGN KEY ("deliveryReceiptId") REFERENCES "delivery_receipt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "delivery_receipt_line_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "delivery_receipt_line_selectedUnitId_fkey" FOREIGN KEY ("selectedUnitId") REFERENCES "unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "delivery_receipt_line_baseUnitId_fkey" FOREIGN KEY ("baseUnitId") REFERENCES "unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "inventory_ledger_movement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deliveryReceiptLineId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "baseUnitId" TEXT NOT NULL,
    "quantity" TEXT NOT NULL,
    "movementType" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    CONSTRAINT "inventory_ledger_movement_deliveryReceiptLineId_fkey" FOREIGN KEY ("deliveryReceiptLineId") REFERENCES "delivery_receipt_line" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "inventory_ledger_movement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "inventory_ledger_movement_baseUnitId_fkey" FOREIGN KEY ("baseUnitId") REFERENCES "unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "delivery_receipt_vendorId_normalizedReceiptNo_key" ON "delivery_receipt"("vendorId", "normalizedReceiptNo");
CREATE INDEX "delivery_receipt_purchaseOrderId_idx" ON "delivery_receipt"("purchaseOrderId");
CREATE INDEX "delivery_receipt_line_deliveryReceiptId_idx" ON "delivery_receipt_line"("deliveryReceiptId");
CREATE INDEX "delivery_receipt_line_itemId_idx" ON "delivery_receipt_line"("itemId");
CREATE UNIQUE INDEX "inventory_ledger_movement_deliveryReceiptLineId_key" ON "inventory_ledger_movement"("deliveryReceiptLineId");
CREATE INDEX "inventory_ledger_movement_itemId_idx" ON "inventory_ledger_movement"("itemId");
