# Frontend consistency implementation

Specification: [#264](https://github.com/j-allekine/masanao/issues/264).
Implementation: [PR #289](https://github.com/j-allekine/masanao/pull/289).
Starting revision: `5f00857868e8f7bd7ee50a7d29d448fb9de5eaba`.

## Delivery graph

Each ticket is integrated only after its predecessors. All changes converge on
`codex/frontend-consistency-264`; the parent and tickets remain open until merge.

| Ticket | Scope | Predecessors | Integration |
| --- | --- | --- | --- |
| #265 | Sidebar preference and shell ownership | — | `75c8723` + `0cb45fd`; integrated `7ed042c` |
| #266 | Header and scroll ownership | #265 | `d0ee76c`; integrated `ba6f4b8` |
| #267 | Headings and primary landmarks | #265 | `5075285`; integrated `63babd6` |
| #268 | Activity Design and Item catalog patterns | #266 | `c6a634f` + `bf6be87`; integrated `7f0c66d` |
| #269 | Planning and Item entry dialogs | — | `da74302`; integrated `30e3284` |
| #270 | Responsive filters | #268 | `87d4ab7` + `c418c0c`; integrated `7f0c66d` |
| #271 | Activities catalog | #270 | `11f71de`; integrated `1819ea9` |
| #272 | Recipes catalog | #269, #270 | `bbcc89f`; integrated `5f16784` |
| #273 | Purchase Orders catalog | #269, #270 | `7b5909a`; integrated `77e696a` |
| #274 | Master Data tabs, Units, Categories | #267, #269, #270 | `1ee0db5` + shared confirmation fixes; integrated `a3b5406` |
| #275 | Offices and Vendors | #274 | `4107461` + `763d023`; integrated `a3b5406` |
| #276 | Inventory | #270 | `a79bb59`; integrated `1819ea9` |
| #277 | Planning records | #268, #269 | `741a59d`; integrated `6a2d0d6` |
| #278 | Recipe record and return context | #272, #277 | `bb781fa`; integrated `26fe20b` |
| #279 | Purchase Order record and receipt inspection | #273, #277 | `86e2eda`; integrated `d1b3539` |
| #280 | Recipe editor | #278 | `1851cac` + `9d8780c`; integrated `487a036`; shared rapid-Back correction pending |
| #281 | Delivery editor | #279 | `5a2473d`; integrated `b59b4b1` |
| #282 | Draft Meal Schedule | #277 | `73e1e57` + guard `0eb2dd6`; integrated `a762253`; portal-action sizing follow-up in progress |
| #283 | Posted Meal Schedule | #277 | Pending |
| #284 | Activity Design child collection | #277 | `6afbff8`; integrated `0067a34` |
| #285 | Activity child collection | #277 | Pending |
| #286 | Purchase Order receipt history | #279 | `9d1498e`; integrated `71610dc` |
| #287 | Dashboard origin | #277 | Pending |
| #288 | Integrated verification | All terminal scopes | Pending |

## Evidence requirements

Every implementation entry must identify its revision, actual commands and
results, affected routes/states/roles/viewports, inspected capture locations,
intentional visual changes, and unresolved gates. Green checks on an earlier
revision do not verify the integrated result.

The full browser suite is required after the shell/header foundation and again
after integrated changes. Browser databases, ports, build directories, and
teardown ownership must be isolated. Existing domain safeguards remain required.

Real-phone software-keyboard, orientation, and touch verification for Recipe and
delivery entry is outstanding. On 30 October 2026 the user confirmed that a phone
is unavailable and requested that this gate remain recorded as outstanding.
Desktop emulation cannot close this gate; required unresolved gates keep the PR
in draft.

## Verification entries

Implementation and verification are in progress. No ticket or parent completion
is claimed by this initial tracking document.

### Baseline, before application changes

Revision: `fe71929` (application code still matches `5f00857`).

- `pnpm test:architecture`: 2 passed.
- `pnpm test:run`: 73 files, 487 tests passed.
- `MASANAO_E2E_PORT=3030 pnpm exec playwright test
  tests/e2e/workspace-shell.spec.ts tests/e2e/workspace-header.spec.ts
  --output test-results/baseline-shell --reporter=list`: 7 passed.
- Browser coverage: existing desktop/320px header route matrix, mobile drawer
  Escape/focus, collapsed tooltips/brand/account, seven destinations and legacy
  Activities. Existing matrix captures are in `test-results/baseline-shell` in
  the integration checkout; these are baseline artifacts, not acceptance of
  the later implementation.
- Dependency setup regenerated the ignored Prisma client from the unchanged
  schema. No application database or schema was changed.
- `next typegen`, `tsc --noEmit`, and production build passed with disposable
  build-only environment and `.next-build-264-baseline` output. Generated
  temporary TypeScript includes were removed afterward.

### Planning and Item entry dialogs (#269)

Implementation: `da74302`, integrated by `30e3284`.

- Lint, TypeScript, architecture (2), focused unit/domain tests (51), and
  browser journeys (11) passed. Focused unit checks preceded the final
  focus/pending-only changes; browser/lint/type checks covered final content.
- Browser command: `MASANAO_E2E_PORT=3029 pnpm exec playwright test
  tests/e2e/entry-dialogs.spec.ts
  tests/e2e/planning-design-interactions.spec.ts tests/e2e/items.spec.ts
  --reporter=line`.
- Inspected captures: `C:\Users\LENOVO\.codex\spec-264\evidence-269`.
  Includes 320×480 long Activity context, Item/Meal validation, and Design
  pending/error interaction. No snapshot baselines changed.
- Entry dialogs use supported widths, viewport bounds, Close clearance, and
  meaningful initial focus. Pending close/duplicate submission is blocked.
- Remaining shared/dialog consumers, full integrated browser regression,
  production build, zoom/text-spacing, removed-opener focus, and real-phone
  verification remain explicit integration gates.

### Header and scroll ownership (#266)

Implementation: `d0ee76c`, integrated by `ba6f4b8`.

- Lint, TypeScript, architecture (2), header-state unit tests (6), and focused
  browser journeys (6) passed on final contents.
- Browser command: `MASANAO_E2E_PORT=3032 pnpm exec playwright test
  tests/e2e/workspace-header.spec.ts tests/e2e/meal-schedule-layout.spec.ts
  --reporter=line`.
- The 15-route matrix checks desktop/phone top, middle, and end scrolling.
  Dashboard also covers 320×480, enlarged text, and focus clearance.
- Captures: `C:\Users\LENOVO\.codex\spec-264\evidence-266`. Some include
  development rendering indicators and require replacement during the final
  accepted screenshot sweep.
- The compact header now stays visible, measured height drives document focus
  clearance, Dashboard report controls scroll, and bounded Meal Schedule bodies
  own their scrolling/gutter. No manual scrollbar-width compensation.
- Full foundation browser regression and production build wait for #265
  follow-up and #267 integration. Tablet/overlay shifts, broad zoom/text-spacing,
  final capture review, and real-phone evidence remain outstanding.

### Integrated foundation (#265–#267)

Source revision: `63babd6a85f80596443509e03b76cbbc7bb687b1`.

- Sidebar follow-up: 11 browser journeys, lint, TypeScript, and architecture
  passed. Covers real client navigation, saved/default first paint, unavailable
  cookie writes, temporary drawer/focus, and staff/admin account transitions.
- Semantic slice: 11 browser journeys, lint, TypeScript, architecture, and 6
  semantic unit tests passed. One main/H1, skip navigation, anonymous transient
  shells, real error Retry, not-found, and sign-in behavior are covered. A final
  permission-limited fallback tag change received lint/type checks afterward.
- Integrated lint, architecture (2), full unit/domain suite (73 files / 487
  tests), route type generation, TypeScript, production build, and production
  SQLite smoke all passed on this exact source revision.
- Full browser command: `MASANAO_E2E_PORT=3030 pnpm exec playwright test
  --output test-results/foundation-63babd6 --reporter=list`.
- Full browser result: **156 passed, 8 failed**, 19.7 minutes. This is an
  executed regression gate, not a passing acceptance claim.
- Failures: two Planning document-width equalities; Dashboard's retired pinned
  report expectation; dialog centering against a viewport including reserved
  gutter; Item width equality; and three stabilization cases with old geometry
  or screenshot baselines. Each is being reviewed against the approved contract;
  actual overflow, centering, navigation, and visual checks remain required.
- Failure contexts/traces: `test-results/foundation-63babd6`. Full log and quality
  reports: `C:\Users\LENOVO\.codex\spec-264\foundation-63babd6.log` and
  `foundation-checks.md`. Focused corrections and reviewed baseline changes must
  be verified before this gate can pass. Final integrated regression remains
  separately required after remaining modules land.

### Catalog and filter foundation (#268, #270)

Integrated revision: `20e40b4` (includes the reviewed foundation test corrections).

- #268 passed lint, TypeScript, architecture, 55 focused unit tests, and 11 final
  browser journeys. Four Designs/Items desktop/mobile snapshots were reviewed
  individually. Covers independent pane/content widths, single responsive DOM,
  complete facts/actions, long values, exact reorder levels, and resize focus.
- #270 passed lint, TypeScript, architecture, 16 focused unit tests, and 31 browser
  checks. Covers exact toolbar widths 759/760/761, all ten catalog consumers,
  nested filter focus, tablet sidebar states, and Inventory refresh/history.
  Four affected live-search-hint snapshots were individually reviewed again.
- Integrated `20e40b4` passed lint, architecture, all 73 unit/domain files (487
  tests), route type generation, TypeScript, production build, and SQLite smoke.
- The second full browser invocation was interrupted after logged test 132. Its
  process no longer exists; **this is a partial run, not a full passing result**.
  Log: `C:\Users\LENOVO\.codex\spec-264\consolidated-20e40b4.log`.
- New observed failures include a cold Activities record heading wait, a stale
  eligibility fixture after direct database deletion, and PO hydration-flow
  focus. The first two have scoped fixes in the pending #277 branch; the PO
  journey received a scoped focus-restoration correction in #273. The full final
  suite is required.
- Handoffs/captures: `handoff-268.md`, `handoff-270.md`, `evidence-268`, and
  `evidence-270` under `C:\Users\LENOVO\.codex\spec-264`.

### Record and catalog slices through `d1b3539`

These are focused slice results, not a passing integrated acceptance suite.
Detailed commands, revisions, captures, and earlier failed-run classifications
are preserved in the task handoffs under `C:\Users\LENOVO\.codex\spec-264`.

- #277: shared record heading/ancestry with Design and Activity consumers.
  Twenty browser journeys passed before final focused refinements; subsequent
  focused action/focus and short-screen enlarged-text checks passed. Lint,
  TypeScript, architecture, 487 unit tests, build, and SQLite smoke passed in the
  worker. See `handoff-277.md`.
- #273: responsive Purchase Order catalog, entry/confirmation states and a
  hydration focus-race test correction. Final three browser journeys, 20 focused
  domain tests, architecture, lint and TypeScript passed. See `handoff-273.md`.
- #274/#275: all four Master Data tabs and complete responsive facts. Final six
  responsive journeys passed; one additional enlarged-text test covered all
  four tabs after visual review found and corrected internal label/action
  clipping. Lint, TypeScript, architecture and 31 domain tests passed. See
  `handoff-274.md` and `handoff-275.md`.
- #272: Recipe catalog and preview with actual availability warnings. Three
  browser journeys, 20 unit tests, lint and TypeScript passed. Captures:
  `evidence-272-final`; details: `handoff-272.md`.
- #278: Recipe record, ancestry and safe catalog-return context. Navigation uses
  real links and cancels obsolete search navigation. Four browser journeys,
  30 unit tests, architecture, lint and TypeScript passed.
- #279: Purchase Order record and immutable receipt inspection. Final three
  functional journeys and two responsive inspection journeys passed after
  correcting an obsolete history-cell expectation and inspection width owner.
  Lint, TypeScript, architecture, 34 unit tests and production build passed.
  See `handoff-279.md`.

Delivery/draft issuance editors, child collections, Dashboard origin, and final
integration verification remain in progress. Real-phone and real 400%
browser-zoom gates remain outstanding. No full-spec completion is claimed.

### Activities, Inventory, Recipe editing, and receipt history (`71610dc`)

- #271: responsive Activities catalog; focused browser coverage includes both
  roles, long facts, states, pagination, and return context. See `handoff-271.md`.
- #276: one responsive Inventory table with all six facts and exact quantities.
  Navigation, refresh, history, CSV, and domain owners are unchanged. Initial
  browser set: 26 passed and one obsolete duplicated-layout locator failed.
  Corrected category/empty/filter rerun: 6 passed; final long/status rerun: 4
  passed. Unit 25, architecture, lint and TypeScript passed. See `handoff-276.md`.
- Shared touch follow-up `79e261c`: growing 40px actions, header trigger,
  pagination, search controls and dialog Close; bounded Item confirmation.
  Focused browser 7 passed; header 2 passed across 15 routes at desktop/phone;
  unit 8, architecture, lint and TypeScript passed. See `handoff-catalog-touch.md`.
- #280: 24 browser journeys passed, including twelve ingredient lines, raw
  values/errors, pending failure, native unload, reload and Back/Forward, and
  short-screen 200% text. Screenshot review corrected an oversized footer that
  had left too little usable body space. Shared guard is persistent and stores
  only additive history indices. See `handoff-280-final.md` and
  `handoff-navigation-guard.md`.
- #286: final browser 3 passed across admin/staff and 0/1/10/11/24 children,
  search, clamp, creation reveal, refresh/shrink, and history. Native URL writes
  let Next supply routing markers while preserving unrelated metadata.
  See `handoff-286.md` for retained evidence and limits of earlier check logs.
- Integrated lint, architecture (2), route type generation, TypeScript,
  production build and SQLite smoke passed at `71610dc`. Full unit result:
  **502 passed, 1 failed** (76 files). Failure is the retired 36px action-class
  expectation; isolated test correction `e4c883e` passed 2 focused tests and
  awaits integration. This is not yet a passing integrated unit gate.
- A production-server browser trial passed Recipe history and twelve-line
  saving, but failed a receipt-count locator and the production sign-in rate
  limit during repeated SSR checks. It does not replace the canonical full
  browser gate. Details: `integration-71610dc-checks.md` and
  `production-harness-71610dc.log` in the external task directory.
- A subsequent draft-issuance stress test reproduced a real shared-guard gap:
  two rapid Back actions can bypass the prompt. Its centralized correction is
  in progress under #282 and must be adopted/rechecked by all three editors.
  The PR remains draft; no full integrated browser pass is claimed.

### Draft issuance and Design child collection (`a762253`)

- #284: fixed ten-row child finding, independent owned URL context, complete
  name/Office search, all-child heading count and filtered range, created-row
  reveal/focus, authoritative clamp, true hierarchy, and explicit catalog return.
  Browser: 7 passed plus 1 expanded-tablet test covering both roles. Worker
  helper/unit, architecture, lint and corrected final TypeScript checks passed.
  An unsupported, ignored search-field prop caused the initial type failure;
  removing only that prop corrected it. See `handoff-284.md`.
- #282: one shared navigation owner replaces the former issuance sentinel and
  listeners. Draft saves reset the saved baseline and later edits regain
  protection. Stock picker initial focus, grouped phone actions, raw values,
  transport recovery, twelve contributions, and enlarged-text states are covered.
  Broad browser run: 18 passed / 3 failed; each classified failure subsequently
  passed a focused rerun. Guard/cross-consumer run: 9 passed plus the corrected
  review test passed separately. Domain 70, architecture, lint and TypeScript
  passed. See `handoff-282-final.md`.
- Shared rapid-history correction `0eb2dd6` suppresses intervening owned
  traversal events until the original entry is restored. Repeated Back while
  dirty, while the dialog is open, and while saving now pass focused tests;
  destination URLs and forward entries are not rewritten.
- The stale shared-action unit expectation is corrected by `e4c883e` in this
  integration. The root focused run passed 2 files / 11 tests, covering action
  controls and child-state helpers (`integration-a762253-focused-unit.log`).
  This supplements the earlier full result; a final full suite remains required.
- Source review found that portalled draft-dialog controls bypass the page's
  40px action composition; a scoped measurement/follow-up is in progress.
  Delivery is also replacing a separate scrollable identity header with the
  required single editor body. Neither gap is being deferred as a passing state.
- Meal child finding, posted-result presentation, Dashboard origin, integrated
  return/focus checks, full final regression, real phone, and actual 400% browser
  zoom remain outstanding. The PR stays draft.

### Delivery entry (`b59b4b1`)

- #281 passed 7 final browser journeys, 23 focused unit tests, lint,
  architecture, route type generation, TypeScript, SQLite smoke and a clean
  production build. See `handoff-281.md` and `evidence-281-gutter-final` under
  the external task directory.
- Purchase Order/Vendor identity, date, lines and errors share one scrolling
  body. Task title, Close, Cancel and Post remain outside it. Phone lines retain
  Item/Unit/quantity/price/exact results, including twelve-line posting, stale
  Item recovery and same-Item/different-Unit behavior.
- Discard uses bounded feature-owned AlertDialog composition with 40px growing
  actions and whole-word labels. Checks cover pending close refusal without a
  queued exit after failure, native unload, Back/Forward/reload, raw values,
  full focused-field clearance, no horizontal crop and tablet modal insets.
- The receipt-range test now scopes to the accessible main landmark after
  trace inspection proved the duplicate was a hidden streamed SSR copy.
- Before this merge, CI at `dc8a48f` passed all three required jobs, including
  77 unit files / 512 tests, types, lint, architecture and production build.
  Evidence: `ci-dc8a48f.log`. Later changes still require current CI.
- Recipe/Purchase Order explicit-return focus, remaining Planning context and
  posted presentation follow-ups, Dashboard origin, whole-system regression,
  real phone and actual 400% zoom remain in progress or outstanding.

### Posted Meal results and draft follow-ups (`572fcd1`)

- #283 presents immutable saved final quantities before contributions. Current
  planning details remain a separately labelled disclosure. Recorded,
  reconstructed and missing receipt sources retain their existing meanings.
  Long saved Recipe names now wrap inside the actual scrolling body.
- #282 follow-ups fix measured 28px portal controls, enlarged-text discard
  overflow and lost opener focus. Draft and posted content use the measured
  pane/content gutter owners. Shared Header typography awaits #285 adoption.
- All eight local journeys have passing final-source coverage: seven passed
  in the broad run; the eighth passed after its fixture waited for indexed
  client navigation. Posting/FIFO/quantity units: 43 passed. Architecture,
  lint, type generation and TypeScript passed. See `handoff-283-final.md` and
  `handoff-282-final.md` in the external task directory for exact logs and
  classified fixture failures. This is not a full integrated browser pass.
- CI for the preceding pushed revision `04ccb63` passed quality,
  native-windows and production-runtime (run `41284524835`). Current changes
  still require fresh CI and final integrated checks.
- Remaining implementation: Meal child context, catalog return focus and
  Dashboard origin. Final regression, actual 400% browser zoom and the
  explicitly unavailable real-phone check remain outstanding. PR stays draft.

### Integrated baseline checks and native zoom (`ffc4e41`)

- Root unit suite: 77 files / 512 tests passed. Lint and both architecture
  checks passed. All three CI jobs passed at this revision
  (`41309547752`). Logs are indexed in `integration-ffc4e41-checks.md`.
- Actual Chrome 400% zoom was exercised through native browser controls,
  reducing a normal desktop viewport to 320×180 CSS pixels. All seven main
  destinations retained one main/H1 without whole-page horizontal overflow;
  top/end captures are retained. This is an early baseline trial.
- The trial found two real failures: Recipe's scrolling body shrank to
  18.6px and draft Meal's to 2.6px, preventing full-field visibility. Both
  have assigned implementation follow-ups. Delivery's first-line receipt
  and quantity fields fit fully within its 43.2px body in this trial.
- Native surface captures and measurement limits are documented in
  `native-400-baseline-ffc4e41.md`. Final-source native zoom, integrated
  regression and the unavailable real-phone gate remain outstanding.

### Meal child navigation and Dashboard foundation (`0ee9594`)

- #285 adds ten-row Meal Schedule finding with stable ties, complete counts,
  isolated child URL state, authoritative created-row reveal and deletion
  clamp. Planning record/catalog returns now focus the actual authorized row
  or a safe visible fallback. Parent targets have measured 40×40 minimums.
- Successful child creation opts out of Dialog opener restoration so it can
  focus the new row; cancellation and other callers retain normal restoration.
  The shared Meal Header now uses the responsive title and ancestry patterns.
- Worker checks: 27 affected browser journeys passed across the retained run
  and one corrected cold-route rerun; six repeated creation/focus journeys
  passed. Helpers and Meal safeguards: 44 passed. Lint, architecture, build
  and explicit TypeScript passed. See `handoff-285.md`.
- #287 foundation adds strictly validated applied Dashboard origin links,
  shared title/gutters and responsive report controls. A measured 200% text
  pagination overflow is fixed within Dashboard. Worker checks: 31 units,
  three existing browser journeys plus the corrected new journey, architecture,
  lint and types passed. See `handoff-287-foundation.md`.
- Dashboard propagation through Planning remains unfinished. Merger checks
  passed 49 focused tests, two architecture checks and lint. Final-source
  browser regression, editor short-height fixes and device gates remain open.

### Catalog return focus and short editors (`2294c77`)

- Recipe and Purchase Order returns use validated catalog URLs and actual row
  IDs. The shared focus hook handles only authorized rendered rows or the known
  search fallback. Feature state, filters, permissions and page clamp stay local.
- Recipe title sizing follows actual inner width. A local resize observer and
  short-height spacing keep focused fields visible: the full 80px enlarged
  field at 320×480 and 40px field at 320×180 have passing viewport evidence.
- Draft Meal's compact short-height footer retains all three actions and full
  accessible names. At 320×180 its body measures 66px; the normal phone footer
  remains two rows. Posted read-only scrolling also passed the focused check.
- Recipe/PO worker browser coverage: 20 passing journeys plus the sole
  corrected SSR-readiness case passed separately. Fifteen units, lint,
  architecture, types and production build passed. Draft/Posted short-height
  browser checks: two passed, with lint/types passing. See
  `handoff-catalog-return-focus.md` and `handoff-meal-180.md`.
- Merger checks passed 63 focused tests, lint and both architecture checks.
  These viewport checks supplement the earlier failing native zoom trial;
  actual 400% browser zoom must still be repeated on final source.

### Dashboard round trip and shared pagination (`3497583`)

- #287 now carries the separately validated applied Dashboard origin through
  Planning hierarchy links, edit cancellation, guarded draft exits and legacy
  redirects. Real breadcrumbs remain intact. Invalid or mismatched origin
  omits Return to Dashboard; actual Design child membership is checked.
- Worker checks passed 54 helper/domain tests and nine unique browser journeys,
  including both roles, page-two custom report round trips, reload/new-tab/history,
  unsent fields, delayed refresh and access/session recovery. Lint, architecture,
  types and production build passed. See `handoff-287-final.md`.
- Access evidence preserves the existing distinction: a disabled account can
  retain its session, while Dashboard's unchanged report read rechecks current
  eligibility and withholds report data. Reenabling and refreshing recovers it.
- Shared pagination now wraps its summary, navigation and page choices within
  available width. Items reproduced clipped controls at 320px with 200% text;
  final coverage passed all 14 consumers across 84 combinations, including
  enlarged 80px targets, every page choice and keyboard paging. Twenty-five
  units, lint, architecture and types passed. See `handoff-pagination-reflow.md`.
- Merger checks passed 75 focused tests, lint and both architecture checks.
  #288 combined-chain evidence, current design guidance, full final regression,
  native zoom recheck and the unavailable phone gate remain outstanding.

### Native overlay findings and filter correction (`69f7849`)

- Native Chrome 400% at application source `3497583` confirms the corrected
  Recipe and draft Meal fields fit fully in their 66.6px scroll bodies. Raw
  Recipe decimal input survives Keep editing; real Discard navigation succeeds.
- The same trial found filter-body collapse, an unreachable short navigation
  drawer, and a maximum-length Recipe inspector title overflowing its Sheet.
  Exact measurements and native surface captures are indexed in
  `native-overlays-3497583.md`. These findings prevent a passing native-gate claim.
- Shared filter Sheets now place instructions in their single scrolling body,
  preserve fixed task identity, enlarge Close, and wrap growing footer actions.
  Both actual Sheet consumers (Items and Inventory), eight search-only toolbar
  routes, active reset/dropdowns, breakpoint focus and delayed Inventory refresh
  have passing worker evidence across five retained browser cases. Focused
  units, lint, architecture and types passed. See `handoff-short-filter-sheets.md`.
- Merger focused units, lint and architecture passed. Drawer, inspector and
  child-toolbar integration follow-ups remain in verification. Final full-suite,
  production/native recheck, code review and real-phone gates remain open.

### Combined return integration and draft inspection (#288; base `3497583`)

- The new combined Planning journey establishes three different searches and
  page 2 positions through real controls, then verifies stepwise/direct ancestor
  returns, reload/new-tab, Back/Forward, row focus and latest-query ownership.
  Both roles run at 1280x720 and 320x480. Six owned-fixture renamed/deleted return
  cases verify safe focus and page fallback without mixing collection state.
- Fresh phone captures exposed child search inputs squeezed by Clear buttons.
  Feature-local minimum search width and wrapping actions restore readable
  queries; the regression failed at 33.6px before the fix. The new combined cases
  and four existing role-based child-list journeys passed afterward (14 cases).
- The draft Recipe inspector reproduced 1225px content inside a 575px Sheet with
  a valid 100-character Recipe name. Identity, description and all ingredients
  now share one bounded scroller below a fixed Close band. Table cells wrap;
  Close retains 40px targets (80px at 200% text). Focus enters the title, returns
  to the actual opener, and waits for Sheet closure before combined review.
- Two final inspector cases passed for admin/staff at 1280x720,320x180 and
  320x480 with 200% text. They retain 12 ingredient rows, exact baseline/scaled
  quantities, read-only inspection, keyboard and measured visible-point pointer
  activation, Escape/Close return, and 2kg contribution versus 3kg adjusted total.
  No draft is saved by these fixtures.
- Removed only Dashboard's three duplicate pagination CSS overrides and their
  obsolete wrapper class after shared pagination adoption. Five Dashboard
  pagination/origin journeys passed with fresh geometry and keyboard evidence.
- Current DESIGN/record guidance describes delivered patterns. Earlier staged
  specs have explicit successor notes; historical ADR/capture facts remain.
- Safeguards: 125 focused helper/domain tests, lint, changed-test lint, two
  architecture checks and TypeScript passed. Retained browser evidence records
  14 Planning passes and two corrected inspector passes separately; it does not
  call the earlier 16-case invocation a complete pass. See `handoff-288.md`,
  `288-fixed.log`, `288-inspector-verified.log` and `288-verified.log` in the
  external spec-264 evidence folder for exact commands, diagnoses and captures.
- This is scoped integration evidence. Root owns the final merged-source full
  browser suite, production build, all 22 acceptance cases and actual 400% zoom
  after separate Filters/Sidebar follow-ups. The unavailable real-phone gate
  remains open. Neither #264 nor #288 is declared complete.


## Review fixes after combined source 4278916

- Read-only Recipe, Delivery Receipt, posting details, issued totals, and nested
  breakdown Dialogs now compose the canonical DialogContent with one bounded
  identity/content scroller below a retained Close area. Posted Recipe inspection
  also reserves that Close band. Entry, picker, confirmation, and discard
  primitives are unchanged. Three browser cases passed at 320x480, 320x200, and
  320x180, checking all consumers at scroll start/middle/end, nested Escape,
  canonical Tooltip dismissal, and opener focus (`review-fixes-inspect-second.log`).
- Activity and Meal child edits defer focus until authoritative refreshed rows and
  any page clamp settle. A still-visible row regains its menu focus; a renamed
  filtered-out row falls back to its collection heading. Activity creation now
  marks successful completion before delegating new-row focus to its collection.
- Recipe unavailable-Unit warnings reflect the selected draft Unit, clearing after
  an active Base Unit repair while preserving raw `0.1250` and server validation.
  The three original behavior regressions failed with baseline implementations;
  seven final browser cases passed, including both visible-row/fallback edit
  variants and delayed creation (`review-fixes-behavior-final.log`).
- A pure native-history state helper removes only Next integration markers and
  preserves navigation-owner metadata, Next tree, and unrelated state. Features
  retain their own URLs and filter rules. Forty relevant helper tests, lint, and
  both architecture checks passed. No domain/schema/auth-policy changes.
- This is isolated review-fix evidence. Combined final-source browser, production,
  and native-zoom verification remain root-owned. The real-phone keyboard,
  rotation, and touch gate remains outstanding; #264/#288 are not complete.


## Canonical browser corrections after review fixes

- Corrected stale exact return URLs/hrefs to include their approved focus targets.
  Contextual Meal creation verifies its new child link is revealed/focused in
  the parent collection before drilling into the new Meal. Existing guard,
  permission, posting, conversion, and exact-amount assertions remain.
- Indexed delivery history now starts from a hydrated parent link. Receipt
  Back/Forward after reload waits for shell hydration. Full catalog-return,
  delivery-editor, and Inventory-search files passed sequentially in one isolated
  database (29 cases), proving owned fixture cleanup no longer changes another
  file's first Inventory page (`candidate-fixture-cleanup.log`).
- Receiving checks use active stacked field labels and horizontal containment at
  narrow widths; desktop headers remain checked at 1280. Receipt amounts remain
  associated with exact receipt identities under deterministic tied-date ordering.
- All 25 prior diagnostic failures now have passing focused evidence. This does
  not claim a passing whole suite: the partial correction runs retain their
  actual failure counts in external logs, and root owns the final combined run.
- Root individually inspected and accepted exactly six regenerated baselines:
  `activity-designs-{desktop,mobile}-win32.png`,
  `dashboard-{desktop,mobile}-win32.png`, and
  `items-{desktop,mobile}-win32.png`. Shared header/control sizes, title hierarchy,
  mobile controls/cards/pagination and report stacking are intentional. No
  unintended clipping, overlap or overflow was visible. Dashboard's updated-time
  stripe remains the explicit test mask. No other baselines changed.
- One new delayed-loading regression forwards the real upstream Items HTML,
  assets and development websocket through a test-owned streaming proxy. It
  captures the actual Loading Items fallback with one header/main/H1 and saved
  collapsed sidebar, then releases the remaining real bytes and asserts hydrated
  Items with the same sidebar. It adds no app hook, fabricated markup or blocking
  database lock, and closes its owned sockets. Root visually accepted the genuine
  loading capture (`items-real-loading.png`).
- Final capture invocation passed five cases: contextual creation, the three
  desktop/mobile baseline cases and real loading-to-ready
  (`candidate-corrections-final-captures.log`). Corrected affected journeys,
  helpers and changed-test ESLint passed separately. App source remains exactly
  the reviewed e214cd4 source; these follow-ups change tests/evidence only.
- Final production, full browser and native 400% verification remain root-owned.
  Real-phone software keyboard, rotation and touch remain outstanding; PR stays
  draft and neither #264 nor #288 is declared complete.
