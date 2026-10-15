---
status: accepted
---

# Item-specific fixed conversions with transaction overrides

Masanao keeps Units as reusable labels, while each Item may define a fixed conversion from an alternate Unit to its Base Unit. The conversion is available for both receiving and issuance, and inventory movements remain in the Item's Base Unit.

The original transaction-override direction was narrowed by the later receiving simplification and [ADR 0007](0007-recipe-baselines-and-meal-issuance-quantities.md): Delivery Receipts post the calculated Base Unit quantity without a separate actual-received override or variance note. Issuance permits an explicit final combined Item quantity adjustment before posting, retaining the calculation and leaving the master conversion unchanged. Neither workflow permits edits to posted quantities.
