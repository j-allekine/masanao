<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Frontend implementation policy

### UI system

- Before modifying the component layer, read `./components.json`.
- Before creating UI, inspect the shadcn UI directory configured in `./components.json` for existing primitives.
- Prefer existing shadcn/ui primitives for buttons, inputs, fields, dialogs, menus, and other controls.
- If a required primitive is missing, add it through the shadcn CLI using the project's package manager.
- Review generated component files after adding them.
- Custom page designs must compose shadcn/ui primitives.
- Use existing component variants and semantic design tokens.
- Page-specific CSS may handle layout, spacing, surfaces, and branding.
- Do not recreate shadcn/ui controls with native elements and custom CSS.
- Native HTML is allowed for semantic structure or when no suitable primitive exists; document exceptions.
- Invoke the installed `shadcn` skill for component work.

### React / Next.js

- Follow the existing React and Next.js architecture before introducing new patterns.
- For Next.js changes, read the relevant guide under `./node_modules/next/dist/docs/`.
- Keep domain rules, data access, and mutations outside presentational components.
- Invoke the installed Vercel React best-practices skill for meaningful React/Next.js work.

## Application architecture

[GitHub issue #21](https://github.com/j-allekine/masanao/issues/21) is the
canonical architecture specification. Masanao remains one Next.js application.
Do not split it into separate frontend and backend apps.

Use `CONTEXT.md` as the source of truth for Masanao's domain terminology.

Issue #21 moves authored application code under `src`. Until that migration is
complete, preserve existing behavior and move only code that is in scope for the
current change.

### Dependency rules

- App code may import app code, feature public gateways, and shared code.
- A feature may import its own internals and shared code.
- Shared code may import only shared code.
- Cross-feature imports are forbidden.
- App code imports a feature only through `ui.ts`, `actions.ts`, or `server.ts`.
- App code must not deep-import feature schemas, commands, queries, policies,
  domain rules, or database modules.
- Shared code must not become a bridge between features.
- Never disable an ESLint architecture rule to make a change pass.

### Placement

- `src/app`: routes, layouts, Route Handlers, global styles, application shell,
  and page composition.
- `src/features/<feature>/components`: feature-owned UI.
- `src/features/<feature>/schemas`: input validation and normalization.
- `src/features/<feature>/server/actions`: Server Action adapters.
- `src/features/<feature>/server/commands`: mutation workflows.
- `src/features/<feature>/server/queries`: public reads.
- `src/features/<feature>/server/policies`: feature authorization when needed.
- `src/features/<feature>/server/db`: feature-owned Prisma access.
- `src/features/<feature>/domain`: pure reusable feature rules when needed.
- `src/components`: generic UI, including shadcn primitives.
- `src/hooks`: feature-independent hooks.
- `src/lib`: universal utilities.
- `src/server`: shared server-only infrastructure such as authentication,
  sessions, and current-actor lookup.
- `src/prisma`: the combined Prisma schema, migrations, generated client, and
  configured client.

Create only folders that contain real code. Do not invent services,
repositories, mappers, event buses, or other architectural layers without an
explicit repository decision.

### Data flows

Internal UI mutations follow:

`Server Action -> current actor -> schema -> command -> policy/domain rule when needed -> feature DB -> Prisma`

Public reads follow:

`App Server Component -> feature server.ts -> query -> policy when needed -> feature DB -> safe return data`

Shared authentication determines who the actor is. Each feature decides what
that actor may do. Internal UI mutations use feature-owned Server Actions.
Route Handlers are for framework-required HTTP endpoints, webhooks, external
integrations, or intentional programmatic APIs; they call the feature through
`server.ts`.

Only feature `server/db` modules and approved shared server infrastructure may
use the configured Prisma client. UI, app pages, Route Handlers, actions,
commands, and queries must not import Prisma directly.

If a requested change cannot fit these boundaries, stop and report the
architectural conflict. Do not work around it in app or shared code.

### Verification

- Run `pnpm lint` after changing architecture or imports.
- Run relevant type checks and tests for changed behavior.
- Run the production build when changing routes, aliases, server/client
  boundaries, Prisma generation, or the `src` layout.
- Validate and regenerate Prisma when its schema or location changes.
