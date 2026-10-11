# Fractional issuance quantities

Research date: 2026-10-11. This note informs the recipe/issuance decisions; it does not approve additional scope.

## Findings from official systems

- Microsoft Business Central supports **quantity rounding precision on an item's unit of measure**. Its documentation distinguishes inventory's base unit from alternate handling units and explains why conversions can produce awkward fractional quantities. Its example uses precision 1 to turn an approximately five-piece receipt into five pieces. This supports configured quantity precision, not a universal rule to always round food ingredients upward. [Microsoft: Set up units of measure](https://learn.microsoft.com/en-us/dynamics365/business-central/inventory-how-setup-units-of-measure)
- Microsoft Business Central supports both automatic consumption posting and a manual consumption journal. Its calculation can use expected output or reported actual output; posting reduces inventory. This supports a choice between calculated and actual issue workflows, not a mandate for editable ingredient quantities in every recipe screen. [Microsoft: Batch post production consumption](https://learn.microsoft.com/en-us/dynamics365/business-central/production-how-to-post-consumption)

These are examples of established patterns, not evidence of one universally mandated standard. They do not establish that Masanao needs a particular Item-level Boolean field.

## Implications for Masanao

Recipe requirement and physical issue quantity are different concepts. If scaling calculates 12.5 eggs but staff physically issue 13 eggs, deducting 12.5 records the wrong stock movement. A warning alone highlights this problem but cannot resolve it.

Two viable policies:

1. **Configured rounding, no manual override:** identify which Item/base-unit quantities must be whole; show the calculation and the final rounded issue quantity; use that final quantity for availability checking and posting. A rounding-up policy is a product decision, not something the cited sources mandate.
2. **Narrow exception adjustment:** ordinarily use the calculated quantity; when a whole-item fraction appears, warn and require a deliberate final issue quantity. Preserve the calculation for traceability. This need not make every ingredient routinely editable.

Do not infer indivisibility from labels such as `piece` or `pack` alone. Some goods can be divided, and alternate packs can convert into divisible base quantities. Whole-quantity rules should follow how the kitchen actually stores and issues the Item.

## Warning proposal

Place a warning icon beside the affected quantity and provide visible explanatory text in the ingredient sidebar: **“Calculated: 12.5 eggs. Eggs are issued as whole pieces.”** A tooltip may supplement this text but should not be the only explanation. Indicate the chosen resolution, for example **“To issue: 13 eggs — rounded up.”**

Detect and resolve the fraction in the final inventory base quantity. Decide whether rounding occurs per recipe ingredient or after totals for the same Item are combined: two recipes needing 12.5 eggs each could total 25, whereas rounding each first would issue 26. The posting calculation and displayed quantities must use the same policy.

## Decision still needed

The user has rejected general manual ingredient overrides. A secondary **Adjust issued quantity** action for exceptional lines is a proposal only, not an approved feature. Alternatively, configured rounding avoids routine editing, but requires explicit approval before changing calculated amounts. Warning-only posting is appropriate only when the fractional quantity can genuinely be physically issued in that Item's base unit.
