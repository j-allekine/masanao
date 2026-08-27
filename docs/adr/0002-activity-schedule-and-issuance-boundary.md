---
status: accepted
---

# Activity Schedule and Issuance Boundary

Masanao models a single-date undertaking as an Activity with one Meal Schedule containing multiple user-named and timed Schedule Entries. Once a Schedule Entry contains supply lines, it has exactly one Issuance Record; the record may be drafted, and only a posted Issuance Record changes the Inventory Ledger. Each Food Supply requires a Recipe whose ingredient rows are snapshotted and editable for that entry, while direct-use stock lines remain separate and food remains context rather than Finished Food inventory.

This boundary treats the Schedule Entry as the issuance context, avoiding duplicate deductions and avoiding a separate finished-food production model in the MVP.
