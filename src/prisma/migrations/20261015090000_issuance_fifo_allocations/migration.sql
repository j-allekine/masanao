CREATE TABLE "issuance_receipt_allocation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "issuanceItemTotalId" TEXT NOT NULL,
  "deliveryReceiptLineId" TEXT NOT NULL,
  "quantity" TEXT NOT NULL,
  "basis" TEXT NOT NULL DEFAULT 'fifo' CHECK ("basis" IN ('fifo', 'reconstructed')),
  "receiptNo" TEXT NOT NULL,
  "purchaseOrderNo" TEXT NOT NULL,
  "receiptDate" DATETIME NOT NULL,
  FOREIGN KEY ("issuanceItemTotalId") REFERENCES "issuance_item_total"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY ("deliveryReceiptLineId") REFERENCES "delivery_receipt_line"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "issuance_receipt_allocation_issuanceItemTotalId_deliveryReceiptLineId_key" ON "issuance_receipt_allocation"("issuanceItemTotalId", "deliveryReceiptLineId");
CREATE INDEX "issuance_receipt_allocation_deliveryReceiptLineId_idx" ON "issuance_receipt_allocation"("deliveryReceiptLineId");
