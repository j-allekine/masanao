# Inventory v1 delivery

Specification: [#248](https://github.com/j-allekine/masanao/issues/248).

## Ticket graph

- #249: Required Item Reorder level, migration and maintenance.
- #250: Read-only Inventory and exact stock status (after #249).
- #251, #252, #253: Name search, Category and Stock status filters (after #250).
- #254: Combined filters and pagination (after #251–#253).
- #255, #256: Freshness and CSV export (after #254).

## Scope

Supply Operations owns Inventory. Posted receipts add stock; posted issuance
subtracts stock. Drafts and Reorder level edits do not move stock. Existing
shortage, FIFO and immutable-history rules remain in force.

## Verification

Implementation and verification are in progress. Record final results here
before marking the pull request ready for review.
