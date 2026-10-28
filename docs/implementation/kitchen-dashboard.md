# Budget accounting Dashboard

`/dashboard` is a read-only comparison of Activity budgets and posted supply
costs. Old `/overview` bookmarks redirect here with their period preserved.
The Dashboard no longer includes stock reconciliation or receiving sections,
nor their unrelated database reads. Existing Inventory and Purchase Order
modules continue to own those workflows.

## Presentation

- Three aligned figures: planned budget, issued supply cost and signed variance.
- Activity table: budget, cost, variance and budget used. No Status column.
- Positive variance uses the existing primary color; negative variance uses the
  destructive color. Explicit plus/minus signs carry the same meaning.
- Clicking an Activity row opens its Activity page. Activity names are real
  links for keyboard access, modified clicks and the browser context menu.
  Dashboard no longer has chevrons or expandable Meal Schedule detail rows.
  Incomplete costs and unposted meals stay visible.
- The Dashboard navigation header, title, period and Refresh control remain
  pinned to the top while the report scrolls. Descriptive text is reduced;
  calculation details remain in Report notes and the sample label stays explicit.
- Activity/Office search runs before five-row pagination. Clearing search
  restores input focus. Totals cover the same filtered scope as the results.
- Date changes reset pagination; controls wait for the new period. Refresh
  reloads the selected period and filters.
- White workspace surface, shared gutters, headings, search controls and table
  treatment match Planning and Inventory. At narrow widths, labeled quantity
  groups replace the wide table. Calculation explanations live in Report notes.

## Calculation contract

- Default period is the current month through today in Asia/Manila. From/To are
  inclusive. Invalid, reversed or future dates show a validation message.
- Activities are selected by scheduled date. Their full budget is counted once,
  never repeated for each meal.
- Cost includes all posted issuances belonging to those Activities through the
  selected period end in Manila, capped by the report generation time. Earlier
  postings are included; later postings and drafts are excluded.
- Costs follow the quantities allocated from each Delivery Receipt line.
  Receipt amount / received Base Unit quantity determines cost per issued unit.
  Differences of rounded cumulative amounts assign centavos deterministically
  in posting-time/ID order and exhaust a fully consumed receipt exactly.
- Shared receipt allocation histories are read once. Missing prices, missing
  allocations, Unit/Item mismatches and overallocated receipt quantities suppress
  the affected cost, variance and budget-used percentage.
- Reconstructed sources are marked as estimates in rows and summary.
- Variance = planned budget minus issued supply cost. Zero budgets have no
  budget-used percentage. Figures are to date, not final savings or profit.
- Summary totals use the same comparable Activities for all three figures:
  recorded budget plus complete posted cost. Excluded Activities remain visible
  in the table with an exclusion count. No comparable data displays a dash.
- Costs cover issued supplies only, excluding labor, utilities and other
  unrecorded costs. These operational calculations are not an approved accounting
  valuation. Current budgets and Activity metadata are not frozen submissions.

All reads use one transaction after checking the persisted staff/admin actor.
The report creates no stock movements, payments or financial ledger records.
No schema migration is introduced.

## Isolated sample preview

The local review server on port 3027 uses `.next-e2e-dashboard-preview.db`, a
backup of the port-3000 checkout's database. It is not a live feed. Sample data
is inserted only into that isolated backup, never into `DATABASE_URL`.

From the repository root:

```powershell
node scripts/seed-dashboard-preview.cjs --preview-only
```

The script requires the exact flag and an existing, explicitly named preview
database in this checkout. It inserts within one transaction and checks foreign
keys. Repeating it for the same month adds only missing sample Activities and
does not duplicate existing records.

Twenty fictional Activities are prefixed **Sample**, spanning four pages. Their receipts, stock
movements, allocation sources, stock snapshots and historical posting evidence
support working links to the existing record pages:

| Sample Activity | Planned | Issued cost | Variance |
| --- | ---: | ---: | ---: |
| Community feeding | 50,000 | 42,000 | +8,000 |
| Disaster response training | 30,000 | 33,000 | -3,000 |
| Youth leadership workshop | 20,000 | 20,000 | 0 |
| Health outreach | 18,000 | Incomplete | Not calculated |
| Staff development | 15,000 | 9,000 to date | +6,000 to date |

