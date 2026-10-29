# Frontend consistency implementation

Specification: [#264](https://github.com/j-allekine/masanao/issues/264).
Implementation: [PR #289](https://github.com/j-allekine/masanao/pull/289).
Starting revision: `5f00857868e8f7bd7ee50a7d29d448fb9de5eaba`.

## Delivery graph

Each ticket is integrated only after its predecessors. All changes converge on
`codex/frontend-consistency-264`; the parent and tickets remain open until merge.

| Ticket | Scope | Predecessors | Integration |
| --- | --- | --- | --- |
| #265 | Sidebar preference and shell ownership | — | Pending |
| #266 | Header and scroll ownership | #265 | Pending |
| #267 | Headings and primary landmarks | #265 | Pending |
| #268 | Activity Design and Item catalog patterns | #266 | Pending |
| #269 | Planning and Item entry dialogs | — | Pending |
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
