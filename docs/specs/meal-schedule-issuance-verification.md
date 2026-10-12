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
