# Recipe and issuance implementation handoff

The approved tracker specifications are [Recipe #219](https://github.com/j-allekine/masanao/issues/219), [Items #220](https://github.com/j-allekine/masanao/issues/220), and [Issuance #221](https://github.com/j-allekine/masanao/issues/221). Their local copies are in this directory. Follow ADR 0007 and the domain glossary alongside each ticket.

## Starting checkout

Production implementation and the approved FIFO/UI extensions are in [PR #234](https://github.com/j-allekine/masanao/pull/234), on `codex/issue-221-meal-issuance`. Verify the current PR head and merge state before choosing a checkout; after merge, use current `origin/main`. The earlier prototype branch is a historical design reference, not the production implementation baseline.

## Ticket order

| Ticket | Delivers | Blocked by |
| --- | --- | --- |
| #222 | Recipe creation and baseline reference | None |
| #223 | Recipe baseline editing and legacy completion | #222 |
| #224 | Item issuance quantity policy | None |
| #225 | Planning pax cleanup | None |
| #226 | Recipe issuance drafts | #223, #225 |
| #227 | Direct Stock items | #226 |
| #228 | Combined review and availability | #224, #227 |
| #229 | Atomic posting and immutable history | #228 |

Each ticket includes its own public-interface tests and relevant browser coverage. The table records the original delivery order; check current tracker state before starting follow-up work. For new dependent work, complete prerequisites first rather than treating a ready-for-agent label as absence of blockers.

## Prototype A

Run `pnpm prototype:recipe-scaling` and open `/prototype/recipe-scaling?variant=A` on the development server. The implementation is `VariantA` in the recipe-scaling prototype component. Its immutable source reference is recorded in spec #221 and ticket #226.

The prototype supplies visual hierarchy and interaction inspiration, not production arithmetic, persistence, or authorization. Production work must use the approved specs, existing Masanao UI patterns, and shadcn primitives. Preserve fixed top controls, searchable selection, secondary exceptions, compact lists, hidden ingredients in a Sheet, and no summary cards.

## Scope and completion

Draft saving never deducts stock. Posting is all-or-nothing and immutable. [FIFO receipt allocation](issuance-fifo.md), recorded in [ADR 0008](../adr/0008-fifo-receipt-allocation.md), provides receipt and PO traceability without expiry tracking. Corrections, reversals, returns, replacement posting, and negative-stock overrides are excluded. Follow the current [verification contract](meal-schedule-issuance-verification.md), rather than the original pre-implementation gap notes.

Follow repository verification requirements per change: relevant tests, lint/type checks, schema migration validation/generation and build when applicable, plus fresh browser evidence for changed UI. Documentation review does not establish runtime stock safety.