Staff development has an unposted Dinner. The preview environment sets
`MASANAO_DASHBOARD_SAMPLE_DATA=1` to display a prominent sample-data notice.
This flag only labels the preview; it does not bypass authorization or create
records. Normal environments do not display the notice.

The additional scenarios include senior citizens, farmers, nutrition, barangay
coordination, livelihood, volunteers, emergency response, scholars, sanitation,
tourism, coastal cleanup, procurement, sports and development planning. They
exercise missing and zero budgets, mixed priced/unpriced meals, draft-only
issuance and Activities without meals. Receipt quantities include every posted
allocation, including unpriced meals. Draft-only and no-meal scenarios create
no receipt or stock-in movement.

## Ownership and verification

- Public gateway/query: `getKitchenDashboard` through supply-operations `server.ts`.
- Actor authorization and transaction: `server/db/dashboard.ts`.
- Budget cohort and cost aggregation: `server/db/dashboard-budgets.ts`.
- Period validation: `domain/dashboard.ts`.
- Exact money calculations: `domain/budget-variance.ts`.
- Feature UI: `dashboard-content.tsx` and `dashboard-budget-report.tsx`.

Tests cover signed and zero-budget comparisons, shared-receipt rounding,
alternate-unit ratios, missing source/price evidence, reconstructed estimates,
date cutoffs, filtering, pagination, authorization and preview labeling.
Browser journeys cover Activity row/link navigation, pinned headers, date updates, refresh,
search/clear focus, empty/invalid dates and 320px through desktop layouts.
The normal screenshot regression run is separate from baseline generation.

Budget-report baseline verification: 72 unit-test files / 484 tests passed. Fifteen focused
browser checks passed; the remaining date-filter test was corrected to expect
the pending button label and then passed twice. Production build, lint,
TypeScript, architecture checks and diff whitespace checks passed. The sample
seed was run twice to verify idempotence, and its sample Breakfast issuance was
opened successfully through the Dashboard link.

Header/row refinement verification: 10 focused unit tests and 10 browser tests
passed. Browser evidence covers desktop/mobile scrolling with a pinned header,
row-cell clicks, keyboard link navigation, browser Back, filters and normal
desktop/mobile screenshot comparison. Production build, lint, TypeScript,
architecture and whitespace checks passed. This change does not repeat the full
unit or browser suite.

Expanded-sample verification: all 485 tests in 73 unit-test files passed, including
a seed regression covering idempotence, flag validation, nullable budgets,
foreign keys and allocation quantities. Production build, lint, TypeScript and
architecture checks passed. The isolated preview contains 20 distinct sample
Activities; all four pages and Office search were verified in the browser.
Sample records have no foreign-key violations, overallocated receipt lines or
nonpositive stock movements.

Pagination could restore stale dates while a period update was pending. A
browser regression reproduced the issue; pagination now waits for that update.
All 11 focused browser checks passed, including desktop/mobile screenshot
comparisons, sticky headers, Activity navigation and pending date changes.

## Shared frontend repairs

The collapsed sidebar previously clipped its 40px brand badge inside a 32px
button, with asymmetric header/group/footer padding. Collapsed spacing now
centers the complete 32px badge and controls. Expanded and mobile navigation
retain their existing layout. The shared content inset can shrink to the
available width, and Meal Schedule breadcrumbs wrap long design numbers.

Browser regressions reproduced both the clipped badge and long-number overflow
before these fixes. Coverage checks collapsed navigation across all eight
workspace destinations and long Meal Schedule breadcrumbs at 320, 406, 768 and
1024px. The posted sample Meal Schedule and its nested issued-total/source
dialogs were also checked manually.

Final PR verification: all 154 browser tests passed in a clean full run, along
with all 485 unit tests in 73 files, two architecture checks, the production
build and native production SQLite smoke test. Unit creation and mobile Item
policy editing also passed five isolated repeats each. The creation tests now
wait for the canonical filtered URL before reload and allow cold Meal Schedule
navigation to finish before asserting on the destination. No production timing
or mutation behavior was changed for those test readiness repairs.
