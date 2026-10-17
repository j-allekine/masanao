## Problem Statement

Planning repeats identity, context cards, explanatory copy and parent navigation before the staff member's actual work. Optional details can repeat information already on screen. Child collections are difficult to scan on narrow screens. Posted Item inspection gives the final result, calculations and receipt evidence similar emphasis, making the important quantity harder to find.

## Solution

Make every Planning page lead with clear identity, essential facts and its working collection or issuance task. Keep breadcrumbs, remove duplicate parent buttons, and reveal only useful additional information on demand. Reuse the system-wide header and shared controls while keeping each workflow's own behavior. Make posted quantity inspection result-first without weakening historical evidence.

## User Stories

1. As a kitchen staff member, I want a concise Planning catalog, so that search and records are easy to find.
2. As a staff member, I want the Design code in its breadcrumb and its title as the heading, so that identification is clear without duplication.
3. As a staff member, I want the fiscal year visible on an Activity Design, so that I can identify its planning period.
4. As a staff member, I want an optional AIP reference available on demand, so that supporting information does not dominate the collection.
5. As a staff member, I want Activity date, Office and Planned pax visible, so that I can understand the plan before adding meals.
6. As a staff member, I want recorded venue, budget and Activity particulars reachable through a labelled disclosure, so that I can inspect them when needed.
7. As a staff member, I want no empty details button, so that every offered control has a useful purpose.
8. As a staff member, I want collection counts beside their headings, so that I do not need a separate summary card.
9. As a staff member, I want one primary create/add action for an empty collection, so that repeated buttons do not distract me.
10. As a staff member, I want breadcrumbs to lead to known parents, so that I can navigate the Planning hierarchy predictably.
11. As a staff member returning to a catalog, I want my known search and page restored, so that I can continue where I left off.
12. As a staff member opening a record immediately after typing a search, I want that latest search retained, so that delayed navigation does not lose my place.
13. As a staff member opening a direct record link, I want a safe parent destination, so that navigation works without prior history.
14. As a mobile staff member, I want labelled child-row information and reachable actions, so that I can work without whole-page horizontal scrolling.
15. As a keyboard user, I want disclosures, menus and dialogs operable with predictable focus, so that I can complete the same tasks.
16. As a staff member preparing a meal, I want required inputs, quantities, warnings and posting actions visible, so that compact presentation does not hide consequences.
17. As a staff member leaving an unsaved issuance, I want existing discard protection retained, so that navigation does not silently lose work.
18. As a staff member reviewing a posted Item, I want its final issued quantity first, so that the outcome is immediately clear.
19. As a staff member checking an adjustment, I want the calculated quantity available for comparison, so that I can understand the difference.
20. As a staff member checking receipt sources, I want full identifiers, dates, Units and allocated quantities readable, so that I can trace the issued result.
21. As a staff member viewing reconstructed history, I want uncertainty stated, so that inferred sources are not mistaken for proof of original picking.
22. As a staff member reviewing a posted record after planning edits, I want saved evidence distinct from current planning, so that history remains trustworthy.
23. As a staff member completing a form, I want persistent labels and useful validation, so that less explanatory copy does not make entry ambiguous.
24. As a staff member using another module, I want its working layout preserved, so that this Planning cleanup does not unexpectedly redesign my task.

## Implementation Decisions

- Depend on the shared WorkspaceHeader foundation. The affected bodies are the Activity Designs catalog, cross-design Activities catalog, Activity Design record, Activity record, Meal Schedule draft/posted workspace and Planning create/edit dialogs.
- Keep existing shadcn primitives, semantic tokens and reusable workspace toolbar/table/pagination/action controls. No global styling or token rewrite.
- Share labelled facts and optional disclosure presentation only; features choose fields, copy, permissions, data, URLs, validation, callbacks and navigation guards.
- Remove routine subtitles, uppercase record-type labels, repeated identity and context cards. Preserve identity through breadcrumbs and one main task/record heading.
- Activity Design shows title and fiscal year, its code in the breadcrumb, and Activities count with the collection. AIP reference is optional additional information.
- Activity shows name, scheduled date, Office and Planned pax. Recorded venue, planned budget and Activity particulars form optional additional information. Missing Planned pax remains explicitly absent, never zero.
- Meal Schedule retains the canonical combined draft/posted workspace and old issuance-link redirect. Required Meal pax, supply work, status, warnings and actions remain visible.
- Replace duplicate small details Sheets with initially collapsed inline disclosure containing only meaningful additional fields. Omit it when empty; retain dialogs/Sheets for substantial inspection or editing.
- Meal additional information may include live Office/Venue and distinct current-planning identity when it differs from saved posting evidence. Never rewrite saved identity or quantities.
- A help icon explains a concept; it does not hide record metadata, required input or the only explanation of a blocking error. Disclosures support click/tap and keyboard with announced expanded state.
- Use breadcrumbs instead of an additional button to the same parent. Preserve known catalog search/page through validated local destinations; use safe deterministic fallbacks for direct entry. Browser Back and Cancel retain their distinct meanings.
- Derive return links from the catalog's current local state, including while a URL update is pending. Do not accept arbitrary external return URLs.
- Keep collection columns/data/actions, adapt simple child rows with labelled mobile facts and allow necessary dense tables to scroll locally.
- Empty child collections retain the primary heading action without a duplicate create/add button inside the empty state.
- Posted Item inspection leads with exact Issued quantity and Unit, then calculated comparison and an Adjusted marker only when applicable. Receipt evidence retains receipt/date, copied PO reference and allocated Base Unit quantity.
- Keep visible restrained reconstruction markers and one clear uncertainty explanation. Saved quantity policy is available in Calculation details; preserve approximation and missing-source meanings.
- Preserve form fields, permissions, defaults, precision, validation, pending/error handling, save/cancel behavior and existing dirty-close/posting confirmation. Remove only redundant copy.
- No schema, API, inventory arithmetic, allocation, snapshot or posting contract changes. Record the accepted presentation refinement in design guidance and ADR history without rewriting past decisions as if they had always applied.

