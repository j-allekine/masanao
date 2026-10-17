# Masanao frontend standard: research and proposed direction

Research date: 2026-10-16. Status: research direction accepted; concrete implementation details remain reviewable in the [Planning implementation spec](../specs/planning-frontend-standard.md). No production changes or new domain decisions.

## Purpose and evidence

Make the whole system easier to scan, understand and operate. Start with all Planning pages as the first implementation slice; use the resulting patterns across other modules only after checking their tasks and states.

This report uses current primary guidance from W3C, GOV.UK and IBM Carbon, plus the supplied screenshots and existing repository contracts. It does not claim staff usability research, a complete route audit, accessibility conformance or a single universally best layout.

**Evidence levels:** WCAG success criteria are accessibility requirements when claiming that conformance level. WAI-ARIA APG supplies implementation guidance, not another conformance standard. GOV.UK and Carbon prescribe their own systems; applying their principles to Masanao is a design recommendation, not a requirement to copy their fonts, dimensions or frameworks. [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [APG](https://www.w3.org/WAI/ARIA/apg/).

Existing authority remains [CONTEXT.md](../../CONTEXT.md), [ADR 0009](../adr/0009-task-focused-record-pages.md) and [record-page design](../record-page-design.md). Any accepted change from the current Sheet-based details direction must be recorded explicitly later, not silently treated as already approved.

[DESIGN.md](../../DESIGN.md) already describes a calm, compact civic system. Start from that existing design language and the runtime tokens in `src/app/globals.css`; this proposal does not approve a new palette, typeface, sidebar terminology or global CSS rewrite. Reconcile aspirational guidance with actual consumers before changing shared surfaces.

## Masanao source inventory and affected surfaces

This is a source inventory plus the supplied screenshots, not a fresh rendered audit of every module. The intended standard applies across the system; adoption is staged and task-specific.

| Family | Representative source | Preserve while simplifying |
| --- | --- | --- |
| Workspace shell and failure/loading | `src/components/workspace/workspace-shell.tsx`, `workspace-route-loading.tsx`, `workspace-route-error.tsx` | Sidebar access, stable module identity, recovery and loading context |
| Planning lists and nested records | `src/features/activity-planning/components/` | Hierarchy, identifying date/Office/pax, child collections, permissions, return state and unsaved guards |
| Supply/reference catalogs | `src/features/supply-operations/components/`, `src/features/recipes/components/`, `src/features/master-data/components/` | Search/filter/page state, quantities/units, lifecycle and row actions |
| Reference editor | `src/features/recipes/components/recipe-create-editor.tsx` | Baseline pax, ingredient rows, validation and save/cancel |
| Purchase Order/receiving | `src/features/supply-operations/components/purchase-order-detail-content.tsx` and receiving components | Vendor/PO identity, receipt lines, exact conversion, review and final posting |
| Issuance work/history | `src/features/issuance/components/` | Recipe/Stock selection, exact final quantities, immutable history and FIFO evidence |
| Overview and login | `src/components/workspace/workspace-page.tsx`, `src/components/login-form.tsx` | Orientation/sign-in task; no forced catalog or authenticated-shell layout |

Source repetition candidates include module subtitle plus page subtitle, record-type eyebrow plus identity stack, explanatory context cards before the working collection, and optional notes promoted to full cards. The Activity record repeats date/Office and parent navigation. The Design record lacks breadcrumbs, so its Back action cannot simply disappear without a replacement parent destination.

Existing shared pieces include `catalog-controls.tsx`, `table-frame.tsx`, `catalog-pagination.tsx`, `row-action-menu.tsx`, `list-empty-state.tsx`, `lifecycle-badge.tsx`, `destructive-dialog.tsx` and `form-actions.tsx` under `src/components/workspace/`. There is no current `WorkspaceHeader`; extraction should consolidate the demonstrated duplication rather than replace these existing controls.

`DESIGN.md` contains aspirational Workbench navigation labels and older Schedule Entry/Food Supply wording. Actual navigation is defined by `src/lib/workspace-navigation.ts`; current domain terminology comes from CONTEXT.md. Reconcile stale documentation during adoption, without treating those old labels as approval for new routes, renamed concepts or a navigation redesign.

## Main finding

Clean interfaces prioritize the current task and remove repetition. They do not merely shrink everything or hide every field behind an icon. GOV.UK recommends disclosure for information only some users need, and explicitly advises against hiding information most users need. [Details guidance](https://design-system.service.gov.uk/components/details/).

Proposed Masanao rule: each fact has a clear primary home; repeat it only where the user needs identity, comparison or evidence in the current interaction. Record names in a breadcrumb and heading can serve different navigation and identification purposes; duplicating a whole identity panel adds little.

The supplied Meal details panel repeats Design, Activity, meal name and time already presented elsewhere. Remove those repeated rows when they add no new distinction. If nothing useful remains, remove the panel and trigger. Do not replace an unnecessary panel with an unnecessary question mark.

The supplied issued-Item dialog mixes result, calculation policy, receipt provenance and migration evidence at similar emphasis. Lead with the issued result, retain source evidence, and make supporting calculation information secondary. These are recommendations based on the screenshot, not proof of user performance.

## Information hierarchy and density

Use the same reading order across the system: navigation → identity and state → current task and main action → supporting information. Give each page one record/task heading and sensible section headings; use semantic heading levels rather than selecting a heading solely for its visual size. [GOV.UK headings](https://design-system.service.gov.uk/styles/headings/).

Reuse Masanao's current semantic tokens and type scale. Prototype a small set of roles: page title, section title, body, field label and supporting metadata. Reserve strong text for identity, final quantities and important states. Do not solve noise with very small or low-contrast text: normal text generally needs 4.5:1 contrast, with the specified large-text exception. [WCAG contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

Use consistent responsive spacing: tight within a labelled group, larger between groups, and fewer oversized containers. Exact token values need rendered comparison in Masanao; external systems' pixel scales are not a universal standard. [GOV.UK spacing](https://design-system.service.gov.uk/styles/spacing/).

Prefer section headings and separators to a card around every block. Keep cards when they identify a selectable entity or meaningfully separate a task. Remove routine subtitles that restate the heading; retain instructions that change the user's decision or explain a restriction.

Compact means fewer duplicated blocks and clearer grouping. Cramped means narrow columns, squeezed labels, tiny controls or insufficient separation. Use a comfortable default density; a future dense mode would need a demonstrated high-volume task, not a global shrink switch.

## Navigation, header and return behavior

Propose one reusable workspace header for module label, sidebar toggle and optional action slots. Record identity belongs below it. A shared shell and a record heading serve different purposes; removing repeated titles must not remove access to navigation.

Use breadcrumbs for the actual nested record hierarchy. They communicate location and allow a deliberate jump to a parent. Preserve full accessible names and avoid page overflow; a collapsed mobile path must still expose useful parent navigation. [GOV.UK breadcrumbs](https://design-system.service.gov.uk/components/breadcrumbs/).

Distinguish three destinations: parent link, previous page and form cancellation. A link to Activity Designs is a parent destination, even if styled with a left arrow. A Back control should restore the preceding page and its state; a Cancel action abandons an edit according to its unsaved-change rules. GOV.UK discourages combining breadcrumbs with a duplicate Back link. [Back-link guidance](https://design-system.service.gov.uk/components/back-link/).

Masanao recommendation: retain breadcrumbs on nested records; omit a second link to the same parent. Use explicit Return/Back wording when a separate transaction flow needs it, preserve list search/filter/page, and protect unsaved work. Never depend solely on unbounded browser history for direct-entry pages.

## Choosing how additional information appears

| Information/task | Proposed pattern | Avoid |
| --- | --- | --- |
| Duplicate information with no new meaning | Remove it | Another container or icon |
| Essential identity, quantity, required input or current warning | Visible in the working surface | Hiding it for visual neatness |
| One optional group of record fields | Inline disclosure with a specific label | Large empty Sheet; vague `?` |
| Several substantial independent optional sections | Accordion, if comparison remains practical | Nested accordions by default |
| Brief nonessential explanation of a term | Tooltip on hover and keyboard focus | Links, form fields or critical instructions inside it |
| Small contextual interactive content | Click/tap popover | Hover-only interaction |
| Longer secondary inspection/editing while retaining context | Sheet, if the task justifies it | Treating every details view as a Sheet |
| Focused confirmation or bounded blocking task | Dialog/AlertDialog | Requiring a modal just to read a trivial field |
| Large edit or sustained multi-step task | Dedicated page | Deeply nested dialogs |

The matrix is a Masanao recommendation. GOV.UK favors a single details disclosure over tabs/accordion for one lower-priority section. Carbon distinguishes brief noninteractive hover/focus tooltips from click-activated toggletips, and warns against putting critical information or required workflow input in toggletips. [GOV.UK Details](https://design-system.service.gov.uk/components/details/), [Carbon toggletip](https://www.carbondesignsystem.com/building-blocks/core/components/toggletip/guidelines).

A question-mark icon means help about a concept; it should not become a generic doorway to record data. Name the content, such as `Activity particulars` or `Calculation details`, when that is clearer than `Additional details`. A disclosure must work by keyboard and touch. Hover/focus content must meet dismissible, hoverable and persistent conditions where the criterion applies. [WCAG hover/focus content](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html).

Modal Sheets/dialogs need a name, initial focus, contained tab sequence, Escape behavior and sensible focus return. For structured receipt tables, do not announce the entire table as one long dialog description. Use the established shadcn primitives and test actual behavior. [WAI-ARIA modal guidance](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

## Details that can be read quickly

Use aligned labelled values for record metadata; a summary-list structure is more meaningful than a table built purely for layout. Stack on small screens and use a short value column only when values remain readable. [GOV.UK summary list](https://design-system.service.gov.uk/components/summary-list/).

For issued-Item details, propose this order:

1. Item name and **Issued: 19 pc**, with `Adjusted` only when true.
2. Calculated quantity `18.5 pc`, visually secondary but available for comparison.
3. Receipt sources: receipt identity/date, Purchase Order identity and allocated quantity with units.
4. Calculation details: quantity policy and other supporting explanation.
5. A visible reconstruction marker on affected historical source evidence, with an accessible explanation.

Do not put actual quantity, adjustment status or uncertain provenance behind help. `Reconstructed using FIFO` is an evidence distinction, not an error; use a restrained semantic style rather than implying a stock failure. Avoid an unexplained acronym as the only source explanation.

Current planning identity and immutable posting identity may legitimately differ. When they do, label the time context explicitly; never overwrite or silently hide historical evidence to eliminate apparent duplication. This follows Masanao's existing snapshot contract, not a new inventory decision.

## Catalogs, collections and selection

Use the same catalog anatomy: title/count, task action, search/filter toolbar, results, then pagination. Keep toolbar controls close to the data they affect. Carbon supports these elements and advises giving tables enough room rather than nesting them in cramped containers. [Carbon data-table guidance](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines).

Show columns needed to identify, compare and act. Align quantities consistently and retain units; use clear column headers and actual table semantics. Optional particulars can move to record inspection, but business-critical status cannot be removed solely to fit. [GOV.UK tables](https://design-system.service.gov.uk/components/table/).

Choose mobile presentation by task: simple records may become labelled stacked rows; comparison-heavy receipt/allocation tables may retain a locally scrollable region. Do not squeeze text or allow the whole page to overflow. The reflow criterion allows exceptions for content requiring two-dimensional layout; it does not exempt surrounding headings, navigation or controls. [WCAG reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

Retain explicit pagination for large collections, current location and a visible result count. Avoid infinite scrolling for accountable lists where returning to a known page matters. Page-size defaults and whether small child collections need pagination remain product decisions. [Carbon pagination](https://www.carbondesignsystem.com/building-blocks/core/components/pagination/guidelines).

Propose one searchable selection experience for Recipes and Stock, with chosen entries visible while adding more. A card can provide a larger selection target, but must have correct control semantics, state and keyboard operation. Similar composition must not conceal different requirements: Recipe target pax versus Stock quantity and Unit.

## Forms, help and validation

Use persistent, sentence-case field labels and short hints only where useful. Never substitute a placeholder or tooltip for a label or required constraint. Match input width to expected content where practical. [GOV.UK text input](https://design-system.service.gov.uk/components/text-input/).

Keep pax as positive whole numbers under the existing contract; quantity precision remains Item-specific and Units stay explicit. Numeric keyboard hints do not replace validation. Do not introduce blanket integer-only quantity inputs while standardizing visual controls.

Preserve entered values on failure, identify the affected fields and explain how to recover. For longer forms use linked error summaries plus local messages; for short dialogs ensure errors are visible and focus reaches a useful recovery point. GOV.UK's always-show-summary rule is its own system policy; Masanao should choose its short-dialog variant deliberately. [Validation](https://design-system.service.gov.uk/patterns/validation/), [Error summaries](https://design-system.service.gov.uk/components/error-summary/).

Use error styling for errors, not all helper text. Show restrictions when they matter, such as an immutable posted record or locked Vendor after receiving. Do not replace every disabled action with a tooltip that keyboard users cannot reach.

## Actions, feedback and lifecycle states

Propose one visually dominant next action per task area. Distinguish Save draft from final Post issuance; label actions with verbs and objects. Avoid multiple equally prominent buttons competing for attention. Destructive actions need proportional emphasis and confirmation when consequences justify interruption. [GOV.UK buttons](https://design-system.service.gov.uk/components/button/).

Confirmations must identify the affected record and consequence; preserve final-post stock deduction and irreversibility warnings. For actions that are hard to reverse, sensible initial focus may be the safer action. Do not add confirmation to every reversible selection/removal. [APG modal guidance](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

Empty states should distinguish `no records yet`, `no matching results`, `cannot view` and `failed to load`, with an appropriate next action. Loading should preserve context and avoid controls appearing actionable before their handlers are ready; prevent duplicate submission and keep pending feedback adjacent to the action. These are proposed product rules, not a claim that skeletons are always preferable.

Use local feedback for local updates; reserve a page banner for information relevant to the page. Keep saved/posted status in the resulting record. Announce qualifying status messages without unnecessary focus movement, and avoid simultaneous duplicate toast/banner announcements. [GOV.UK banners](https://design-system.service.gov.uk/components/notification-banner/), [WCAG status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).

## Reusable presentation without shared business rules

Create a small family of templates rather than one universal page: catalog, nested record with child collection, editable workspace, immutable transaction, and form. A unified visual language need not merge their transactions or lifecycle.

Potential shared pieces: workspace header, page identity/actions, labelled-value group, disclosure presentation, catalog frame and state feedback. Inspect and extend existing workspace components first. Shared pieces own appearance and interaction chrome; features retain data, permissions, terminology, validation, URLs, mutations, unsaved state and history.

Use installed official shadcn primitives for interaction; do not replace them with custom native control behavior. Avoid a mega-component with feature names, permission branches and dozens of flags. Add a shared variant only after actual consumers prove the same pattern.

## Candidate compositions for review

These are hierarchy sketches, not pixel specifications or approved final visibility rules. Labels/data are illustrative. The standard header is reused; each task keeps its appropriate body.

```text
NESTED PLANNING RECORD
[Sidebar toggle] Planning
Activity Designs > AD-ISSUANCE
Kitchen training                                  [record actions]
FY 2026
[Additional details v]  only if useful unique fields remain
Activities (1)                                  [+ Create Activity]
[working table/list]
```

```text
POSTED ITEM INSPECTION
Posting Eggs
Issued: 19 pc                                      Adjusted
Calculated: 18.5 pc
Receipt sources
POST-DR / Oct 13, 2026       POST-PO                 19 pc
Historical source reconstructed [explanation]
[Calculation details v]
```

Do not repeat the issued quantity again in a separate summary card within the same dialog. Keep units on each quantity; those repeated units prevent ambiguity and are not redundant noise. Receipt-source repetition in a confirmation or another task can be necessary evidence, rather than a blanket ban on repeating any value.

## Responsiveness and predictable interaction

A cleaner layout must also respond reliably: search must preserve typed text, list navigation must preserve state, field errors must retain input, and controls must not accept clicks before handlers are ready. Preserve existing hydration regressions and transaction idempotency. Measure interaction response and layout movement before setting a performance budget; fewer visible boxes alone does not demonstrate faster operation. [web.dev INP guidance](https://web.dev/articles/inp).

## Proposed rollout and unresolved decisions

1. **Research/spec:** inventory route/state families; agree visibility rules and two representative layouts. Record proposed changes from ADR 0009 before implementation.
2. **Separate Planning PR:** introduce shared header, remove duplicated context/copy, simplify record hierarchy and return navigation; keep domain behavior and permissions intact. Cover all Planning lists/records/forms without forcing every form into a new container.
3. **Transaction pattern adoption:** improve issued-Item hierarchy/provenance within the Planning slice if confirmed; use dedicated posting/history checks. Extend the proven transaction presentation to receiving in a separately reviewed slice. Reuse selection presentation only where Recipe pax and Stock quantity/Unit requirements remain explicit.
4. **Remaining module PRs:** apply proven variants to Items, Recipes, Purchase Orders, receiving and Master Data after task-specific review. Inventory all consumers before any shared token/shell change.

Open decisions: which Activity fields staff need before choosing a meal; whether a remaining optional group warrants inline disclosure; exact proposed spacing/type roles; mobile table behavior per collection; and whether forms require separate scope from record cleanup. Recommendations here do not silently approve these choices.

## Acceptance and verification

- A user can identify the record, lifecycle and main next action without opening supporting information; no essential input or warning is hidden.
- Each visible repetition has a task-specific reason; no empty details panel/trigger, routine explanatory card or duplicate parent control remains.
- Fresh desktop/mobile evidence covers every changed route and relevant empty, populated, long-text, pending, invalid, permission-restricted, draft and posted state.
- Check 320 CSS-pixel reflow and zoom, local table scrolling, action reachability, long breadcrumbs and focus not being hidden by sticky chrome. [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [Focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html).
- Check keyboard-only selection/navigation, disclosure state, dialog opening/closing/focus return and screen-reader labels/status announcements. Visible labels must be included in accessible names. [Label in name](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html).
- Check touch operation and reduced-motion preferences; avoid decorative motion in work surfaces and retain immediate state feedback when animation is disabled. Disabling nonessential interaction-triggered motion is a recommended product goal; WCAG's Animation from Interactions criterion is AAA, not an AA requirement. [Animation guidance](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).
- Interactive targets meet 24×24 CSS pixels or the applicable spacing/other exceptions; prefer larger comfortable touch areas. Compact does not justify reducing target usability. [Target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
- Verify contrast, label associations, semantic tables/headings, history/list-state restoration, unsaved guards, hydration/pending controls and existing domain regression journeys.
- Confirm unchanged exact quantities, snapshot evidence, FIFO allocation, posting atomicity, Vendor locks and authorization; no data reconstruction or deletion is part of a visual rollout.
- Observe realistic staff tasks before system-wide promotion: locate an Activity, add meals, prepare Recipe/Stock issuance, post after review, inspect receipt sources, record a PO delivery and recover from invalid input. Record confusion and errors rather than inventing outcome metrics.

Passing automated checks and screenshot review supports these tested behaviors; it does not establish complete accessibility conformance or prove the design is best for every staff member.

## Decision status after the interview so far

- Confirmed: clean and easily digestible frontend; whole Planning scope for the proposed separate PR; remove routine explanations; lead with working collections/actions; research principles intended for all modules.
- Recommended, awaiting final agreement: one shared workspace header, breadcrumbs without duplicate parent Back actions, optional unique metadata disclosed inline, no empty details controls, and issued-Item result-first inspection.
- Still to settle: exact always-visible Activity metadata, mobile collection behavior, form cleanup extent, and whether all screenshot-specific changes belong in the first PR. No application changes, accepted ADR amendments or new PR have been made by this research pass.

## Implementation follow-through

The later user-approved split is [PR #235](https://github.com/j-allekine/masanao/pull/235) for universal header presentation and [PR #236](https://github.com/j-allekine/masanao/pull/236) for all Planning cleanup, based on that foundation. The concrete defaults and current verification supersede the initial unresolved interview notes above; see [Planning spec](../specs/planning-frontend-standard.md) and [header spec](../specs/workspace-header-standard.md). This does not imply a completed usability study or adoption of every page-body pattern across every module.
