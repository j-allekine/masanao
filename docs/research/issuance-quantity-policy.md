# Issuance quantity policy research

Researched 2026-10-11. Primary official documentation; recommendations below are Masanao choices, not a universal industry standard.

## Item setup and indivisible quantities

- [Microsoft Business Central: Set up item units of measure](https://learn.microsoft.com/en-us/dynamics365/business-central/inventory-how-setup-units-of-measure) assigns the Base Unit on the Item Card and puts Quantity Rounding Precision on the Item Units of Measure record. Precision `1` supports whole Base Unit quantities. This is Item/UoM-specific, rather than a rule guessed from an Item name.
- [Oracle Inventory Management: Creating a New Production Unit](https://docs.oracle.com/en/industries/food-beverage/inventory-management/invug/t_masterdata_create_production_unit.htm) instead allows a rounding decimal-place setting on a Production Unit. This demonstrates a different setup model; it does not prove that every Item using `piece` must be indivisible.
- [Oracle: Modifying an Order Calculation](https://docs.oracle.com/en/industries/food-beverage/back-office/invug/t_maintenance_modify_order_cal.htm) offers up/down/nearest rounding for procurement quantities such as cases. Procurement rounding is not evidence that issuance should automatically round every recipe ingredient upward.

### Lean Masanao recommendation

In Item create/edit, beside Base Unit, show **Issuance quantities** with two choices:

- **Allow decimals** — for quantities such as kilograms and liters.
- **Whole Base Units only** — for Items physically issued as individual pieces.

Helper: “Applies after conversion to this Item's Base Unit. Fractional totals must be adjusted before posting.”

Use an explicit Item setting, not a global Unit restriction or name inference. Do not silently classify existing Items. This adds a small Item setup dependency to the issuance spec; it does not belong to the Recipe baseline spec. It controls validation, not automatic rounding. Aggregate all recipe contributions for each Item first: two 12.5-egg contributions yield a valid 25-egg issuance. A per-recipe fraction can be informational; an invalid final Item total blocks posting. Stock checks and deduction use the confirmed final quantity.

## Changes after manual quantity adjustments

- [Business Central: Replan or refresh production orders](https://learn.microsoft.com/en-us/dynamics365/business-central/production-how-to-replan-refresh-production-orders) recalculates components following order changes and explicitly warns that component calculation deletes prior component changes.
- [Business Central: Register consumption/output](https://learn.microsoft.com/en-us/dynamics365/business-central/production-how-to-register-consumption-and-output) starts from expected quantities, allows actual quantities before posting, and records actual posted quantities separately.
- [Oracle: Scaling a Recipe](https://docs.oracle.com/en/industries/food-beverage/back-office/invug/t_recipes_scale_recipe.htm) distinguishes scaling ingredient quantities from changing only portions or portion size. It does not document a universal rule to lock pax after an actual-quantity adjustment.

### Lean Masanao recommendation

The evidence supports deliberate recalculation and a distinction between expected and actual quantities. It does **not** establish that blocking pax changes after adjustment is the standard. A lock is a reasonable safety choice for Masanao:

1. While the draft has no adjusted final quantities, staff can change pax and recipe selection.
2. After staff adjust a final Item quantity, lock controls that can change calculated demand: meal/recipe pax, add/remove recipe, and other demand-changing draft controls.
3. Show “Quantities adjusted. Reset adjustments to change pax or recipes.”
4. Provide **Reset quantity adjustments** with confirmation. Reset discards manual final quantities and returns the draft to automatic calculations; it is not a posted reversal.
5. Posted issuance remains immutable, as already agreed.

Do not permanently trap an unposted draft. Confirm whether the user meant a temporary lock with this reset path, or no pax changes at all after adding recipes. The latter would make routine planning changes unnecessarily costly.

## Limits

Manufacturing products are useful evidence for calculation/actual-quantity separation, but Masanao is a meal issuance workflow, not a manufacturing ERP. No foodservice source reviewed establishes a universal whole-quantity Item checkbox or permanent post-adjustment pax lock. Exact decimal precision, existing-Item migration, permissions, and the draft reset scope remain product decisions.
