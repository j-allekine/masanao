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

## Implementation sequence within the new PR

1. Establish the current main baseline and bring forward missing header restoration; inventory route/state consumers and preserve current work.
2. Extract WorkspaceHeader; adopt across Planning and its loading/error states without changing other modules.
3. Clean catalogs and record identity/navigation; replace context cards with useful, non-repeated inline details.
4. Clean Meal Schedule supporting details and posted Item inspection while preserving snapshot/transaction behavior.
5. Align Planning form copy/grouping/actions within their existing workflows.
6. Reconcile DESIGN.md stale navigation/domain examples against current routes and CONTEXT.md. Amend ADR 0009 and record-page guidance explicitly for the accepted Sheet-to-disclosure refinement; do not rewrite historical rationale as if it had always been the decision.
7. Verify affected routes/states and shared consumers; update evidence and prepare one reviewable PR with screenshots and relevant test results.

The user approved the two-layer delivery split. Preserve the explicit boundaries above; changes to inventory or workflow contracts require separate scope.

## Acceptance criteria

- [ ] All Planning pages use the shared header; one sidebar toggle and one main heading are present per page, including loading/error states.
- [ ] Working collections and task actions lead; routine subtitles, context cards and redundant record labels/values are removed.
- [ ] Activity Design has usable breadcrumbs before its Back button is removed; other records have no duplicate parent button.
- [ ] Returning to a known catalog restores search/filter/page; direct entry has a safe parent destination; dirty issuance navigation is still guarded.
- [ ] Unique supporting fields remain readable and reachable, without duplicating page identity or rendering empty disclosures.
- [ ] Activity date/Office/planned pax and Design fiscal year remain visible under the proposed placement rules.
- [ ] Posted Item inspection leads with final quantities; calculation comparison, source evidence, uncertainty and saved policy remain available.
- [ ] Current planning and historical snapshots are visibly distinguishable when different; history is never rewritten by the presentation.
- [ ] Catalogs/forms retain permissions, filtering, pagination, action availability, validation, precision, pending behavior and existing guards.
- [ ] At 320px and desktop widths, long text/breadcrumbs wrap, local comparison tables remain usable, and actions/focus are not obscured by header/footer chrome.
- [ ] Keyboard/touch can use disclosures, row menus, dialogs and sidebar; focus return, visible labels and state announcements remain correct.
- [ ] Source and browser evidence cover every changed route/state; other shared-surface consumers have no unintended regression.
- [ ] Research, final accepted design guidance, PR description and actual implementation agree; results identify exact commit and tested scope.

## Verification plan

| Area | Required scenarios |
| --- | --- |
| Planning catalogs | Populated/empty/no-match; long titles; search/page state; allowed/read-only actions; keyboard and mobile |
| Design record | Optional AIP present/absent; zero/many Activities; breadcrumb return; no redundant summary |
| Activity record | Optional fields present/absent; missing date/pax; zero/many meals; long particulars; correct creation context |
| Meal draft | New/incomplete/saved; Recipe/Stock selection; adjustment restrictions; save/reopen; unsaved breadcrumbs/history; reachable footer |
| Posted meal | Master/planning names changed; exact final result; original saved policy; FIFO/reconstructed/missing sources; focus after posting and closing inspection |
| Forms | Invalid/server-error/pending/success/cancel; existing discard guards; numeric rules and preserved input |
| Shell/states | Sidebar keyboard/touch; Planning loading/error/retry; other modules unchanged where shared code is touched |

Use relevant existing unit/integration checks and focused Playwright journeys; add meaningful regression coverage for the shared header and information visibility rather than tests that mirror markup. Inspect fresh screenshots for desktop and 320px mobile, 200% text/zoom and 320 CSS-pixel reflow equivalents, long identifiers and empty/populated states. Check contrast and target sizing using the research's accessibility guidance, including its exceptions; do not claim full conformance from screenshots or automation.

Run source/changed-test lint, architecture checks, TypeScript and production build for changed routes/boundaries. Run affected Planning/issuance regressions and shared-consumer journeys appropriate to the actual changed surfaces. Preserve existing posting/receiving unit safety tests; no database reset, ledger reconstruction or sample deletion is part of verification.

Before promoting the pattern to every module, review representative tasks with staff: locate an Activity, add a meal, prepare/post issuance, inspect a source and recover from a validation error. Record observed confusion and follow-up decisions; do not invent usability success metrics.

## Review checkpoints

The proposed default visibility table, inline-disclosure replacement, posted Item hierarchy and first-PR form scope are now explicit for review. If these are accepted, update the research's pending-decision notes and accepted ADR/design guidance during implementation. System-wide adoption after Planning remains a sequence of scoped PRs, not an unreviewed global replacement.

## Proposed PR review package

Title: `Standardize workspace headers and simplify Planning information hierarchy`.

Description: Planning repeats record metadata, explanatory context cards and independently styled headers before the working collections. Introduce shared header presentation, keep one record heading and deliberate parent navigation, disclose only useful additional information, and simplify posted Item inspection while retaining immutable quantity/source evidence.

Attach before/after captures for Design, Activity, draft meal and posted Item details at desktop/mobile widths. State the exact affected routes, any exceptions, test results and whether global surfaces were changed. Describe only implemented behavior; do not present this checklist or proposed results as completed verification. Keep the first PR focused on Planning while documenting the reusable standard for later module adoption.
