---
status: accepted
---

# FIFO receipt allocation for issuance

The pooled ledger reconciles received and issued quantities but cannot identify which deliveries supplied a meal. Use receipt-level FIFO allocations so each posted Item total traces through one or more Delivery Receipt Lines to their Purchase Orders, without introducing expiry dates or lot tracking.

Select the oldest actual receipt date first, breaking ties by receipt posting time, receipt identity and line identity. Quantities remain exact in Base Units. Allocations and stock-out commit together under the existing posting lock; failures and retries must not overdraw a receipt or deduct twice. Later backdated receipts participate in subsequent postings and never rewrite completed allocations. Receipt and PO display evidence is retained with the allocation.

## Existing sample history

The user confirmed existing data is sample data and permitted reconstruction. On subsequent posting for an Item, reconstruct previously unallocated stock-outs in posting order using remaining FIFO receipt capacities. Label these links `reconstructed`: they are assumptions and may use receipts available at reconstruction time, not proof of what was picked historically. Preserve original ledger rows, quantities, timestamps and posting evidence. Inconsistent or insufficient source evidence blocks posting. This sample-data choice is not permission to assert reconstructed provenance as recorded fact for a future real-data migration.

## Alternatives and boundaries

Pooled balances alone omit PO traceability. An unallocated opening stock pool preserves uncertainty but postpones traceability for existing stock. FIFO was chosen for the current receipt-based workflow; FEFO requires expiry data and remains outside scope, alongside lot/batch management, costing, corrections, reversals and returns. Allocations do not introduce a second ledger or deduction. See [the FIFO specification](../specs/issuance-fifo.md).
