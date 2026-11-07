# Persistent workspace layout verification

The scope is [issue #290](https://github.com/j-allekine/masanao/issues/290) and its implementation tickets #291–#301. The checks below use an isolated SQLite database with fixture staff and administrator accounts.

## User stories and browser evidence

| Stories | Behavior | Evidence |
| --- | --- | --- |
| 1–10 | Workspace orientation, sidebar preference, drawer dismissal, focus return, loading and recovery | [Workspace header](../tests/e2e/workspace-header.spec.ts), [workspace shell](../tests/e2e/workspace-shell.spec.ts), [transient presentation](../tests/workspace-header-states.test.ts) |
| 11–13 | Inventory identity, actions, card labels and exact stock | [Inventory scrolling and history](../tests/e2e/inventory-pagination.spec.ts), [receiving through issuance](../tests/e2e/inventory.spec.ts), [CSV](../tests/e2e/inventory-csv.spec.ts) |
| 14–15 | Items identity, allowed creation, staff permissions and row controls | [Items journeys](../tests/e2e/items.spec.ts) |
| 16–19 | Purchase Order catalog and record identity, delivery history and receiving modal | [Purchase Order journeys](../tests/e2e/purchase-orders.spec.ts), [delivery amounts](../tests/e2e/purchase-order-amounts.spec.ts) |
| 20–24 | Recipe catalog, detail, editor actions and ingredient values | [Recipe journeys](../tests/e2e/recipes.spec.ts), [Recipe safeguards](../tests/recipes.test.ts) |
| 25–29 | Planning catalogs, both record levels, breadcrumbs and the Activities bookmark | [Planning catalogs and hierarchy](../tests/e2e/planning-compact.spec.ts), [Activities return](../tests/e2e/activities-return.spec.ts), [long Planning details](../tests/e2e/planning-long-details.spec.ts) |
| 30–35 | Draft and posted meal identity, review/save/post separation, saved evidence and issuance alias | [Meal Schedule layouts](../tests/e2e/meal-schedule-layout.spec.ts), [drafts](../tests/e2e/issuance-drafts.spec.ts), [posting](../tests/e2e/issuance-posting.spec.ts), [posted review](../tests/e2e/issuance-review.spec.ts) |
| 36–38 | Master Data tabs, allowed actions, filter values and resize | [Master Data journeys](../tests/e2e/master-data.spec.ts) |
| 39–41 | Dashboard workspace bar, scrolling report controls and retained report scope | [Dashboard budget journeys](../tests/e2e/dashboard-budgets.spec.ts) |
| 42–46 | Aligned table labels, mobile card labels, URL state, pagination and empty views | Overflow checks in the catalog journeys above, [catalog filters](../tests/e2e/catalog-filter-standard.spec.ts) |
| 47–50 | Overlay layering, keyboard focus and anchor clearance | [Workspace header](../tests/e2e/workspace-header.spec.ts), [receiving](../tests/e2e/purchase-orders.spec.ts), [Recipe validation and preview](../tests/e2e/recipes.spec.ts), [nested issuance review](../tests/e2e/issuance-review-regressions.spec.ts) |
| 51–56 | Enlarged text, short viewports, resize, long names, headings and scroll locking | Overflow checks in each route family, [Meal Schedule](../tests/e2e/meal-schedule-layout.spec.ts), [workspace navigation](../tests/e2e/workspace-header.spec.ts) |
| 57–60 | Shared positioning, feature-owned content, separate scroll compositions and browser checks | [Workspace layout](../src/components/workspace/workspace-layout.tsx), [table frame](../src/components/workspace/table-frame.tsx), production Playwright suite |

## Implementation decisions

| Requirement | Implementation and verification seam |
| --- | --- |
| Authenticated route scope and legacy paths | All ready route families compose the shared layout. The workspace header, Planning and Purchase Order journeys cover direct routes and redirects. |
| Small slot interface and ownership | Workspace title, task content, body and footer are composed in the shared layout. The callers supply actions, labels and domain context. Architecture checks cover dependencies. |
| Document, report and editor layouts | Catalogs and ordinary records scroll the document. Dashboard pins its workspace bar. Meal Schedule and Recipe editors keep the working body and its action area separate. |
| Shared orientation and compact identity | WorkspaceHeader supplies the sidebar trigger. WorkspaceTaskHeader retains permitted actions. WorkspaceRecordTitle makes long names available in a disclosure. |
| Master Data | One tab group retains the selected section above its scrolling filters and results. The Master Data browser journey tests all four sections. |
| Table semantics and panning | WorkspaceTableFrame moves the native column-label row inside the existing horizontal wrapper. Catalog and record tests check visible labels and cell alignment. |
| Rendered clearance, layering and responsive behavior | The layout measures pinned content and uses that height for focus and anchor clearance. Table headers use the measured viewport boundary. Existing shadcn overlays layer above it. |
| Scrollbar coordination | Ordinary pages reserve document scrollbar space. Bounded editors reserve it in the working body. Modal scroll locking stays with the existing dialog primitives. |
| Transient and account states | Shared loading and retry views render workspace orientation. The browser suite exercises failed reads, sign-out, role switching and session expiry. |
| Operational scope | Prisma schema, authoritative permissions, stock and posting contracts stay in their existing features. Existing domain and integration tests exercise the operational rules. |

## Test method

- Browser checks use actual scroll positions, element bounds, visible state and enabled actions. The viewport matrix includes 1280×720, 1024×768, 768×1024, 390×640, 320×640 and 320×480. The role and text-enlargement checks vary by journey.
- Inventory, Dashboard and Meal Schedule establish the three scroll patterns. Additional fixtures exercise long catalog tables, child records, receiving lines and Recipe ingredients. Existing tests cover empty results, pending actions, return state and saved transaction evidence.
- The production runner is enabled with `MASANAO_E2E_PRODUCTION=1` and runs `next build` followed by `next start`. Fixture sign-ins honor the server’s retry window. The application’s production authentication settings apply throughout.
- Scrolled screenshots and sentinel baselines supplement geometry and interaction checks. Headless browser evidence and injected text styles cover specific viewport and text settings. Physical-device and assistive-technology behavior require separate evidence.
