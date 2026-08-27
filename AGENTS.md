<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Frontend implementation policy

### UI system

- Before modifying the component layer, read `./components.json`.
- Before creating UI, inspect `./components/ui/` for existing primitives.
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
