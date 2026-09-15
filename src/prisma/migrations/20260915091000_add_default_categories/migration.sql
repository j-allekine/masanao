-- Provide broad starter categories for municipal-kitchen Items. Categories are
-- flat classifications only: they do not control Units, storage, expiry, or
-- accounting behavior.
--
-- Preserve any Category an administrator has already created on an upgraded
-- database. SQLite's OR IGNORE covers conflicts on the stable id or normalized
-- name without altering the existing record.
INSERT OR IGNORE INTO "category" ("id", "name", "description", "normalizedName", "isActive", "createdAt", "updatedAt")
VALUES
  ('default-category-staples-dry-goods', 'Staples & Dry Goods', 'Covers rice, flour, sugar, noodles, and grains.', 'staples & dry goods', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-category-fresh-produce', 'Fresh Produce', 'Covers vegetables, fruit, and fresh herbs.', 'fresh produce', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-category-meat-poultry-seafood', 'Meat, Poultry & Seafood', 'Covers fresh or chilled protein.', 'meat, poultry & seafood', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-category-dairy-eggs', 'Dairy & Eggs', 'Covers milk, cheese, eggs, and butter.', 'dairy & eggs', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-category-canned-packaged-food', 'Canned & Packaged Food', 'Covers canned goods and ready-to-cook goods.', 'canned & packaged food', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-category-condiments-seasonings', 'Condiments & Seasonings', 'Covers salt, spices, sauces, and seasoning mixes.', 'condiments & seasonings', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-category-beverages', 'Beverages', 'Covers drinking water, juice, and coffee.', 'beverages', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-category-frozen-food', 'Frozen Food', 'Covers frozen meat, vegetables, and prepared food.', 'frozen food', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-category-cleaning-sanitation-supplies', 'Cleaning & Sanitation Supplies', 'Covers detergent, disinfectant, and soap.', 'cleaning & sanitation supplies', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-category-kitchen-food-service-supplies', 'Kitchen & Food-Service Supplies', 'Covers consumable kitchen-use supplies.', 'kitchen & food-service supplies', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-category-packaging-disposables', 'Packaging & Disposables', 'Covers food containers, cups, and plastic wrap.', 'packaging & disposables', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-category-office-administrative-supplies', 'Office & Administrative Supplies', 'Covers paper, pens, and printer consumables.', 'office & administrative supplies', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-category-other-supplies', 'Other Supplies', 'Covers legitimate items that do not fit yet.', 'other supplies', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
