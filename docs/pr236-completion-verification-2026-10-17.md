# Planning frontend completion verification — 2026-10-17

## Scope and revision

Reviewed PR #236 against specification #238 and tickets #241–#245, with shared-header specification #237 supplied by merged PR #235. The initial checked application revision was `15422dcecb21166d07cfa624ffa04f34d85c4dbe`. The mobile review follow-up below records later source changes; earlier results remain evidence for their stated revision.

PR #235 is merged. PR #236 was retargeted from its former header branch to main so repository CI can run. This task does not authorize merging PR #236.

## Review and completed gap

Independent Standards and Spec source reviews compared the Planning changes with main commit `cf84eb35aa09aef3c4ad72f328ac8ab263c9b3f6`. Standards found no actionable violations. Spec review found one incomplete journey: the cross-design Activities catalog rendered record names as plain text, so staff could not open Activity and Meal records from that catalog and retain its search/page context.

Activity names now link to the canonical nested record. Links use validated current local catalog search/page state, including while a URL update is pending. Existing breadcrumbs carry that origin through the Meal Schedule. This is presentation/navigation work, with no database, API, permissions, quantity, FIFO, ledger or posting changes. A follow-up source review found no remaining actionable spec issue.

## Requirement coverage

| Scope | Implementation and verification boundary |
| --- | --- |
| #239–#240 shared header | Merged #235; existing header/shell/loading/error and affected-consumer regressions retained |
| #241 Design journey | Concise catalog/identity, fiscal year, optional AIP, responsive children, safe filtered/paginated return and delayed URL update |
| #242 Activity journey | Both Activities catalog and nested Activity record, visible date/Office/Planned pax, optional particulars, meal collection, preserved forms/actions and return state |
| #243 Meal Schedule | Canonical draft/posted workspace, inline unique supporting facts, legacy redirect, current versus saved identity, dirty navigation and reachable actions |
| #244 Item inspection | Exact final result, calculated comparison, saved policy, FIFO sources and historical uncertainty; dialog keyboard/focus behavior retained |
| #245 integrated delivery | Current source checks, complete browser suite and reviewed desktop/320px evidence; unchanged inventory/domain safety regressions |

## Fresh verification

- New Activities return tests first reproduced the missing-link failure. The fixture was then corrected to select Activity 01 on page two under the existing descending catalog order; no application sorting changed. Both corrected tests passed: filtered/page-two Activity → Meal → catalog at 1280px and 320px, plus delayed navigation retaining the latest typed search.
- Unit/integration: 433 passed across 62 files. Source/changed-test lint and both architecture checks passed.
- Full browser run: 92/93 passed in 8.3 minutes. The delayed Stock apply cancellation case timed out waiting five seconds for the initial issuance hydration marker, before cancellation began. Both cancel/Escape variants then passed in a focused two-test run without changing application code, assertions or retry configuration. All 93 unique scenarios have passing evidence; this is not a single uninterrupted 93/93 run. The one hydration timeout remains recorded as a test stability limitation rather than hidden.
- Production build and TypeScript: passed on the checked application revision.
- GitHub quality, native-windows and production-runtime checks passed on application revision `15422dc`. PR #236 targets main and is ready for review after the focused rerun; a following documentation-only commit requires its own current check status before merge.

Local evidence: `C:/Users/LENOVO/.codex/pr236-final-quality.log`, `pr236-final-build.log`, `pr236-full-confirmed.log`, `pr236-full-confirmed/`, `pr236-activities-confirmed/` and `pr236-stock-focused.log`. Browser verification uses isolated generated databases, ports and build outputs. Existing manual sample data remains preserved.

Fresh Activities desktop/mobile screenshots were inspected. The catalog retains its comparison columns in a local horizontal scroll area at 320px; the page itself does not overflow. Design/Activity/Meal/Item captures from the full run are inspected alongside behavioral assertions. Historical spec test counts remain historical, not assertions about this run.

## Limits

This is implementation, source, automated behavior and rendered-layout verification. It is not a complete accessibility certification or staff usability study. No new operational workflows, blanket dialog replacements or broad page-body redesign of other modules are included. Parent issue bodies and original requirements are unchanged.

## Mobile review follow-up

Greptile subsequently identified two valid mobile layout gaps on `a9b09e7`: a long Office in Activity mobile facts inherited no-wrap from the shared table cell, and expanded Meal Schedule metadata could consume the non-scrolling draft header and displace its working collection/footer.

Both were reproduced with valid maximum-length Office (200 characters) and Venue (300 characters) data. The Office regression failed its local table overflow assertion. The expanded-details regression failed because Post issuance was outside the viewport. An initial version of that second test also pressed Escape before the Recipe picker had settled; its final version uses the visible Done action and asserts footer visibility before opening the picker.

The Activity identity/facts cell now explicitly allows normal whitespace wrapping. Draft metadata and supply collections share one scrolling work area below the universal workspace header, while the existing action footer stays outside that scroller. This changes no domain rules, inputs, workflow or posting behavior.

- Affected browser verification: **12 passed** in one run, covering draft preparation, Stock editing, canceled delayed application, history guards, Meal Schedule layout, compact Planning and the two new regressions.
- The long-details journey covers 320×640, 320×480 and 1280×800; it inspects expanded Venue, opens Recipes, reaches Stock and keeps Post issuance visible without collapsing the details or growing the document beyond the viewport.
- Reviewed fresh long-Office and expanded-work screenshots. Manual sample data remains untouched.
- Final source checks: **433 tests across 62 files passed**, source/changed-test lint and both architecture checks passed. Production build and TypeScript passed. GitHub checks must match the final pushed revision before merge.
- One account-creation unit test timed out at five seconds during concurrent compilation. It is retained in the raw log; the complete 433-test suite then passed without altered assertions or timeout settings; do not treat this as an account-management code change.

Evidence: `C:/Users/LENOVO/.codex/pr236-long-details-red/`, `pr236-expanded-red/`, `pr236-mobile-fixed/`, `pr236-mobile-fixed.log`, `pr236-mobile-quality-confirmed.log` and `pr236-mobile-build.log`. The earlier 93-scenario browser evidence was not rerun wholesale for these two scoped layout fixes; the current 12-test affected run supplies fresh browser evidence for them.
