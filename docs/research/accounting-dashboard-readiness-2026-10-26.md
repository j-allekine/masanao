# System and Accounting dashboard readiness — 26 October 2026

Reviewed checkout: `3729882`. This is a source/model review with fresh automated checks and a limited live-browser inspection. No application behavior was changed.

This document records the initial assessment. The implemented scope and current
calculation contract are in [Budget accounting Dashboard](../implementation/kitchen-dashboard.md).

## Decision

The core kitchen workflow is implemented and provides a usable foundation for a read-only supplies and receiving dashboard. The system is not a complete accounting system. A dashboard can show recorded receipt amounts and accountable stock quantities now; issued-stock valuation, closing inventory value, payments, payables, expenditure, and budget utilization need additional contracts or data.

Do not delay the first quantity/receipt dashboard until a full accounting system exists. Keep its labels faithful to what Masanao records.

## System coverage

| Area | Current support | Boundary |
| --- | --- | --- |
| Authentication/accounts | Local sign-in, staff/admin, disabled-account controls | No dedicated Accounting viewer permission model |
| Master data | Items, Base Units, conversions, categories, vendors, offices, reorder levels | Master data does not create stock |
| Planning | Activity Designs → Activities → Meal Schedules; planned pax/budget | Planned budget is not appropriation, obligation, payment, or actual expense |
| Recipes | Baseline pax, copied recipe evidence, scaling and direct-use stock | Recipes/drafts do not reserve or deduct stock |
| Purchase Orders | Vendor/order reference, delivery register and delivered amounts | No ordered Item lines, approved order value, expected quantity or fulfillment variance |
| Receiving | Multiple receipts per PO, exact quantity/conversion/price calculation, atomic stock-in | No full inspection/acceptance/payment workflow; no receipt posting-actor field |
| Issuance | Saved draft, combined final Item quantities, shortage/policy checks, atomic posting, retries/concurrency protection | Final posted record; no supported return, reversal or correction workflow |
| Inventory | Exact stock-in minus stock-out, status/filter/pagination, refresh, CSV | No opening-stock, count adjustment, donation, waste, expiry or lot workflow |
| Traceability | Issued totals → FIFO receipt allocations → receipt → PO | Source selection is not an approved valuation method; reconstructed allocations are assumptions |
| Reporting | Inventory CSV and PO delivery summaries | Overview remains a welcome/navigation screen; no accounting dashboard or monthly reconciliation report |

Primary evidence: [domain language](../../CONTEXT.md), [schema](../../src/prisma/schema.prisma), [supply gateway](../../src/features/supply-operations/server.ts), [receipt posting](../../src/features/supply-operations/server/db/delivery-receipts.ts), [issuance posting](../../src/features/issuance/server/db/post.ts), [balances](../../src/features/supply-operations/server/db/stock-balances.ts), [FIFO decision](../adr/0008-fifo-receipt-allocation.md), [overview](../../src/components/workspace/workspace-page.tsx).

## Gaps that affect accounting numbers

1. **Peso valuation is not defined.** Receipt lines store selected-unit price and exact line amount. Issuance stores quantities and source allocations, without an approved issued-cost/closing-value calculation or rounding policy. A conversion must be reflected when converting a receipt price to Base Unit cost. Never multiply an alternate-unit price directly by Base Unit usage.
2. **Historical Office/date grouping can change.** Posting evidence freezes quantities, recipe/context labels, actor and source evidence, but its context omits Activity Office and scheduled date. Activities remain editable. Freeze the context at posting before presenting historical Office/date breakdowns as stable. Old records need a stated migration assumption; current planning values cannot prove past values.
3. **Opening stock and custody need an explicit basis.** Ledger history can derive opening quantity for a reporting period, but only for stock actually recorded in Masanao. There is no formal opening-balance intake/value workflow. Confirm the start date and whether pre-system stock is represented before calling it the kitchen's complete inventory.
4. **Cutoff rules are missing.** Receipt stock-in uses the actual receipt date at UTC midnight; issuance stock-out uses the posting timestamp. Receipt posting time is separately available. Define calendar-date handling, Manila timestamp boundaries and an as-of cutoff. Flag late/backdated receipts; otherwise re-running an old month can silently change its results. Consider saved report snapshots when stable historical submissions are needed.
5. **Read-only Accounting access needs implementation.** Existing staff/admin access is not a report-only audience. Adding a new role alone is insufficient: receipt posting currently checks for an authenticated actor, whereas issuance explicitly checks active staff/admin. Review every mutation gateway so an Accounting viewer cannot alter records through a direct action call.
6. **Correction and accountability controls are partial.** Posted records are final; there is no supported reversal/return/count-adjustment path or comprehensive event log. Issuance records its posting actor, but receipts do not. Agree how real operational mistakes will be handled before treating the system as the complete accountable record.
7. **Some monetary evidence can be missing.** Receipt price/amount columns are nullable for historical compatibility. Existing PO summaries distinguish complete, no deliveries, not recorded and incomplete. Preserve those states; never convert an unknown amount to a genuine zero.
8. **Actual financial transactions are absent.** No payment, obligation, payable, fund/account mapping or accounting journal models exist. Receipt amounts cannot establish paid expenditure, unpaid balances or budget utilization. Meal pax records a meal count, not verified attendance or unique beneficiaries.

