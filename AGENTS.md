<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Frontend component policy

- Read `components.json` before modifying the component layer.
- Before creating UI, inspect `components/ui` for existing primitives.
- Use existing shadcn primitives for buttons, inputs, fields, dialogs, menus, and other controls.
- If a required primitive is missing, add it through the shadcn CLI.
- Do not recreate shadcn primitives with native elements and custom CSS.
- Custom visual designs must compose shadcn primitives. Page-specific CSS is allowed for layout, spacing, surfaces, and branding.
- Native controls are allowed only inside shadcn primitive implementations or when an explicit exception is documented.
- Invoke the installed `shadcn` skill for component work.
- Invoke the installed Vercel React best-practices skill for React/Next.js work when relevant.
