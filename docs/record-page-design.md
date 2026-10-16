# Record-page design direction

Masanao uses one shared workspace header across authenticated modules, with task-specific page bodies. All Planning adopts the compact record direction described here; other module bodies remain separate rollout work. [ADR 0009](adr/0009-task-focused-record-pages.md) records the original Meal Schedule choice and its later Planning refinement. Global palette/type tokens are unchanged. The original capture notes below are historical; current evidence belongs to the linked implementation specs.

## Pattern

Retain the shared workspace header and one sidebar toggle above the record body. Its module title is orientation, not a second record heading.

1. Breadcrumbs provide the hierarchy and parent destinations.
2. One heading identifies the record, with a nearby lifecycle badge when applicable.
3. A plainly named inline disclosure reveals useful, non-repeated supporting information; omit it when empty. Larger inspection tasks may still use a Sheet or dialog.
4. The main body contains the user's working data and controls.
5. Draft actions distinguish secondary save from primary final posting. Finality, validation and errors remain visible.

Use the existing shadcn Breadcrumb, Sheet, Badge, Button and confirmation primitives. Keep keyboard focus return, Escape dismissal, explicit accessible names and unsaved-change protection. Breadcrumbs must wrap without horizontal page overflow; footer actions must stay reachable at mobile widths and while the working list scrolls.

## System comparison

| Surface inspected in source | Appropriate direction | Important exception |
| --- | --- | --- |
| Activity Design and Activity records | Breadcrumbs, record heading, primary child collection | Planning particulars needed to choose the right Activity may remain visible; moving every field into a Sheet requires a separate task review. |
| Meal Schedule | One workspace for draft and posted issuance; Meal details on demand | Live planning and saved posting evidence are separate. No new record state or stock rule is introduced. |
| Purchase Order detail and receiving | Work and receipt history should lead; optional reference notes may be secondary | Vendor and PO identity remain visible while recording a delivery. Multiple receipts remain separate accountable transactions, so the one-issuance merge rationale does not apply to them. |
| Recipe detail/editor | Recipe identity, baseline pax and ingredient task stay prominent | Baseline quantities are essential working data, not optional details. Editing can remain a dedicated form. |
| Items, Recipes, Purchase Orders and Master Data catalogs | Existing catalog toolbar, filters, table/list and pagination | Breadcrumb/details composition does not replace catalog navigation or lifecycle controls. |

The earlier source review found repeated module subtitles, large explanatory context cards and duplicate parent navigation across some record pages. These are candidates for later scoped improvements, not defects automatically fixed by this change. The new layout applies only to Meal Schedule.

## Basis and limits

Breadcrumbs express an actual hierarchy; omit a duplicate Back link for that same parent. This follows the [GOV.UK breadcrumbs guidance](https://design-system.service.gov.uk/components/breadcrumbs/). A [shadcn Sheet](https://ui.shadcn.com/docs/components/base/sheet) provides the existing accessible presentation for optional details. Applying those patterns to Masanao is a design judgment grounded in its one-issuance-per-meal contract.

Fresh isolated browser captures compare an Activity record, a PO record, a Recipe catalog and the merged Meal Schedule at desktop/mobile widths. The automated journey checks the details panel, focus return, legacy URL redirect, visible footer, no horizontal overflow and guarded breadcrumb navigation. Existing journeys cover saved drafts, posting, immutable snapshots, quantity review and FIFO sources. The manual user's posted records are preserved.

### Capture review

1. **Activity record** (`01-activity-record.png`): hierarchy and child Meal Schedules are clear, but the page repeats Office/date, adds a second Back destination, and devotes substantial space to optional particulars. Apply the record pattern in a later scoped change; keep details needed to identify the Activity readily available.
2. **Purchase Order record** (`02-purchase-order.png`): Vendor and Record delivery are visible. Optional reference/notes and repeated explanatory text could be quieter. Retain visible Vendor identity and separate receipt history; do not merge multiple receipts into one editing surface.
3. **Recipe catalog** (`03-recipe-catalog.png`): search, table, status and pagination serve the catalog task. Repeated Recipes headings/subtitles are a future density improvement, not a reason to replace its toolbar with a details panel.
4. **Meal details** (`04-meal-details-1280.png`, `04-meal-details-320.png`): labelled fields wrap inside the Sheet and optional Venue is available on demand. The journey verifies keyboard opening, Escape, focus return and no horizontal overflow. Screenshots alone cannot establish screen-reader compatibility.
5. **Merged Meal Schedule** (`05-meal-workspace-1280.png`, `05-meal-workspace-320.png`): the meal, status, pax and supply actions lead. The mobile footer remains visible while the supply list scrolls. Existing posted captures verify compact final quantities and accessible receipt evidence without draft controls.

Captures are generated by `tests/e2e/meal-schedule-layout.spec.ts`; accepted local artifacts use the `meal-merged-browser`, `meal-merged-confirmed` and `meal-merged-focused-final` output prefixes. Inspect the images alongside these notes before applying the pattern to another feature.

This is representative source and rendered-layout verification. It is not an exhaustive audit of every route, full accessibility certification, or a staff usability study. Broader app-browser failures recorded in the [earlier reverification report](specs/issuance-reverification-2026-10-15.md) are not resolved by this layout work. Before wider adoption, observe staff preparing a meal and checking a posted receipt, then apply the pattern page by page with fresh evidence.

The subsequent [system reverification](system-reverification-2026-10-16.md) records corrections to those broader checks and the sidebar accessible-name and Item/Purchase Order readiness defects. Visible navigation labels, accessible names and collapsed-sidebar tooltips must agree.

## Implementation verification — 2026-10-16

- Full unit/integration suite: 419 tests across 60 files passed.
- Lint, changed-test lint, two architecture checks, route type generation, TypeScript and production build passed.
- All 25 unique affected browser scenarios have passing evidence. The main run passed 23/25; a four-test focused rerun passed after correcting one test's old-URL replacement and rerunning a Stock journey interrupted by Chromium's `net::ERR_NETWORK_CHANGED`. The focused run also repeated the main Recipe journey and the complete layout comparison. Tests were not weakened or given blanket retries.
- Coverage includes direct Meal Schedule entry, old-link redirect, unsaved breadcrumb navigation, saved Back/Forward, keyboard focus, 320px layout, Recipe/Stock selection, exact quantity review, posting, immutable master-data snapshots and FIFO receipt detail.

Reproduce with `pnpm exec playwright test tests/e2e/activity-planning.spec.ts tests/e2e/issuance tests/e2e/meal-schedule-layout.spec.ts`. CI status is recorded against the pushed PR head; CI does not run the browser suite.

## Shared foundation and Planning adoption

The later approved split is system-wide WorkspaceHeader presentation first, then all Planning page bodies in a dependent PR. The [Planning spec](specs/planning-frontend-standard.md) and ADR 0009 refinement supersede the initial default Meal details Sheet arrangement. Remove repetitive context cards and disclose only additional values. Existing historical capture/verification notes above describe their original implementation state, not fresh evidence for the later refinement.
