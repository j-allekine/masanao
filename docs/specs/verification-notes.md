# Historical three-module specification verification

This file records the pre-implementation review on 2026-10-11. For current implemented behavior, including the approved direct Add actions, compact posted UI and FIFO receipt allocations, use [the issuance verification contract](meal-schedule-issuance-verification.md), [the FIFO specification](issuance-fifo.md), and ADR 0008. The historical statements below are not current implementation status.

Reviewed 2026-10-11 against the approved conversation decisions, current authored models and mutation workflows, domain glossary, and ADRs 0004 through 0007. Specifications #219 through #221 and tickets #222 through #229 are now published; no production issuance behavior was implemented.

## Alignment

- Recipe owns reusable baseline setup; Items owns the issuance quantity policy; Issuance consumes both and owns all stock-out behavior. Recipe and Items are independent prerequisites.
- The bounded Planning transition is included in Issuance: Planned pax label, retired Meal Schedule count, preserved legacy data, and one issuance default source.
- UI follows variant A's hierarchy, with a single Add dropdown, separate Recipe/Stock item sections, hidden ingredients in a Sheet, and no summary cards.
- Defaults, saved drafts, snapshots, combined quantity adjustment, whole-only validation, affected-operation locks, atomic posting, staff/admin access, and excluded corrections match the approved direction.

## Gaps corrected during verification

- Existing ledger sources require Delivery Receipt lines. Added explicit stock-out source evolution with preserved stock-in constraints and one unified ledger.
- Meal Schedule update currently writes missing planned servings as null. Required preserving retired legacy values through ordinary edits.
- Existing master Recipe edits replace ingredient rows. Required independent issuance snapshot rows and restrictive reference lifecycle handling.
- Distinguished exact manual/direct-stock-only totals from rounded automatic Recipe totals; specified repeating contribution display and exact final deduction display.
- Defined first-save source revision checks, stale draft conflict handling, empty drafts, posting retries, current Item-policy revalidation, and server enforcement of quantity-adjustment locks.
- Item update callers omitting the new policy must preserve the current value rather than reset it to the creation default.

## Implementation clarifications

The specs make bounded engineering choices explicit: positive persisted counts use signed 32-bit bounds, nearest automatic six-place rounding uses halfway-away-from-zero, legacy Item policies default to the existing permissive behavior, and draft revisions prevent lost updates. These complete the approved workflow without adding a correction or manufacturing subsystem.

## Second-pass verification

- Clarified that a fractional calculated whole-only total is resolved by a valid confirmed whole-number final quantity. Calculated 18.5 eggs, confirmed 19, means availability checks and deduction both use 19; the original calculation remains visible.
- Removed ambiguous missing-pax selection wording. New Recipe additions require valid Meal pax and picker pax; previously selected snapshots can survive clearing pax as a pending saved draft, subject to adjustment locks. Incomplete calculations cannot masquerade as complete meal totals or pass posting.
- Made historical reads explicitly use persisted posting evidence, unaffected by later master names, planning, Recipe changes, or Item-policy changes.
- Added focused acceptance scenarios for those cases. Rechecked all three complete drafts for ownership, dependencies, legacy migration, permissions, quantity precision, and correction exclusions; no additional contradiction was identified in this pass.

## Verification boundary

This is a documentation/code-contract review, not a claim that implementation, migrations, concurrency, or UI tests have passed. All seven required to-spec sections are present in each specification. Public-interface integration tests and browser journeys are approved. Prototype A is published at immutable commit f34099a6162e7f2511db30499c5d91fbf8ed81b0 and linked from spec #221 and ticket #226. The handoff branch is updated from main before publishing supporting documentation; new implementation worktrees must use a commit containing these documents or the branch that contains them.
