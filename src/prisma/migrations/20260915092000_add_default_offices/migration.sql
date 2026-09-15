-- Provide the statutory municipal Office starter catalog using Masanao's
-- municipality-wide naming convention. Office-head and contact details are
-- intentionally left blank because they are local and change over time.
--
-- Preserve any Office an administrator has already created on an upgraded
-- database. SQLite's OR IGNORE covers conflicts on the stable id, normalized
-- name, or normalized abbreviation without altering the existing record.
INSERT OR IGNORE INTO "office" ("id", "name", "abbreviation", "normalizedName", "normalizedAbbreviation", "isActive", "createdAt", "updatedAt")
VALUES
  ('default-office-mayors-office', 'Mayor''s Office', 'MO', 'mayor''s office', 'mo', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-office-municipal-vice-mayor', 'Municipal Vice Mayor', NULL, 'municipal vice mayor', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-office-municipal-sangguniang-bayan', 'Municipal Sangguniang Bayan', NULL, 'municipal sangguniang bayan', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-office-municipal-sangguniang-bayan-secretariat', 'Municipal Sangguniang Bayan Secretariat', NULL, 'municipal sangguniang bayan secretariat', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-office-municipal-treasurer', 'Municipal Treasurer', NULL, 'municipal treasurer', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-office-municipal-assessor', 'Municipal Assessor', NULL, 'municipal assessor', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-office-municipal-accounting', 'Municipal Accounting', NULL, 'municipal accounting', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-office-municipal-budget', 'Municipal Budget', NULL, 'municipal budget', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-office-municipal-planning-development', 'Municipal Planning and Development', NULL, 'municipal planning and development', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-office-municipal-engineering-building-official', 'Municipal Engineering / Building Official', NULL, 'municipal engineering / building official', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-office-municipal-health', 'Municipal Health', NULL, 'municipal health', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-office-municipal-civil-registrar', 'Municipal Civil Registrar', NULL, 'municipal civil registrar', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('default-office-municipal-cooperatives-development', 'Municipal Cooperatives Development', NULL, 'municipal cooperatives development', NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
