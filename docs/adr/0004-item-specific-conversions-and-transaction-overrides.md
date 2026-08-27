---
status: accepted
---

# Item-specific fixed conversions with transaction overrides

Masanao keeps Units as reusable labels, while each Item may define a fixed conversion from an alternate Unit to its Base Unit. The conversion is available for both receiving and issuance. A transaction may override the calculated Base Unit quantity for that transaction without changing the master conversion, so irregular quantities remain flexible while the Inventory Ledger stays in the Item's Base Unit.
