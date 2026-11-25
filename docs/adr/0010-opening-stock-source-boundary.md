---
status: accepted
---

# Opening Stock is a stock source independent of procurement

The kitchen has pre-system supplies whose original Purchase Orders cannot always
be identified. Requiring receipt provenance would force fabricated purchasing
records; adding only a pooled quantity would leave issuance without usable source
capacity. The approved Opening Stock specification (#325) chooses a separate,
count-backed source within the existing Inventory Ledger.

Opening Stock establishes the clean operational starting balance. Its lines retain
the counted quantity, selected unit/conversion and explicit assigned cost, including
a deliberately justified zero. Unknown cost remains distinct from zero. These
values support operational Planning costs, not official LGU accounting valuation.

This extends ADR 0008's receipt-only source boundary: issuance consumes opening
capacity before subsequent receipts, retaining recorded opening-line order where
original chronology is unknown. Receipt FIFO and previously posted evidence stay
intact. Allocations still explain stock-out and never create a second deduction.

Corrections are separate, reasoned documents affecting remaining opening-derived
capacity. They do not edit the original starting count or prior issuance. Source
withdrawal quantities, order and centavo evidence must remain stable through
reductions and cost replacements, so corrections cannot reprice earlier meals.

The alternative of reconstructing original POs is rejected because the evidence is
unavailable. An unallocated opening pool is rejected because it would bypass source
capacity and cost traceability. General inventory adjustments, historical issuance
reversal, sample-data cleanup, and official accounting recognition remain outside
this decision. Existing sample records are preserved until a separately authorized
clean-start operation.