## Testing Decisions

- The user confirmed real browser journeys as the primary verification boundary. Test observable outcomes, field availability, navigation, focus and preserved workflow behavior rather than internal markup.
- Reuse existing Planning, Meal Schedule layout, issuance preparation/posting, FIFO, snapshot and shared-header journeys. Retain existing domain/inventory safety tests unchanged in meaning.
- Cover populated/empty/no-match catalogs; search and pagination; read-only/allowed actions; optional facts present/absent; empty/populated child collections; safe direct-entry and nested breadcrumb return.
- Delay catalog URL navigation and open/check the record link to prove the latest typed search is retained. Use existing pure return-state tests for known keys, invalid destinations and normalization.
- Cover new/incomplete/saved drafts, Recipe/Stock selection, quantity review, save/reopen, dirty navigation, final confirmation and immutable posted review.
- Verify final issued versus calculated quantities, saved policy, FIFO/reconstructed/missing sources and changed live master/planning names without rewriting history.
- Inspect fresh desktop and 320px layouts, wrapping, local table scrolling and action reachability. Exercise keyboard/touch disclosure and dialog behavior, Escape and focus return as appropriate to each control.
- Cover existing form invalid/pending/server-error/success/cancel states. Do not replace error-preventing instructions with silence.
- Run unit/integration tests, source/changed-test lint, architecture checks, TypeScript and production build. Review visual-baseline changes individually and preserve manual sample data.
- Staff task observation and a full accessibility assessment remain follow-up evidence, not claims inferred from passing automation.

## Out of Scope

- Broad body redesign of Items, Recipes, Purchase Orders, receiving, Master Data, Overview, login or prototypes.
- A mandatory identical body layout for catalogs, editors, records and transactions; blanket removal of Back controls or replacement of all dialogs/Sheets.
- New sidebar destinations, columns, dashboards, filters, sorts, bulk actions, exports or density settings.
- New receipt/PO navigation needing extra identifiers or reads.
- Changes to numeric bounds, Units/conversions, FIFO, reconstruction, ledger movements, snapshots, authorization or posting/save semantics.
- A new palette, typeface, global token set, frontend/backend split or generic CRUD framework.
- Merging either implementation PR as part of recreating these specifications.

## Further Notes

- This is specification 2 of 2. Universal header implementation belongs to specification 1. The reusable visual rules guide future modules, but this specification rolls out page-body changes only in Planning and its issuance inspection.
- Existing implementation: [PR #236](https://github.com/j-allekine/masanao/pull/236), dependent on [PR #235](https://github.com/j-allekine/masanao/pull/235). Both were open when rewritten on 2026-10-17. Do not duplicate completed implementation work.
- Prior evidence on the Planning tree: 90 tests passed in a full isolated browser run; a later two-test focused run passed the compact journey and reproduced-then-fixed delayed-navigation regression. This is not a claim of one full 91-test run.
- 433 unit/integration tests across 62 files, source/changed-test lint, two architecture checks, TypeScript and production build passed. Fresh desktop/mobile Design, Activity, draft and Item inspection captures were reviewed; only two intentional Planning catalog baselines changed.
- The Planning PR remains draft while based on the header branch. Repository CI targets main; retarget after the dependency merges and require fresh checks. Neither spec authorizes merging.
- The accepted 2026-10-16 ADR refinement supersedes the original default Meal details Sheet for small optional groups. Research and prior verification history remain supporting evidence, not proof of staff usability.

- Tracking specification: [#238](https://github.com/j-allekine/masanao/issues/238). Requires the shared-header scope in [#237](https://github.com/j-allekine/masanao/issues/237).
