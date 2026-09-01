# Frontend Change Playbook

Use this playbook for any visual, component, typography, token, layout, or
responsive change. It protects the existing server-side behavior while making
frontend changes reviewable and safe.

## 1. Establish the contract

Before editing:

1. Read the user's current request and every supplied screenshot or browser
   comment. Treat the current request as the scope authority.
2. Read `DESIGN.md`, `components.json`, the relevant feature or route, and the
   existing shadcn primitives used by that route.
3. For Next.js behavior, read the matching guide under
   `node_modules/next/dist/docs/`.
4. Record the target route, requested states, viewport, authentication state,
   and data state. Do not compare different states as if they were visual
   regressions.
5. Verify the repository root, branch, worktrees, and `git status`. Preserve
   unrelated user changes.

For a visual-only request, do not change domain rules, data access, Server
Actions, API contracts, authentication, or persistence unless the user expands
the scope.

## 2. Capture the baseline

Capture a fresh browser screenshot of the target before editing. Exercise the
interaction being changed when relevant, including loading, empty, validation,
error, open-menu, and dialog states.

Choose sentinel routes based on the surface being changed:

| Changed surface | Required browser evidence |
| --- | --- |
| Feature or page component | Target route at the affected viewport |
| Shared UI primitive or shared component | Target route plus every directly affected consumer |
| Workspace shell or navigation | `/overview` and `/activity-designs` |
| `globals.css`, root layout, fonts, or theme tokens | `/`, `/overview`, and `/activity-designs` |
| Responsive rules | Required routes at desktop and mobile widths |

Use the reference viewport when one is supplied. Otherwise use 1440 x 900 for
desktop and 390 x 844 for mobile. Add an intermediate viewport when the changed
layout has a breakpoint between them.

## 3. Classify the blast radius

Classify the proposed edit before making it:

- **Local:** a route or feature component. This is the default for page-specific
  feedback.
- **Shared:** a reusable component or shadcn primitive. Search for all consumers
  with `rg` and inspect each affected state.
- **Global:** root layout, global CSS, font loading, Tailwind theme variables, or
  application-wide tokens. Require explicit system-wide intent, a consumer
  inventory, and all global sentinel routes.

Make the smallest coherent change first. Verify it in the browser before
combining it with shell, token, typography, or component-library changes.

## 4. Protect the design-system namespaces

Tailwind v4 theme variables are executable configuration, not passive CSS.
Variables in namespaces such as `--spacing-*`, `--text-*`, `--radius-*`, and
`--font-*` generate or override utility classes.

Before adding or renaming a variable inside `@theme` or `@theme inline`:

1. Check Tailwind's namespace mapping.
2. Search the repository for the intended utility suffix and variable name.
3. Inspect generated CSS for representative utilities after the change.
4. Verify all global sentinel routes.

Do not use a Tailwind namespace when utility generation is not intended. Put
raw semantic CSS variables in `:root` with a non-Tailwind namespace such as
`--space-*` instead.

Known Masanao failure mode: defining `--spacing-sm`, `--spacing-md`,
`--spacing-lg`, or `--spacing-xl` in the Tailwind theme changes utilities such
as `max-w-sm`, `max-w-md`, `max-w-lg`, and `max-w-xl`. This can collapse content
to 8-24 pixels and produce word-by-word wrapping. Never accept those variable
names without checking generated utility output.

## 5. Use semantic typography roles

Load the application font family once with `next/font`. Keep font-family changes
global only when the user requests a system-wide font decision.

Use semantic roles rather than page-specific font sizes:

- page title
- section title
- body
- body small
- label
- table header
- table cell
- numeric or code data

Add a new role or component variant when a repeated hierarchy is missing. Do
not repurpose an existing global role to solve one screen.

For data tables, the header must be more prominent than the cells through a
deliberate combination of weight, contrast, tracking, or surface treatment.
Cell text should remain compact and readable. Verify the hierarchy with real
data, not only an empty or loading state.

## 6. Compose existing primitives

Use existing shadcn primitives and variants first. If a reusable variant is
missing, add it to the owning component instead of repeating long class strings
across pages. Review every consumer before changing a variant's default.

Keep component responsibilities cohesive:

- route files compose the page;
- feature components own feature presentation;
- shared components remain feature-independent;
- server and domain behavior remain outside presentational components.

## 7. Verify in short loops

After each coherent visual change:

1. Reload the target route in a real browser.
2. Compare it with the supplied reference or baseline.
3. Check wrapping, clipping, horizontal overflow, stacking, focus visibility,
   control hit areas, and text hierarchy.
4. Exercise the changed interaction and inspect the browser console.
5. Recheck the required sentinel routes before continuing.

For global or shared visual changes, add or update Playwright
`toHaveScreenshot()` coverage in a stable environment. Review the image diff;
do not approve a new baseline only because the test can be updated.

Also verify that user text-spacing overrides do not hide, clip, or overlap
content and that narrow layouts reflow without losing information or controls.

## 8. Run code checks

Run checks in proportion to the change:

- `pnpm lint` for component, import, or architecture changes.
- `pnpm exec tsc --noEmit` for TypeScript changes.
- Relevant Vitest and Playwright tests for changed behavior.
- `pnpm exec next typegen` after route-shape changes.
- `pnpm build` after changes to global CSS, root layout, fonts, shared
  primitives, routes, aliases, or server/client boundaries.
- `git diff --check` and a final scoped diff review.

Passing lint, tests, or a production build does not prove visual correctness.
Fresh browser evidence is required.

## 9. Completion gate

Do not call the frontend work complete until all are true:

- Every user-requested visual change maps to an implemented code change.
- The target route has a fresh after screenshot in the requested state.
- Required sentinel routes have fresh regression screenshots.
- No unintended wrapping, clipping, overflow, hidden controls, or broken
  interactions are visible.
- Typography and component variants are reused consistently where intended.
- Server-side behavior and data contracts are unchanged unless explicitly in
  scope.
- Required code checks pass, and the final diff contains only authorized work.

## Primary references

- [OpenAI: Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [Tailwind CSS: Theme variables](https://tailwindcss.com/docs/theme)
- [Next.js: CSS](https://nextjs.org/docs/app/getting-started/css)
- [Next.js: Font optimization](https://nextjs.org/docs/app/api-reference/components/font)
- [shadcn/ui: Theming](https://ui.shadcn.com/docs/theming)
- [Playwright: Visual comparisons](https://playwright.dev/docs/test-snapshots)
- [W3C: Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
- [W3C: Text spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html)
