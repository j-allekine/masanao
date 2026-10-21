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

Reverified on 2026-10-22 at application commit `1a2a760`:

- All 456 unit/integration tests passed across 66 files in one run.
- All 127 Playwright tests passed together in one complete 11-minute run.
  Coverage includes Inventory, Item Reorder levels, receiving, issuance, CSV,
  hydration, all catalogs and workspace navigation at desktop and mobile widths.
- ESLint, TypeScript and the production build passed. Both architecture tests
  passed; Prisma validation, client generation and all 28 migrations were
  verified against an isolated database, including repeat deployment.
- Standards and Spec reviews have zero outstanding findings.

Review repairs reject stock movements recorded in a different Base Unit before
calculating balances or posting issuance. Browser repairs guard controls until
hydration, clean up owned test Items and align workspace navigation snapshots.
The Category control now remains visible after desktop-to-mobile resizing.
Stock badges and selected status filters use semantic green, amber and red
colors while retaining their text labels. The production preview was rebuilt
and checked with its existing isolated sample data preserved.

Earlier broad browser runs failed or were interrupted during diagnosis. The
counts above describe complete successful runs, not totals combined from
separate reruns. Focused status and Category checks also passed independently.

Fresh screenshots, red/green regression evidence and verification logs are
retained outside the repository in the task's `scratch/inventory-248` folder.
