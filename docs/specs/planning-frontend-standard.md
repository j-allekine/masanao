# Planning frontend standard and reusable workspace presentation

Status: accepted implementation direction, delivered after the [shared workspace header foundation](workspace-header-standard.md) in a separate dependent PR. The field placement below supplies concrete defaults for the approved cleanup.

## Problem and outcome

Planning repeats workspace subtitles, record-type labels, identity metadata, context cards and parent navigation before the user's working collection. Some details panels repeat the page instead of adding information. Posted Item inspection gives final results, supporting calculations and provenance similar emphasis. Independently authored headers drift in structure and spacing.

Staff should immediately understand where they are, which record they are using, its relevant state and the next action. Supporting information remains available without occupying the main working surface. The result establishes reusable presentation for the whole system, demonstrated first across all Planning; it does not force catalogs, editors and transactions into one rigid layout.

Research and sources: [frontend-standard research](../research/frontend-standard-research-2026-10-16.md). Existing foundations: [DESIGN.md](../../DESIGN.md), [CONTEXT.md](../../CONTEXT.md), [record-page direction](../record-page-design.md), [ADR 0009](../adr/0009-task-focused-record-pages.md). Domain terminology and inventory contracts remain authoritative.

## Delivery boundary

Use two reviewable PRs, separate from merged issuance PR #234: first the shared header foundation across all authenticated modules, then this Planning cleanup based on that foundation. Target the second PR at the foundation branch while it is unmerged; retarget to main after its dependency merges. Inspect branch, worktree and dirty state before preparing the implementation checkout. Include the later header-restoration change only if absent from the chosen base; do not duplicate or revert it. Preserve the existing manual preview database and posted samples.

The foundation PR introduces shared header presentation across the system with page bodies unchanged. This dependent PR adopts the broader page patterns throughout Planning. Later module PRs adopt proven variants after checking their own tasks. No backend split, generic CRUD framework, new inventory lifecycle or database migration is needed for this presentation scope.

### Included surfaces

| Surface | Required coverage |
| --- | --- |
| `/activity-designs` | Catalog heading, primary action, toolbar, results and pagination |
| `/activities` | Cross-design catalog, parent identification, toolbar/results and existing URL state |
| `/activity-designs/[id]` | Design identity, breadcrumbs, optional information and Activities collection |
| `/activity-designs/[id]/activities/[activityId]` | Activity identity, optional information and Meal Schedules collection |
| `.../meal-schedules/[mealScheduleId]` | New/incomplete/saved draft and posted issuance, optional planning information and Item inspection |
| `.../meal-schedules/[mealScheduleId]/issuance` | Preserve redirect to the canonical Meal Schedule |
| Planning create/edit dialogs | Consistent headings, field grouping, helpful copy, errors and action presentation; preserve existing workflows |
| Planning loading/error states | Matching header/orientation, sensible loading and recovery; retain other modules' existing behavior |

### Excluded changes

- Broad visual migration of Items, Recipes, Purchase Orders, receiving, Master Data, login or Overview in this PR.
- Sidebar regrouping/renaming, new routes, permissions, filters, sorts, bulk actions, exports or density settings.
- New Meal Schedule issuance-status columns or derived dashboards unless separately specified; do not invent new data reads as incidental decoration.
- Changes to pax bounds, exact quantity arithmetic, conversions, FIFO, reconstruction, snapshots, posting, immutable history or authorization.
- New links to receipts/POs requiring additional identifiers or routes; current copied source references remain readable.
- New global palette/typeface, global token values, wholesale CSS rewrite or new component library.
- Changes to save, cancel, deletion, dirty-close or posting semantics disguised as styling. Any discovered behavioral defect is reported and handled explicitly.

## System-wide presentation rules

1. Reuse the existing shadcn primitives and workspace controls. Share presentation and interaction chrome; features retain labels, data, permissions, filters/URL state, validation, actions and navigation guards.
2. Keep a stable workspace header and one main record/task heading. Section headings identify actual working groups.
3. Remove explanatory copy that merely restates a heading. Retain instructions that prevent errors, explain a restriction or change a decision.
4. Each fact has a primary home. Repetition is allowed where another task needs identity, comparison or historical evidence. Repeated units are necessary clarity, not noise.
5. Do not hide essential identity, required inputs, quantities, warnings, errors or consequences to make a page look smaller.
6. Use semantic type/color/spacing roles. Compact means clearer grouping and fewer redundant blocks, not smaller unreadable text or cramped controls.
7. Prefer simple sections and separators; use cards when they meaningfully identify a task/entity, not around every metadata group.
8. Essential actions remain visible. A menu is appropriate for secondary record management, not the principal action of the page.

