-- Preserve the old source cost basis beside the reviewed residual value.
-- Existing additions and reductions keep their original evidence unchanged.
ALTER TABLE "opening_stock_correction_line" ADD COLUMN "sourceQuantity" TEXT;
ALTER TABLE "opening_stock_correction_line" ADD COLUMN "sourceAmount" TEXT;
CREATE INDEX "opening_stock_source_originalSourceId_idx" ON "opening_stock_source"("originalSourceId");
