# Inventory v1 delivery

Specification: [#248](https://github.com/j-allekine/masanao/issues/248).

## Ticket graph

- #249: Required Item Reorder level, migration and maintenance.
- #250: Read-only Inventory and exact stock status (after #249).
- #251, #252, #253: Name search, Category and Stock status filters (after #250).
- #254: Combined filters and pagination (after #251–#253).
- #255: Freshness (after #254).
- #256: CSV export and the complete authenticated journey (after #255).

## Scope

Supply Operations owns Inventory. Posted receipts add stock; posted issuance
subtracts stock. Drafts and Reorder level edits do not move stock. Existing
shortage, FIFO and immutable-history rules remain in force.

Active Items appear even before their first receipt. Exact Base Unit balances
and Reorder levels determine Good, Reorder now or Out of stock; malformed
stock evidence remains visible as Review required. Related inactive Categories
and Units do not hide active Items.

Name search, Category and Stock status filters compose before ten-row
pagination. Refresh, route entry and browser history restore current stock.
CSV exports every matching row, including other pages, with exact decimal
quantities, a generation timestamp and spreadsheet formula protection.

Existing Items receive a one-time migration placeholder of 10 in their Base
Unit. Administrators should replace these placeholders with operational levels.
New Items require an explicit positive level; repeated seeding preserves edits.

Review repairs contain the receiving dialog at 320px, retain keyboard and
pointer access to Close, preserve typing during a pending Inventory refresh,
and clear filters when Inventory is opened again from the sidebar.

## Verification

Verified on 2026-10-20 at implementation commit `ec720574`:

- All 454 unit/integration tests passed across 66 files in the final run.
- All 30 selected Playwright tests passed together in 3.3 minutes. Coverage
  includes Inventory, Item Reorder levels, receiving, issuance, CSV, hydration
  and workspace navigation at desktop and narrow-mobile widths.
- ESLint, TypeScript and the production build passed. Both architecture tests
  passed; Prisma validation, client generation and all 28 migrations were
  verified against an isolated database, including repeat deployment.
- Standards and Spec reviews have zero outstanding findings.

Earlier runs exposed the repaired search and sidebar regressions and a
receiving-route readiness wait. An initial unit run timed out under concurrent
checks; the final standalone unit and browser results above are complete runs,
not combined totals from separate reruns.

Fresh screenshots, red/green regression evidence and verification logs are
retained outside the repository in the task's `scratch/inventory-248` folder.
