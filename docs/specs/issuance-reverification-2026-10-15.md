# Issuance reverification — 2026-10-15

Scope: the #221 implementation and subsequent picker, numeric-input, navigation, FIFO and compact posted-page changes in PR #234. Verification uses isolated test databases; the manual preview's saved and posted sample records are preserved.

This report records that earlier implementation state. See the [2026-10-16 system reverification](../system-reverification-2026-10-16.md) for the later full-application pass and corrections to the outstanding checks noted below.

## Contract alignment

| Concern | Current contract and evidence |
| --- | --- |
| Planning and pax | Activity Planned pax initializes Meal pax; saved targets are independent. Meal and Recipe pax are positive whole counts. Legacy planning counts survive edits. |
| Recipe and Stock additions | Search, preview, explicit Add, then Done; compact added supplies remain visible. Recipe cards are selectable. Adding and saving drafts do not deduct stock. |
| Quantity review | Exact Recipe and direct Stock contributions combine by Item in Base Units. Item policy validates the final total. Explicit adjustments retain the calculation and lock affected demand until reset. |
| Receiving | Receipt lines post exact calculated Base Unit stock-in. Active Item, Base Unit and selected Unit are required, including alternate-Unit receiving. PO references do not carry expected Item quantities. |
| Posting | Saved-revision validation, current policy/reference checks, availability, atomic stock-out and FIFO allocations. Retries do not deduct twice; failures roll back. |
| Receipt provenance | Oldest actual receipt date, then posting time and stable receipt/line identities. Exact allocations may cross receipts and POs. Display evidence is copied and immutable. |
| Sample history | Unallocated older stock-outs are reconstructed on subsequent posting per Item and visibly labelled. This does not establish their actual historical picking source. |
| Posted UI | Final quantities remain visible. Item Details contains calculation, policy and receipt sources. Recipes, direct Stock and complete record details remain available in collapsed sections. |

The glossary is recorded in [CONTEXT.md](../../CONTEXT.md). [ADR 0007](../adr/0007-recipe-baselines-and-meal-issuance-quantities.md) retains the quantity/posting boundaries; [ADR 0008](../adr/0008-fifo-receipt-allocation.md) records FIFO and reconstruction. ADRs 0004 and 0006 now distinguish current receiving behavior from the retired actual-received override. The approved specifications record the picker and posted-page interactions; the old prototype/gap notes are identified as historical references.

## Corrections found during reverification

- Receiving previously accepted an alternate Unit even when its Base Unit was inactive. Both the selector and server posting guard now exclude that case; regression tests cover Base and alternate selections with no partial writes.
- Item search could replace newer typed text with an older URL update or the initial synchronization. It now preserves local text through its own navigations and restores search on browser history changes.
- Posted dialogs and collapsed sections could receive a click before hydration. Their triggers remain disabled until the page is ready.
- Issuance browser fixtures left immutable references and changed a shared conversion, interfering with later catalog tests. Cleanup now removes only fixture-owned records from the isolated database and restores the shared conversion. The manual database is explicitly excluded.
- Calendar tests now use their intended fixed month. The receiving navigation test now accounts for the shared Recipe Item fixture instead of assuming an empty Item catalog.

## Verification results

| Check | Result |
| --- | --- |
| Full Vitest unit/integration suite | 419 tests in 60 files passed |
| Affected-workflow browser suite | 52 passed in one final run: Planning, issuance, Item policy/search, Purchase Orders/receiving and Recipes |
| Source lint and changed-test lint | Passed |
| Architecture boundary checks | 2 passed |
| Prisma schema validation and client generation | Passed |
| Production build and TypeScript check | Passed |
| Documentation relative links and whitespace checks | Passed |

Browser evidence includes desktop and 320px mobile quantity/detail layouts, FIFO receipt sources, Recipe and Stock selection, ingredient Sheets, keyboard focus, history, validation and cancellation. Tests exercise the application through its existing authenticated UI; no test-only posting endpoint is used.

Reproduce the 52-case run with:

```powershell
pnpm exec playwright test tests/e2e/activity-planning.spec.ts tests/e2e/issuance tests/e2e/items.spec.ts tests/e2e/items-search.spec.ts tests/e2e/purchase-orders.spec.ts tests/e2e/recipes.spec.ts tests/e2e/issue-80-activity-designs.spec.ts
```

The browser configuration creates its own isolated database. The final local log/artifact prefix is `issuance-reverification-confirmed-browser` under the operator's Codex directory. CI status is recorded on PR #234 for the pushed commit.

## Limits

Posting remains final: no corrections, reversals, returns or replacement posting. FIFO is receipt provenance, not expiry selection or inventory valuation; FEFO, lot tracking and costing remain outside scope.

The initial repository-wide browser run was not green: 59 of 82 passed. Besides the corrected failures above, older workspace navigation assertions, visual baselines and Master Data fixture assumptions failed. The affected-workflow rerun does not certify those remaining repository-wide checks or silently replace their baselines. CI does not run the browser suite, so green CI alone is not browser evidence.