## Shared component contract

### WorkspaceHeader

Create a feature-independent component under `src/components/workspace/` after inspecting current header consumers.

- Receives a visible workspace title, optional useful description and optional action content. Planning passes `Planning` and no routine subtitle.
- Composes the existing `SidebarTrigger` and `Separator`; one toggle per page.
- Uses the current 64px header baseline and semantic text roles. Allow content to wrap/grow at constrained widths; do not clip controls or force page overflow.
- Workspace title is navigation/orientation text, not a second `h1`. Record identity/status remain below it.
- Optional actions are feature-supplied nodes. The header has no domain names, authorization logic, fetches, mutations, route inference or feature-specific flags.
- Maintain visible accessible names and the existing sidebar behavior on desktop/mobile. A decorative separator is hidden from assistive technology.
- Adopt in the five Planning page families and Planning loading/error presentation. Inventory actual consumers before changing any shared loading/error API; other modules must retain their presentation.
- Do not make WorkspaceShell automatically inject a second header into untouched consumers.

### Other presentation reuse

Continue using `WorkspaceCatalogToolbar`, primary actions, table frame, pagination, row menus, empty/lifecycle/destructive/form controls. Extract record-heading, labelled-value or disclosure presentation only where at least two actual consumers share the same interface. Do not centralize whole forms/tables or hide feature-specific behavior behind configuration arrays.

## Record identity and information placement

These are the proposed implementation defaults for review. All fields remain available; absent optional data does not create empty containers.

| Record | Visible in primary surface | Optional, non-repeated supporting information |
| --- | --- | --- |
| Activity Design | Breadcrumb identifier, title, fiscal year; Activities heading/count and collection | AIP reference when recorded |
| Activity | Breadcrumb hierarchy, name, labelled date/Office/planned pax; Meal Schedules heading/count and collection | Venue, planned budget, particulars when recorded |
| Meal Schedule draft | Breadcrumb hierarchy, meal label/time, draft state, editable Meal pax and supply work/actions | Office/Venue only when not already displayed in the working surface |
| Meal Schedule posted | Saved meal label/time, Posted state, saved pax/actor/time and issued quantities | Non-repeated live Office/Venue; distinct current-planning identity if it differs from saved evidence |

- Remove the uppercase record-type eyebrow and repeated code/title lines when the breadcrumb/heading already provides identification.
- The Activity Design breadcrumb can be `Activity Designs > AD-ISSUANCE`; title is `Kitchen training`. Do not print AD-ISSUANCE again as a subtitle or context row.
- Count belongs beside the collection heading, not in a second context/summary card.
- Use visible labels for metadata where a date/number/Office alone would be ambiguous. Missing core values use a concise `Not recorded` or `Not set`; missing planned pax must not imply zero.
- Retain exact existing date/time, money and number formatting. This is a layout change, not data reinterpretation.
- Do not automatically fetch an entire parent record for a decorative metadata strip.

### Additional information behavior

- Remove duplicate rows before deciding whether any disclosure is needed.
- For one small optional group, use an initially collapsed inline disclosure. Default label `Additional details`; use a more specific label such as `Activity particulars` when content warrants it.
- Use an existing shadcn Collapsible/Accordion pattern as appropriate. If absent, install/review the official primitive before use.
- Do not render the control if no meaningful additional data remains. An open state contains actual values, not another title/subtitle/identity stack or empty card.
- Values use semantic labelled pairs (`dl`, `dt`, `dd`), aligned for scanning and stacked on narrow screens. Long particulars wrap; no forced truncation without a usable full-value path.
- Click/tap and Enter/Space operate the control; expanded state is announced and focus remains predictable. Do not turn a data disclosure into hover-only content.
- A `?` or information icon is reserved for a short explanation, with an accessible name and keyboard/touch access. A tooltip never contains required inputs, actionable links or the only explanation of a blocking error.
- Keep Sheet/Dialog only where a substantial inspection/editing task justifies it. Replacing every Sheet with an accordion is not a system rule.

