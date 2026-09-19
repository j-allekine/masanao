# Expiry tracking and expired-stock disposition research

## Question

When a received supply has a batch/lot number and expiry date, should the
system automatically remove it from inventory after expiry?

## Finding

**No: expiry should automatically change whether a batch is eligible for use;
it should not automatically subtract physical stock.** The quantity remains
on hand until staff verify it and post an accountable disposition (for example,
discard, return, or a physical-inventory adjustment). That preserves the
difference between a date-based system rule and what actually happened to the
goods.

The field placement matters: `batch/lot number` and `expiry date` belong to an
**inventory batch received on a Delivery Receipt**, not the Item master. One
Item can be received in several batches with different expiry dates, and the
current Masanao workflow already says a single ingredient may be issued from
multiple inventory batches. [MVP workflow](../mvp-workflow.md#issue-supplies)

## What established ERPs do

| ERP | Automatic expiry behavior | What remains a deliberate inventory action |
| --- | --- | --- |
| Oracle Fusion Cloud SCM | Expiry controls a lot's availability for transactions and planning. An expired lot cannot be reserved past its expiry date and is excluded from replenishment/MRP supply. | The lot can still be transacted, remains included in on-hand quantities, and can be counted and adjusted in cycle or physical inventory. [Oracle: Lot Management](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25c/famml/lot-management.html) |
| Microsoft Dynamics 365 Business Central | When FEFO is enabled, warehouse picks automatically sort lot/serial-tracked stock by earliest expiry first. | Item tracking is posted through item journals; its physical inventory journal registers the inventory adjustment. [Microsoft: warehouse management](https://learn.microsoft.com/en-us/dynamics365/business-central/design-details-warehouse-management), [Microsoft: item tracking and journals](https://learn.microsoft.com/en-us/dynamics365/business-central/inventory-how-work-item-tracking) |
| Odoo Inventory | Expiry dates produce alerts/notifications, and FEFO reserves the lots with the nearest removal/expiry date first. | Odoo documents expiry as an alert/removal strategy, rather than an automatic write-off; its removal-strategy documentation warns that a past-expiry lot can still be picked if it was not removed. [Odoo: Expiration dates](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/product_management/product_tracking/expiration_dates.html), [Odoo: FEFO removal](https://www.odoo.com/documentation/18.0/applications/inventory_and_mrp/inventory/shipping_receiving/removal_strategies/fefo.html), [Odoo: removal strategies warning](https://www.odoo.com/documentation/14.0/applications/inventory_and_mrp/inventory/routes/strategies/removal.html) |

These are different products, but the consistent pattern is clear: automate
date-derived visibility and allocation controls; keep the stock-changing
disposal or adjustment auditable and explicitly posted.

## Lean recommendation for Masanao

1. Create an `Inventory Batch` from each posted Delivery Receipt line, with
   the immutable received quantity, optional lot number, optional expiry date,
   and remaining quantity. Do not put a single lot or expiry on `Item`.
2. Calculate `expired` from the current local date and the batch expiry date;
   do not require a scheduled job merely to change this displayed/eligible
   state.
3. On issuance, exclude expired batches by default and allocate eligible
   batches using FEFO (earliest expiry first). Allow staff to select eligible
   batches, since the kitchen may need to account for a physically opened or
   damaged batch.
4. Show upcoming-expiry and expired quantities clearly. Start with an
   operational list/filter; add notification scheduling only when there is an
   agreed owner and response process.
5. Give an authorized staff member an explicit **write-off/disposal** action.
   It posts a negative Inventory Ledger movement against the specific batch,
   requires a reason and quantity, and never deletes or silently rewrites the
   receipt or original stock-in.

This is deliberately narrower than a full quality-management or recall
workflow. It prevents accidental issuance of expired supplies and preserves a
credible accountable balance without pretending the application can observe
physical disposal.

## Sources

- Oracle, [Lot Management](https://docs.oracle.com/en/cloud/saas/supply-chain-and-manufacturing/25c/famml/lot-management.html), expired-lot reservation, on-hand, and adjustment rules (official documentation; accessed 2026-09-19).
- Microsoft, [Manage warehouse activities](https://learn.microsoft.com/en-us/dynamics365/business-central/design-details-warehouse-management), FEFO pick ordering (official documentation; accessed 2026-09-19).
- Microsoft, [Track items with serial, lot, and package numbers](https://learn.microsoft.com/en-us/dynamics365/business-central/inventory-how-work-item-tracking), item and physical-inventory journals (official documentation; accessed 2026-09-19).
- Odoo, [Expiration dates](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory/product_management/product_tracking/expiration_dates.html), alerts and FEFO reservation (official documentation; accessed 2026-09-19).
- Odoo, [FEFO removal](https://www.odoo.com/documentation/18.0/applications/inventory_and_mrp/inventory/shipping_receiving/removal_strategies/fefo.html), removal-date policy (official documentation; accessed 2026-09-19).
- Odoo, [Removal strategies](https://www.odoo.com/documentation/14.0/applications/inventory_and_mrp/inventory/routes/strategies/removal.html), warning about past-expiry picking (official documentation; accessed 2026-09-19).
