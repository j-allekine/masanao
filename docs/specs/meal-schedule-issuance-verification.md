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
| Keyboard, 320px mobile, errors, exact quantity review, discard/Back, final confirmation, closed historical ingredient Sheet | `tests/e2e/issuance-drafts.spec.ts`, `tests/e2e/issuance-stock.spec.ts`, `tests/e2e/issuance-review.spec.ts`, `tests/e2e/issuance-posting.spec.ts` |

Browser and database tests use isolated test data. Posting is final in this release; corrections, reversals, returns, and replacement postings remain outside the approved scope.
