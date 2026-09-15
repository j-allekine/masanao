-- Provide a practical starter catalog for kitchen purchasing and inventory.
--
-- Units remain reusable labels, not conversion factors. `Sack`, for example,
-- does not imply a weight. Item-specific package conversions are maintained
-- separately when that capability is introduced.
--
-- Preserve any Unit an administrator has already created on an upgraded
-- database. SQLite's OR IGNORE covers conflicts on the stable id, normalized
-- name, or normalized abbreviation without altering the existing record.
INSERT OR IGNORE INTO "unit" ("id", "name", "abbreviation", "normalizedName", "normalizedAbbreviation", "active", "createdAt", "updatedAt")
VALUES
  ('default-unit-gram', 'Gram', 'g', 'gram', 'g', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-unit-kilogram', 'Kilogram', 'kg', 'kilogram', 'kg', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-unit-milliliter', 'Milliliter', 'mL', 'milliliter', 'ml', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-unit-liter', 'Liter', 'L', 'liter', 'l', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-unit-piece', 'Piece', 'pc', 'piece', 'pc', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-unit-dozen', 'Dozen', 'doz', 'dozen', 'doz', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-unit-pack', 'Pack', 'pack', 'pack', 'pack', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-unit-sachet', 'Sachet', 'sachet', 'sachet', 'sachet', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-unit-pouch', 'Pouch', 'pouch', 'pouch', 'pouch', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-unit-can', 'Can', 'can', 'can', 'can', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-unit-bottle', 'Bottle', 'bottle', 'bottle', 'bottle', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-unit-jar', 'Jar', 'jar', 'jar', 'jar', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-unit-box', 'Box', 'box', 'box', 'box', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-unit-tray', 'Tray', 'tray', 'tray', 'tray', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-unit-bag', 'Bag', 'bag', 'bag', 'bag', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-unit-sack', 'Sack', 'sack', 'sack', 'sack', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-unit-bundle', 'Bundle', 'bundle', 'bundle', 'bundle', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