### Historical and current information

Posted identity and quantities come from stored evidence. Breadcrumb/live parent names may have changed. When additional current identity is needed to explain a difference, label it `Current planning`; do not imply it was the identity at posting. Remove purely repetitive rows without deleting distinct historical evidence. Supporting live details must never recalculate or relabel posted quantities.

## Navigation and actions

- Add breadcrumbs to Activity Design records before removing the current parent button. Keep full hierarchy on Activity and Meal Schedule records.
- Remove a separate Back-to-parent action when the breadcrumb provides that same destination.
- A parent link is a fixed hierarchy destination; browser Back is history; Cancel closes/abandons an edit according to current workflow. Do not interchange their meanings.
- Preserve catalog search/filter/page on returning from a record when that originating state is known. Direct entry uses a deterministic parent fallback.
- Only support known local catalog state keys/destinations. Do not introduce arbitrary return URLs or allow external navigation through a return parameter.
- Breadcrumbs may wrap on mobile; do not remove all parent access for space. Maintain issuance unsaved-link/history guards.
- Catalog primary actions remain `Create Activity Design` or `Create Activity`; child collections use `Create Activity` and `Add Meal Schedule`, subject to existing permissions and terminology.
- Record edit/delete remain in an accessible secondary menu where existing capabilities permit them. Do not invent missing actions or alter deletion restrictions.
- Meal Save draft remains secondary and Post issuance primary, with final confirmation. Errors, shortage review and adjusted-demand restrictions remain visible.

## Catalogs and child collections

- Use title/count, meaningful primary action, adjacent search/filters, results and pagination. Do not repeat collection purpose beneath each heading.
- Retain existing catalog columns and identifying data unless this specification explicitly moves a duplicate value. Any proposed column removal needs review against the staff task.
- Activity child rows retain name, scheduled date, Office, Meal Schedule count and permitted actions. Meal Schedule rows retain label/time and current actions.
- Use semantic tables where comparison matters. On small screens, simple child records may use the established labelled mobile list/card pattern; keep the same identity, values and actions available.
- Dense comparison tables may scroll locally when necessary. Keep headings, navigation and primary actions within the viewport; avoid unnecessary whole-page horizontal scrolling or nested table containers.
- Do not globally apply the smallest row/control size. Match existing comfortable control sizing and allow multiline identity.
- Keep distinct empty, no-match, loading, forbidden and failed states; no-match provides an appropriate clear-filter action.
- Search preserves typed values, URL/history behavior and current filters. Controls are disabled until their interaction handlers are ready when required by existing readiness safeguards.

## Posted Item inspection

The existing Details action remains a focused dialog because source inspection is a separate structured task. Improve its contents rather than replace it with a question mark.

1. Title identifies the Item; lead with the exact `Issued` quantity and Unit.
2. Show `Adjusted` only for a confirmed difference. Keep the exact calculated contribution visible for comparison, with approximation marking only where the current contract requires it.
3. Group receipt sources immediately below: receipt number/date, copied PO number and allocated Base Unit quantity with Unit.
4. Keep a visible, restrained reconstruction marker on inferred historical sources. Provide concise accessible wording explaining that this is an inferred source, not proof of original picking.
5. Put the saved quantity policy and explanatory arithmetic under `Calculation details`. Do not use current Item policy to rewrite this evidence.
6. Do not repeat the same issued result in multiple cards within the dialog. The separate source allocations legitimately repeat quantities when they show how that result was fulfilled.
7. Preserve missing-source wording for older history, receipt ordering, full identifiers, existing focus return, keyboard dismissal and viewport scrolling.
8. On mobile stack labelled source rows when that preserves comprehension; if using a scrollable table, scope scrolling locally and retain all values/actions.

## Forms and interaction states

