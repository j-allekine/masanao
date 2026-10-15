# Recipe scaling production decisions

Status: approved and published as GitHub specifications #219, #220, and #221, with implementation tickets #222 through #229. Production issuance is implemented in PR #234. Later approved FIFO and UI refinements are recorded below and in the current specifications; the original code gaps are retained as historical context.

## Approved prototype direction

- Issuance belongs to a Meal Schedule and can include multiple Recipes.
- Use variant A's compact table, fixed top controls, searchable Add recipe picker, and ingredient side panel.
- Recipe-specific servings adjustments are secondary row actions.
- The Add recipe picker prefills pax from the meal default. A changed value applies only to newly added Recipes, not existing rows.
- Ingredient quantities scale without changing the master Recipe.
- Recipe setup uses "Ingredients for ___ pax" to identify the reusable batch baseline. Accept any positive whole-number baseline, including 1. Existing Recipes require an explicitly entered baseline before automatic scaling; never infer it from ingredient quantities.
- The ingredient side panel shows baseline quantities alongside calculated issuance quantities.
- Production issuance includes stock deduction, not only saved preparation.
- Selecting a Recipe copies its ingredient lines. Later master Recipe edits do not change existing issuance snapshots.
- Prototype A is visual inspiration, not a literal production specification; retain the existing design system and real domain contracts.

## Quantity review decisions

- Keep the simple Baseline / To issue sidebar. Normal quantities are automatic; offer a secondary Adjust issued quantity action before posting to resolve practical quantity differences.
- Show a warning icon and visible explanation for fractional counted Base Unit quantities. A fractional alternate packaging quantity is not automatically a problem if its Base Unit quantity is whole.
- Preserve the original calculated quantity alongside the confirmed issued quantity in stored records/details. Availability checks and stock deduction use the confirmed issued quantity.
- Check combined Base Unit totals for matching Items within the meal before posting. Fractional per-recipe quantities do not require unnecessary rounding when their combined total is whole.
- Block posting when a whole-count Item's final combined issued quantity remains fractional.
- Item creation/editing includes "Issuance quantities: Allow decimals / Whole numbers only" beneath Base Unit. The rule applies to issuance Base Unit totals, not global Unit labels; it validates quantities rather than automatically rounding them. Include this small Item change as an issuance prerequisite.
- Lock pax changes that affect manually adjusted issued quantities. Staff must explicitly reset affected adjustments before changing pax and recalculating. Unaffected recipe additions remain possible.
- Preserve original Recipe and manually entered quantities at their existing exact precision. Compute matching Item totals before rounding; round automatic decimal-allowed final Base Unit totals to six decimal places, nearest value. Show and deduct the same final quantity, trimming trailing zeros without forcing two decimal places. Validate whole-only totals before this decimal rounding. A positive amount rounding to zero requires an explicit issued-quantity adjustment, not silently dropping the Item.

## Delivery split and posting decisions

1. Recipe update: batch baseline setup, validation, display, and explicit baseline entry for existing Recipes before scaling.
2. Items update: issuance quantity policy setup and public reference data.
3. Issuance: depends on Recipe and Items; snapshots, pax overrides, draft preparation, ingredient calculations, associated Planning changes, availability checks, and stock-out posting. Prototype A guides the UI.

- Activity's planning count is labelled "Planned pax"; issuance uses "Meal pax". Remove Meal Schedule Planned servings from the planning workflow. Prefill issuance Meal pax from positive Activity Planned pax; if missing or zero, require explicit Meal pax for recipe calculation and posting. Incomplete drafts can still be saved. Do not fall back to the retired Meal Schedule field.
- The specification must include a safe treatment of existing plannedServings values: inventory current data, preserve it during transition, and make any destructive column/data removal explicit rather than silently discarding it. This is migration work, not a second active planning count.
- Adding recipes, adjusting quantities, and saving drafts do not deduct stock. Only an explicit Post issuance action does so.
- Posting checks available stock and blocks the entire issuance if any Item is insufficient. The availability check and stock deduction must occur together to prevent concurrent overspending and duplicate posting.
- Posted issuance is immutable: no editing or deletion.
- Use an explicit Save draft action so staff can resume unfinished issuance without deducting stock.
- Copy the planning pax default when creating issuance. Later planning changes do not silently change saved draft pax or quantities.
- Kitchen staff and administrators can prepare, save, and post issuance. Existing Recipe and Item setup management permissions stay unchanged.
- Include direct-use stock Items without requiring a Recipe or introducing a new Item type. Staff enter their quantity and selected Item Unit explicitly; do not assume one Item per pax.
- Use direct Add Recipes and Add Stock item actions. Both pickers keep pending selections and compact added supplies visible during search, with explicit Add and Done actions. Recipe cards support whole-card selection; Meal pax can be completed inside the picker. Stock uses a single searchable Item combobox, quantity and Unit. Save and post both supply paths together as one issuance.
- Adjust issued quantity applies to the meal's combined Base Unit Item total, including recipe and direct-use demand. Preserve per-recipe calculated quantities without inventing allocation of the adjustment to individual foods.
- Changing pax or adding/removing/changing lines that affect an adjusted Item total requires explicitly resetting that Item's adjustment first. Unrelated additions remain possible.
- Corrections, reversals, returns, and replacement posting workflows are explicitly outside this scope. Posting mistakes have no in-app correction workflow in this release; do not implement a hidden workaround.

## Specification checkpoints

1. Recipe update spec: baseline setup/display, validation, existing-recipe eligibility, and tests. No stock movements.
2. Items spec: quantity-rule setup, validation, public reads, backward-compatible migration, and tests.
3. Issuance spec: planning label/field transition, persisted snapshots/drafts, searchable supply pickers, calculated and confirmed combined totals, quantity-review locks, permissions, atomic stock checks/posting, immutable history, and tests.
4. Implementation details must explicitly address exact arithmetic and tie rounding, existing-data migration, duplicate posting/concurrent drafts, snapshot Unit/conversion information, and UI evidence. These are not permission to add new product scope.

## Approved extensions

- FIFO source allocations link confirmed stock-out to receipt lines and POs in the same posting transaction. Existing sample history may be reconstructed with an explicit assumption label; original ledger and posting evidence stay unchanged. Expiry, FEFO, lot tracking and costing remain outside scope. See ADR 0008.
- Posted detail defaults to compact Item quantities. Item Details retains calculation, policy and receipt evidence; Recipe and direct Stock contributions and full record metadata use accessible collapsed sections. Empty sections and repeated status explanations are omitted.

## Original code gaps (resolved by implementation)

- Recipe has no standard yield or servings baseline.
- Meal Schedule already has optional planned servings; Activity has optional planned participant count.
- The displayed issuance workspace is a throwaway prototype, not a production stock-out workflow.

Accepted domain terms are recorded in [CONTEXT.md](../CONTEXT.md); durable boundaries are recorded in ADRs 0007 and 0008. See the [reverification report](specs/issuance-reverification-2026-10-15.md) for current evidence and limits.
