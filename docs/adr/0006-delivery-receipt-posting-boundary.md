---
status: accepted
---

# Delivery Receipt Posting Boundary

Masanao records an actual delivery through a Purchase Order's detail page. A
Delivery Receipt has one Vendor-scoped, normalized receipt number, an actual
receipt date (without a time), a system-managed posting timestamp, and one or
more Delivery Receipt Lines. Each line records an Item, the selected Item
Unit, the entered quantity, the conversion factor and calculated Base Unit
quantity, and the final actual received Base Unit quantity. The actual
quantity defaults to the calculation. When it differs,
the line requires a short variance note. The same Item may appear on more than
one line when its deliveries use different units or packaging. A receipt may
have a short optional note for practical delivery context. Each posted line
also retains its Item and Unit display names as posting-time snapshots.
Each receipt retains the Purchase Order Vendor identifier and Vendor display
name, and Purchase Order number as posting-time snapshots. The Purchase Order
Vendor cannot change after its first posted Delivery Receipt; its Purchase
Order number remains editable without rewriting posted receipt history.

One **Post delivery** action atomically records the Delivery Receipt, its
lines, and the corresponding Inventory Ledger stock-in movements. There is no
draft state. A posted Delivery Receipt is immutable: Masanao does not provide
receipt editing, deletion, returns, or corrections in this slice. An Item with
a posted Delivery Receipt Line cannot be deactivated. A Purchase Order with a
Delivery Receipt cannot be deleted.

Any authenticated kitchen staff member may post a Delivery Receipt. Purchase
Order creation, editing, and deletion remain administrator-only.

This preserves accountable stock history while keeping Purchase Orders as
vendor and document references rather than introducing Purchase Order Lines,
expected quantities, delivery variance, or generic procurement workflows.

## Consequences

- Staff start receiving from a Purchase Order detail page, where receipt
  history remains visible.
- An entered alternate Item Unit may calculate the line's Base Unit quantity;
  the calculation and final actual received Base Unit quantity are retained
  with the posted line and stock-in movement. Only the actual received
  quantity is stocked in.
- A later correction, return, adjustment, lot, expiry, or ordered-quantity
  workflow requires its own explicit inventory contract.
