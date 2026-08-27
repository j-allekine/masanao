---
status: accepted
---

# Partial Deliveries and Immediate Stock-In

Masanao records all deliveries under a Purchase Order. A PO line may be fulfilled through multiple Delivery Receipts, and each receipt line references a PO line. One delivery action immediately records the delivered quantity as posted stock-in; over-delivery is allowed, is not blocked, and is shown as a warning or variance.

This keeps the MVP receiving flow simple without defining any formal LGU procurement or acceptance procedure, while preserving accountable delivery and inventory history.
