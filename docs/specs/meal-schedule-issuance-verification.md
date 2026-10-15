# Meal Schedule issuance verification

Implementation of #221 follows the dependent tickets #225 → #226 → #227 → #228 → #229. Recipe baseline (#219) and Item quantity policy (#220) are merged prerequisites.

## Required evidence

- Planning edits retain legacy servings while presenting one Planned pax count.
- Saved drafts retain independent snapshots and reject stale saves and changed selection previews.
- Recipe and direct-stock contributions combine exactly by Item before policy validation and rounding.
- Confirmed quantities lock affected demand until explicitly reset.
- Availability subtracts posted stock-out from stock-in.
- Posting uses the saved revision, rechecks live references and policy, and commits all movements and history atomically.
- Independent database connections prove concurrent posting cannot overspend or deduct twice. Injected failures prove rollback.
- Posted reads retain posting evidence after master-data changes.
- FIFO allocations match exact stock-out, split across receipt lines and POs, and preserve source snapshots. Sample-history reconstruction is labelled and never rewrites original ledger or posting evidence.
- Posted detail keeps quantities visible while calculation, policy, receipt sources, Recipe ingredients and full metadata remain accessible through named dialogs and collapsed sections.
- Desktop, keyboard, and mobile journeys cover visible errors, warnings, pickers, sheets, review, confirmation, and read-only history.

Run relevant tests, architecture lint, type checking, Prisma validation/generation, and a production build. Record results in the implementation PR after completing the workflow.

## Implemented verification seams

| Behavior | Evidence |
| --- | --- |
| Legacy Planning count preservation | `tests/meal-schedules.test.ts`, `tests/e2e/activity-planning.spec.ts` |
| Canonical snapshots, stale saves, independent first-save connections, reference protection | `tests/issuance-drafts.test.ts` |
| Exact scaling, combined demand, rounding, precision, confirmation equality, reset locks | `tests/issuance-rational.test.ts`, `tests/issuance-quantities.test.ts`, `tests/issuance-drafts.test.ts` |
| Atomic posting, exact confirmed deduction, injected rollback, policy/reference failures, immutable public history | `tests/issuance-posting.test.ts` |
| Independent processes sharing one SQLite database: competing records, duplicate retry, busy writer | `tests/issuance-posting-concurrency.test.ts` |
| Additive snapshots and preserved receipt ledger rows/source uniqueness | `tests/issuance-draft-migration.test.ts`, `tests/issuance-posting-migration.test.ts` |
| Existing receiving behavior | `tests/delivery-receipts.test.ts`, `tests/delivery-receipt-migration.test.ts` |
| FIFO ordering, tie-breaks, exact splits, source evidence, reconstruction, rollback and retries | `tests/issuance-fifo.test.ts`, `tests/issuance-posting.test.ts`, `tests/issuance-posting-concurrency.test.ts`, `tests/issuance-posting-migration.test.ts` |
| Cross-PO FIFO Item Details, collapsed posted sections, keyboard focus, and compact two-Item desktop/mobile layouts | `tests/e2e/issuance-fifo.spec.ts`, `tests/e2e/issuance-posting.spec.ts` |
| Keyboard, 320px mobile, errors, exact quantity review, discard/Back, final confirmation, closed historical ingredient Sheet | `tests/e2e/issuance-drafts.spec.ts`, `tests/e2e/issuance-stock.spec.ts`, `tests/e2e/issuance-review.spec.ts`, `tests/e2e/issuance-posting.spec.ts` |
| Whole-card Recipe selection, digits-only pax, searchable Stock, persistent added lists, repeated additions, saving from review, cancellation and browser history | `tests/e2e/issuance-recipe-ux.spec.ts`, `tests/e2e/issuance-stock-ux.spec.ts`, `tests/e2e/issuance-review-regressions.spec.ts` |

Browser and database tests use isolated test data. Posting is final in this release; corrections, reversals, returns, and replacement postings remain outside the approved scope.

The [2026-10-15 reverification report](issuance-reverification-2026-10-15.md) records alignment checks, discovered corrections, fresh results and the limits of the broader repository browser run.
