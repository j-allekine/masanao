# Design QA: Activity Designs workspace

Date: 2026-09-01

## Source and implementation

- Source visual truth: `docs/mocks/act-design.png`
- Browser-rendered implementation: `docs/mocks/act-design-implementation.png`
- Full-view comparison input: `docs/mocks/act-design-comparison.png`
- Focused comparison input: `docs/mocks/act-design-comparison-focused.png`
- Route: `http://localhost:3000/activity-designs`

## Normalization and state

- Source pixels: 1536 x 1024
- Implementation pixels: 1536 x 1024
- CSS viewport: 1536 x 1024
- Device pixel ratio: 1.0000000149 (effectively 1x)
- Density normalization: none required; source and implementation dimensions match.
- Implementation state: authenticated Activity Designs page, default All fiscal-year filter, no selected rows, one live server-provided Activity Design.
- State difference: the source mock shows FY 2026, two selected rows, and five illustrative rows. The implementation intentionally preserves the existing server response and does not seed or invent records.

## Comparison evidence

### Full view

The side-by-side full view compares the complete 1536 x 1024 composition. Sidebar width, page header, toolbar alignment, planning tabs, action row, table surface, and pagination follow the source hierarchy and rhythm. The implementation uses the existing application tokens and shadcn primitives.

### Focused regions

The focused comparison crops the main content from x=248 through the right edge and y=0 through y=620. It was used to inspect the search/filter controls, tab proportions, action buttons, table header, row spacing, icon alignment, borders, radii, and disabled/active states at readable scale.

## Required fidelity surfaces

- Fonts and typography: the system now uses one Geist family for body and headings, with shared compact variants: body 15px, body-sm 13px, table/table-head 13px, label 11px, and mono 11px. Table headers use the stronger table-head weight while row data stays regular/medium.
- Spacing and layout rhythm: the 248px sidebar, 32px content inset, toolbar-to-tabs gap, tab widths, 68px table header, and row spacing were compared at the matched viewport.
- Colors and tokens: the deep green navigation, pale active surfaces, off-white controls, muted borders, and semantic text colors use the repository design tokens.
- Image quality and asset fidelity: the source uses iconography rather than photographic assets. Lucide icons and the existing avatar primitives provide the closest available icon treatment; no CSS art, emoji, or handcrafted inline SVG substitutes were introduced.
- Copy and content: page labels, planning workspace title, filter labels, actions, empty state, pagination copy, and accessibility labels are coherent in the standalone app.
- States and interactions: row selection/clear, create dialog opening, search filtering/empty state, filter clearing, and row action menu opening were exercised in the browser. A fresh page load at the matched route returned no console errors.
- Accessibility: semantic buttons, links, navigation, table roles, labeled checkboxes, disabled states, and visible focus treatment are present.

## Findings

No actionable P0, P1, or P2 visual findings remain.

Expected differences are limited to live data and interaction state: the untouched server currently returns one Activity Design and the default filter is All, while the source is a populated illustrative state. Meal Schedules displays `—` because the current server list contract does not expose a meal-schedule count; the UI does not fabricate one.

## Comparison history

1. Initial browser review identified a P2 toolbar proportion issue: the search control was narrower than the source at the target viewport.
2. Fixed the toolbar left group to use the available width while keeping the filter control adjacent.
3. Re-captured at 1536 x 1024 and compared again using the full-view and focused side-by-side inputs. The toolbar, tabs, action row, and table alignment now match the source structure. No P0, P1, or P2 findings remain.
4. Typography review identified an oversized mixed-family system layer. Unified body and heading text on Geist, moved application surfaces to the compact shared variants, reduced control/row heights, and recaptured at the same viewport. The table header now has stronger weight/contrast than the smaller data text. No P0, P1, or P2 findings remain.

## Implementation checklist

- [x] Matched desktop composition and existing design tokens.
- [x] Reused the existing server gateway, query, actions, authentication, and Prisma data without server-side changes.
- [x] Added client-only selection, filtering, pagination, and visual bulk-action states.
- [x] Verified the primary interactions in the in-app browser.
- [x] Ran lint, typecheck, route type generation, focused tests, and production build.
- [x] Captured matched-viewport comparison evidence.

## Follow-up polish

- If the product later needs the exact illustrated five-row state, add fixture data in a separate preview/test environment rather than changing the production server contract.
- If the product needs live Meal Schedule totals in this table, define that contract in a later server-side ticket.

final result: passed
