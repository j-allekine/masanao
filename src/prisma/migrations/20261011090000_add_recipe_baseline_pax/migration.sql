-- Existing Recipes keep an unset baseline until a manager supplies one.
ALTER TABLE "recipe" ADD COLUMN "baselinePax" INTEGER;
