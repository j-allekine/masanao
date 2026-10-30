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
| #268 | Activity Design and Item catalog patterns | #266 | Verified `c6a634f` + `bf6be87`; integration pending |
| #269 | Planning and Item entry dialogs | — | `da74302`; integrated `30e3284` |
| #270 | Responsive filters | #268 | Pending |
| #271 | Activities catalog | #270 | Pending |
| #272 | Recipes catalog | #269, #270 | Pending |
| #273 | Purchase Orders catalog | #269, #270 | Pending |
| #274 | Master Data tabs, Units, Categories | #267, #269, #270 | Pending |
| #275 | Offices and Vendors | #274 | Pending |
| #276 | Inventory | #270 | Pending |
| #277 | Planning records | #268, #269 | Pending |
| #278 | Recipe record and return context | #272, #277 | Pending |
| #279 | Purchase Order record and receipt inspection | #273, #277 | Pending |
| #280 | Recipe editor | #278 | Pending |
| #281 | Delivery editor | #279 | Pending |
| #282 | Draft Meal Schedule | #277 | Pending |
| #283 | Posted Meal Schedule | #277 | Pending |
| #284 | Activity Design child collection | #277 | Pending |
| #285 | Activity child collection | #277 | Pending |
| #286 | Purchase Order receipt history | #279 | Pending |
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