- Keep existing create/edit containers, fields, validations, defaults, ordering constraints and save/cancel semantics.
- Remove redundant dialog subtitles; keep a useful concise instruction when it affects correct entry. Labels remain persistent; placeholders and `?` never replace them.
- Reuse existing Field/FieldGroup and form-action presentation. Group related fields; avoid additional decorative cards.
- Pax remains positive whole-number input under existing bounds. Other quantities retain exact decimal and Item/Unit-specific rules; no blanket integer-only input change.
- Pending actions announce progress and prevent duplicate mutation. Errors stay associated with fields, retain input and guide recovery.
- A presentation cleanup must not silently add or remove dirty-close confirmation. Existing guards remain; any inconsistency found is documented as a separate behavioral decision.
- Touch users retain visible access to row menus; no hover-only management actions. Meaningful status text accompanies color.

## Candidate layouts

```text
[Sidebar toggle] Planning
Activity Designs > AD-ISSUANCE
Kitchen training                                    [record menu]
Fiscal year: 2026
[Additional details v]  only when AIP reference exists
Activities (1)                                  [+ Create Activity]
[collection]
```

```text
[Sidebar toggle] Planning
Activity Designs > AD-ISSUANCE > Staff training
Staff training                                      [record menu]
Date: Oct 13, 2026  |  Office: Kitchen  |  Planned pax: 75
[Additional details v]  Venue / budget / particulars if recorded
Meal Schedules (2)                              [+ Add Meal Schedule]
[collection]
```

These illustrate hierarchy and grouping, not fixed pixel coordinates. Use the current semantic type scale and compact spacing guidance (8/12px within control groups, 16px related content, 24px sections) as existing starting points. Do not alter runtime font sizes or global tokens just to match a sketch.

## Implemented delivery sequence

1. Establish main as the baseline and preserve the existing issuance preview and sample records.
2. Deliver shared WorkspaceHeader presentation and authenticated route adoption in PR #235, including matching loading/error states and sidebar keyboard regressions.
3. Deliver the Planning body cleanup in dependent PR #236: concise record identity, breadcrumbs, unique optional facts, mobile child collections and posted Item inspection.
4. Preserve domain workflows and document the accepted presentation refinement in ADR 0009, record-page guidance and DESIGN.md.
5. Verify each PR's affected routes and record the evidence below. Merge the foundation first; retarget Planning to main before its required CI review.

The user approved the two-layer delivery split. Preserve the explicit boundaries above; changes to inventory or workflow contracts require separate scope.

## Acceptance criteria

- [x] All Planning pages use the shared header; one sidebar toggle and one main heading are present per page, including loading/error states.
- [x] Working collections and task actions lead; routine subtitles, context cards and redundant record labels/values are removed.
- [x] Activity Design has usable breadcrumbs before its Back button is removed; other records have no duplicate parent button.
- [x] Returning to a known catalog restores search/filter/page; direct entry has a safe parent destination; dirty issuance navigation is still guarded.
- [x] Unique supporting fields remain readable and reachable, without duplicating page identity or rendering empty disclosures.
- [x] Activity date/Office/planned pax and Design fiscal year remain visible under the proposed placement rules.
- [x] Posted Item inspection leads with final quantities; calculation comparison, source evidence, uncertainty and saved policy remain available.
- [x] Current planning and historical snapshots are visibly distinguishable when different; history is never rewritten by the presentation.
- [x] Catalogs/forms retain permissions, filtering, pagination, action availability, validation, precision, pending behavior and existing guards.
- [x] At 320px and desktop widths, long text/breadcrumbs wrap, local comparison tables remain usable, and actions/focus are not obscured by header/footer chrome.
- [x] Keyboard/touch can use disclosures, row menus, dialogs and sidebar; focus return, visible labels and state announcements remain correct.
- [x] Source and browser evidence cover every changed route/state; other shared-surface consumers have no unintended regression.
- [x] Research, final accepted design guidance, PR description and actual implementation agree; results identify exact commit and tested scope.

## Verification plan