Evidence: [schema](../../src/prisma/schema.prisma), [posting context](../../src/features/issuance/types.ts), [context reads](../../src/features/issuance/server/db/drafts.ts), [Activity edits](../../src/features/activity-planning/server/db/activities.ts), [receipt writes](../../src/features/supply-operations/server/db/delivery-receipts.ts), [amount completeness](../../src/features/supply-operations/domain/purchase-order-delivery-summary.ts), [exact amounts](../../src/features/supply-operations/domain/delivery-receipt.ts).

## Recommended first dashboard

- Period selector and visible report cutoff; one consistent read snapshot across panels and exports.
- Recorded delivery amount, with price completeness and links to receipts. Label it “Recorded receipt value,” not “Expenses” or “Paid.”
- Supplies reconciliation per Item/Base Unit: **opening quantity + received quantity − issued quantity = closing quantity**. Never add kg, liters and pieces into a single quantity KPI.
- Posted issuance count and recorded Meal pax, counted once per issuance rather than once per ingredient or receipt allocation. Label summed pax as meal servings, not unique people.
- Vendor/PO/receipt register and issued Item drill-down with exact quantities, timestamps and FIFO/reconstructed evidence labels.
- Exceptions: missing monetary evidence, invalid/missing ledger sources, inconsistent units, allocation mismatches and late/backdated entries.
- CSV export using the same filter, cutoff and snapshot rules as the visible report; preserve exact arithmetic and spreadsheet text safety.

Aggregate receipt lines, Item totals, allocations and issuance counts separately before combining results. A direct join of all four can multiply amounts or pax.

Activity/Office breakdowns should follow frozen context support. Issued/remaining peso values should follow the Accountant's valuation, opening and rounding decisions. Payment/budget panels should follow actual financial records or an agreed integration.

## Live interface observations

The browser at localhost:3000 showed PO `21314` with two receipts totaling PHP 11,220. Receipt `21312` showed two lines: 10 × PHP 11 = PHP 110 and 10 × PHP 111 = PHP 1,110, totaling PHP 1,220; the other receipt showed PHP 10,000. This is a small visible arithmetic check, not a database-wide reconciliation. Visible Item labels include pagination sample data, so these observations do not establish production data readiness. The process serving port 3000 was not tied to this checkout's commit; automated browser checks use this checkout and a fresh isolated database.

## Verification

- Initial test invocation failed because this fresh checkout lacked `src/prisma/generated/client`.
- Generated the client using the configured Prisma generator; no schema migration was applied to the live database.
- Fresh full rerun: **70 test files, 474 tests passed**, using two workers.
- `pnpm lint`: passed.
- `pnpm test:architecture`: **2 passed**.
- `pnpm exec tsc --noEmit`: passed.
- Focused browser run: **6/6 passed** across Inventory, CSV, FIFO and issuance posting (1.8 minutes), using a fresh isolated database. The dev server emitted two “destination stream closed early” messages during navigation; no test failed, but this was not an error-free server log.

The full browser suite, production build, production database reconciliation, backup/restore drill, deployment configuration, penetration test, comprehensive accessibility assessment and staff acceptance were not performed. This review supports the stated dashboard scope; it does not certify the entire deployment or official accounting compliance.

## Accounting authority boundary

This review maps software evidence to possible report labels; it does not prescribe LGU accounting treatment. COA's official [supply/property circular page](https://www.coa.gov.ph/wpfd_file/coa-circular-no-92-386-october-20-1992/) identifies a separate LGU supply/property framework. The applicable current report forms, valuation policy, signatures, acceptance requirements and accounting mappings still need confirmation with the Municipal Accountant. A dashboard alone does not establish that compliance.
