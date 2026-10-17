## Problem Statement

Staff see independently built headers across Masanao. Sidebar access, spacing, titles and loading/error orientation drift between modules. Some editors lack the same orientation, and the Meal Schedule once repeated its sidebar toggle inside breadcrumbs. This makes the system feel inconsistent.

## Solution

Use one shared workspace header throughout authenticated production pages. Keep familiar sidebar access and a clear workspace title above each page's task. Let each module retain its own record identity, actions and working layout. Deliver this foundation separately from the Planning page-body cleanup.

## User Stories

1. As a staff member, I want the same header layout across workspaces, so that I can orient myself without relearning each page.
2. As a staff member, I want a clearly named sidebar toggle, so that I can open navigation with a pointer or keyboard.
3. As a mobile staff member, I want the header to fit narrow screens, so that navigation remains reachable without horizontal page scrolling.
4. As a staff member, I want a clear workspace title, so that I know which operational area I am using.
5. As a staff member, I want record identity below the header, so that I can distinguish my workspace from my current task.
6. As a staff member opening a Recipe editor, I want familiar workspace orientation, so that entering an editor does not remove navigation.
7. As a staff member preparing issuance, I want its actions reachable below the header, so that consistent chrome does not obstruct work.
8. As a staff member waiting for a page, I want the loading view to retain workspace orientation, so that I know where I am.
9. As a staff member recovering from a page error, I want familiar orientation and recovery controls, so that I can continue confidently.
10. As a keyboard user, I want Escape to dismiss mobile navigation and restore focus, so that I can resume the page.
11. As a keyboard user with collapsed desktop navigation, I want readable navigation tooltips, so that icons remain understandable.
12. As a staff member moving between modules, I want my permissions, forms and records preserved, so that visual consistency does not change operational behavior.

## Implementation Decisions

- Introduce one feature-independent WorkspaceHeader composing the existing shadcn sidebar trigger and separator, with a title and optional description/action content.
- The shared component owns header appearance, responsive wrapping and interaction chrome. Features own copy, data, permissions, record identity and actions; the component does not fetch data or infer routes.
- Adopt across Overview, Planning catalogs and records, Items, Recipe catalog/detail/create/edit, Purchase Order catalog/detail and receiving background, Master Data, and shared loading/error views.
- Display Planning, Supply Operations, Master Data or Overview according to the current module. Loading/error display mapping matches ready views. This does not rename navigation or domain concepts.
- Keep the existing semantic design tokens, 64px minimum header height and responsive gutters. Workspace orientation is not an additional page h1.
- Use one header sidebar toggle per page. Do not repeat it in breadcrumbs or inject an automatic second header from the shell.
- Omit routine header subtitles; retain the optional description slot for genuinely useful orientation. Actions remain caller-supplied.
- Keep existing page bodies. Allow Meal Schedule draft/posted content to fill the remaining viewport and preserve reachable actions.
- Disable sidebar tooltips when expanded or on mobile, preserving collapsed-desktop keyboard tooltips and mobile Sheet dismissal.
- Preserve the single Next.js application, existing architecture boundaries, authorization, URLs and domain workflows. No schema or API changes.

## Testing Decisions

- The user confirmed real browser journeys as the primary verification boundary. Assert visible orientation, navigation and focus behavior rather than internal component structure.
- Exercise authenticated route families at desktop and 320px, including catalogs, records, Recipe editors, receiving background, Meal Schedule draft/posted states and Master Data.
- Check a single visible header/toggle, readable wrapping, no header-induced page overflow and reachable task actions. Preserve existing heading semantics; do not invent a new main heading for untouched bodies.
- Exercise mobile navigation opening, Escape dismissal and focus return, plus collapsed-desktop keyboard tooltips.
- Use existing shared loading/error rendering tests to verify title mapping and retained recovery content.
- Reuse existing workspace-shell, header, Planning, issuance and catalog browser journeys. Review intentional visual baseline changes individually.
- Retain domain regression coverage. Run source/changed-test lint, architecture checks, TypeScript and a production build for route/composition changes.
- Use isolated browser databases and build outputs. Preserve manual sample records. Automated checks and screenshots do not establish complete accessibility conformance or staff usability.

## Out of Scope

- Global redesign of page bodies, record fields, tables, forms, filters or dialogs.
- Sidebar destination changes, global palette/typeface/token changes, or a generic page/CRUD framework.
- Login, API routes and isolated prototypes.
- Permissions, inventory movements, FIFO, receiving/posting semantics, validation or database changes.
- Automatic merger of the linked PR or its dependent Planning PR.

## Further Notes

- This is specification 1 of 2. Specification 2 applies the quieter information hierarchy across Planning and depends on this header foundation.
- Existing implementation: [PR #235](https://github.com/j-allekine/masanao/pull/235), still open when this specification was rewritten on 2026-10-17. The issue records agreed scope; it is not a request to reimplement completed changes.
- Prior evidence: 425 unit/integration tests; lint, architecture, TypeScript and production build passed. All 89 unique browser scenarios have passing evidence across a full run and focused corrections, rather than one uninterrupted 89/89 run. The dependent Planning branch subsequently passed a 90-test full browser run including the header journeys.
- Recheck the current PR revision and required CI before merging. Preserve prior research and the accepted ADR refinement. No merge is authorized by this spec rewrite.

- Tracking specification: [#237](https://github.com/j-allekine/masanao/issues/237). Dependent Planning specification: [#238](https://github.com/j-allekine/masanao/issues/238).
