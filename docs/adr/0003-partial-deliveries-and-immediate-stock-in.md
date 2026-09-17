---
status: accepted
---

# Partial Deliveries and Immediate Stock-In

Masanao records future Delivery Receipts under a Purchase Order. The Purchase
Order is a vendor/order reference and does not define expected Item quantities
or Purchase Order Lines in the current contract. Future Delivery Receipt Lines
own the actual Item and quantity data. Once that receiving slice is specified,
one delivery action will immediately record the delivered quantity as posted
stock-in; any over-delivery behavior must be reconciled with the accepted
ordered-quantity contract.

This keeps the MVP receiving flow simple without defining any formal LGU procurement or acceptance procedure, while preserving accountable delivery and inventory history.
