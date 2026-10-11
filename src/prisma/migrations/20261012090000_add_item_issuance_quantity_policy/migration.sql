-- Existing Items retain today's permissive issuance quantity behavior.
ALTER TABLE "item"
ADD COLUMN "issuanceQuantityPolicy" TEXT NOT NULL DEFAULT 'allow-decimals';
