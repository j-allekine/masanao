# System reverification — 2026-10-16

Scope: the current PR #234 application, including login, Overview, Planning hierarchy, the unified Meal Schedule workspace, Recipe and Item catalogs, Master Data, Purchase Orders, receiving, issuance and FIFO history. Browser runs use generated disposable databases; the manual preview's posted sample records are preserved.

## Findings and corrections

### Product UI

- **Planning label mismatch.** The sidebar displayed Planning but exposed Activity Designs as its accessible name and tooltip. Both now use the visible label. The new expectation failed before the fix and passes afterward. This follows [W3C's label-in-name guidance](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html); it does not certify the rest of the application against WCAG.
- **Item controls accepted input before hydration.** A fast click after reload could be lost while the filter trigger appeared usable. Item catalog controls now remain disabled until their client interaction handlers are ready; creation and row actions use the same readiness state. An isolated browser test blocks client scripts, proves the initial disabled state, then releases scripts and verifies successful filter navigation. The test failed on the original implementation.

- **Purchase Order controls had the same readiness gap.** Creation, search and desktop/mobile row actions now use the existing client-ready state. A script-delayed regression failed before the fix and verifies menu editing and keyboard creation after readiness. The keyboard CRUD journey explicitly waits for the enabled state before focusing the button.

These changes preserve existing shadcn primitives, URLs, roles, permission rules, mutations and inventory calculations. The shared sidebar is consumed by every workspace route family; the full browser run exercises those families. Both catalog readiness changes are feature-scoped.

### Verification defects

- Master Data tests mixed assumptions about empty catalogs with migration defaults, shared Recipe references and records created by preceding tests. Each test now snapshots/restores the reference graph in a generated E2E database. Empty-catalog cases explicitly prepare that state; read-only Office coverage creates its own Office. Guards reject non-generated database paths and databases containing transaction records.
- Unit and Category reference-protection tests search for their owned fixtures instead of assuming they appear on the first page.
- The Vendor focus test now waits for the newly created Vendor to reach its refreshed page before counting rows and deciding which deletion leaves the page empty. The trace showed the old test observing one stale row before the second row appeared.
- The Item typing journey waits for its input to become enabled before sending sequential key events. It still checks the complete search value, URL and unchanged browser-history length.
- Workspace navigation assertions now cover the single Planning entry and usable legacy Activities bookmarks, rather than removed local navigation and Coming later placeholders.
- Four desktop/mobile Overview and Items reference images were reviewed. Three differing baselines were refreshed for already-present Recipes/PO navigation and Overview copy; the mobile Items baseline was unchanged. Layout, clipping and content were inspected before accepting the images. No blanket snapshot update or test retry was added.

## Evidence

The initial full browser run passed 69 of 84 cases. Failures included the product/test issues above and two Chromium `net::ERR_NETWORK_CHANGED` interruptions. Focused reproduction separated those categories before fixes. A subsequent full run passed 83 of 85 scenarios and exposed the Purchase Order readiness failures. Two added readiness regressions bring the suite to 86 scenarios.

Final verification on the corrected tree:

- **86/86 browser scenarios passed in one full run** (7.2 minutes), without retries or snapshot updates. This includes both new delayed-script regressions, Purchase Order keyboard CRUD, Vendor locking after receiving, all Master Data cases, Planning, issuance/FIFO, Recipe editing, exact alternate-Unit receiving, login errors, navigation and responsive sentinels.
- **419/419 unit/integration tests passed across 60 files.**
- Source lint, changed-test lint, both architecture checks, TypeScript, production build and the native production SQLite verification passed on Node 24.15.0.
- Fresh Purchase Order desktop/mobile screenshots were inspected after the toolbar wrapper change. No unintended clipping, overflow or layout shift was observed. Overview and Items desktop/mobile sentinels passed against the individually reviewed baselines.
- Existing FIFO and record-page decisions remain aligned with CONTEXT.md and ADRs 0008/0009. These corrections introduce no new domain or inventory policy.

Reproduce the browser run with `pnpm exec playwright test`; the config generates a disposable database. The accepted local browser artifacts use `C:/Users/LENOVO/.codex/system-complete-browser-1016`, with the adjacent `.log` file. Source/build/runtime results are in `C:/Users/LENOVO/.codex/system-complete-checks-1016.log`. CI validates the pushed head separately and does not run browser tests.

## Boundaries

Automated coverage is evidence for the exercised behavior, not a proof that the entire system is defect-free, a penetration test, full screen-reader certification, or a substitute for staff acceptance testing. Existing posting boundaries remain: posted issuance and receipts are immutable; corrections, reversals, returns, lot/expiry tracking and accounting valuation are outside the accepted release scope.

The [record-page design guide](record-page-design.md) records future layout consistency work and exceptions. This pass fixes confirmed behavior and verification gaps; it does not apply the Meal Schedule layout globally.

## Follow-up: restore the workspace header

The unified page had also removed the standard Planning workspace header. User review identified this as an unwanted loss of application consistency. The Meal Schedule route now retains that header and sidebar toggle above the breadcrumbs, while keeping one meal heading and the compact draft/posted body. The breadcrumb row no longer duplicates the sidebar toggle. The body flexes within the remaining viewport so the fixed header does not push draft actions below the screen.

Both focused layout/posting browser journeys passed, including legacy redirects, guarded breadcrumbs, Meal details focus, final posting and immutable history. Fresh draft and posted captures at desktop and 320px mobile widths were inspected. Source lint, both architecture checks, TypeScript and production build passed for this follow-up. The 86-case full-suite result above describes the preceding commit, not a rerun after this header correction.