| Area | Required scenarios |
| --- | --- |
| Planning catalogs | Populated/empty/no-match; long titles; search/page state; allowed/read-only actions; keyboard and mobile |
| Design record | Optional AIP present/absent; zero/many Activities; breadcrumb return; no redundant summary |
| Activity record | Optional fields present/absent; missing planned pax (scheduled date remains required); zero/many meals; long particulars; correct creation context |
| Meal draft | New/incomplete/saved; Recipe/Stock selection; adjustment restrictions; save/reopen; unsaved breadcrumbs/history; reachable footer |
| Posted meal | Master/planning names changed; exact final result; original saved policy; FIFO/reconstructed/missing sources; focus after posting and closing inspection |
| Forms | Invalid/server-error/pending/success/cancel; existing discard guards; numeric rules and preserved input |
| Shell/states | Sidebar keyboard/touch; Planning loading/error/retry; other modules unchanged where shared code is touched |

Use relevant existing unit/integration checks and focused Playwright journeys; add meaningful regression coverage for the shared header and information visibility rather than tests that mirror markup. Inspect fresh screenshots for desktop and 320px mobile, 200% text/zoom and 320 CSS-pixel reflow equivalents, long identifiers and empty/populated states. Check contrast and target sizing using the research's accessibility guidance, including its exceptions; do not claim full conformance from screenshots or automation.

Run source/changed-test lint, architecture checks, TypeScript and production build for changed routes/boundaries. Run affected Planning/issuance regressions and shared-consumer journeys appropriate to the actual changed surfaces. Preserve existing posting/receiving unit safety tests; no database reset, ledger reconstruction or sample deletion is part of verification.

Before promoting the pattern to every module, review representative tasks with staff: locate an Activity, add a meal, prepare/post issuance, inspect a source and recover from a validation error. Record observed confusion and follow-up decisions; do not invent usability success metrics.

## Verification evidence — 2026-10-16

Implementation base: Planning commit `642894a` on shared-header commit `d90a9e5`, followed by the final cleanup/return-state regression commit on PR #236. The PR head is the authoritative final revision.

- Full isolated browser run: **90 passed**, covering Planning, issuance/posting/FIFO, permissions, Items, Recipes, Purchase Orders/receiving, Master Data and shared navigation. Log: `C:/Users/LENOVO/.codex/planning-cleanup-confirmed.log`.
- A subsequent delayed-navigation regression reproduced a newly introduced return-link defect. Links now use the catalog's current local search/page state instead of waiting for the URL update. Focused final run: **2 passed**, including the desktop/mobile compact Planning journey and the delayed-navigation regression. Log: `C:/Users/LENOVO/.codex/planning-return-final.log`. This was additional coverage after the 90-test run, not a single 91-test full run.
- Final unit/integration suite: **433 passed across 62 files**; source lint and two architecture checks passed. Log: `C:/Users/LENOVO/.codex/planning-final-quality.log`.
- Final production build and TypeScript check: **passed**; see `C:/Users/LENOVO/.codex/planning-final-build.log`.
- Reviewed fresh 1280px/320px Design and Activity captures, meal draft and posted Item inspection. Breadcrumbs wrap, optional facts remain reachable, child tables adapt, and empty collections have one primary create/add action. Only the two intentionally changed Planning catalog baselines were updated.
- Shared-header PR #235 is ready for review, with current `quality`, `native-windows`, `production-runtime` and Greptile checks green on `d90a9e5`.
- Planning PR #236 remains draft while based on the foundation branch. Repository CI triggers only for PRs targeting main; after #235 merges, retarget #236 and require fresh CI before merge. Neither PR has been merged by this task.

The checkbox completion records implementation and automated/visual evidence; it is not a claim of complete accessibility certification or staff usability testing. Staff task review and broader module body adoption remain follow-up work. No manual preview database reset, ledger reconstruction or sample deletion was performed.

## Review checkpoints

The accepted visibility table, inline disclosure, posted Item hierarchy and form scope are implemented and recorded in the ADR/design guidance. System-wide adoption after Planning remains a sequence of scoped PRs, not an unreviewed global replacement.

## PR review package

- [PR #235: shared workspace header](https://github.com/j-allekine/masanao/pull/235): universal header presentation, authenticated consumers and shell keyboard behavior.
- [PR #236: compact Planning](https://github.com/j-allekine/masanao/pull/236): Planning catalog/record hierarchy, optional inline details, responsive child collections, preserved return state and posted Item inspection.

Fresh captures and exact verification scope are listed above. Inventory arithmetic, immutable snapshots, FIFO, authorization and save/post semantics remain governed by the existing domain specifications.
