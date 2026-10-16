# Shared workspace header foundation

Status: implementation. First of two PRs: universal header foundation, then [Planning cleanup](planning-frontend-standard.md). Research: [frontend standard](../research/frontend-standard-research-2026-10-16.md).

## Scope and ownership

Every authenticated workspace uses `src/components/workspace/workspace-header.tsx`: Overview; Planning catalogs and Design/Activity/Meal records; Items; Recipe catalog/detail/create/edit; Purchase Order catalog/detail and its receiving background; Master Data; shared loading/error states. Login, API routes and isolated prototypes retain their own presentation.

The component owns the SidebarTrigger, decorative Separator, semantic heading appearance, responsive wrapping, spacing and optional description/action slots. Callers own title/copy, actions, data, permissions and route/record identity. It does not infer the route, fetch data or inject itself automatically from WorkspaceShell.

Planning title is `Planning`; supply modules use `Supply Operations`; Master Data uses `Master Data`; Overview uses `Overview`. `getWorkspaceHeaderTitle` supplies the same display mapping for shared loading/error views. This is presentation terminology, not a sidebar/navigation or domain rename.

Use the existing 64px minimum height, gutters and type roles; allow wrapping rather than truncating important content. The title is orientation text, not a second page h1. Pages keep one main task/record heading and existing bodies. Routine header subtitles are omitted. The universal component is the only workspace owner of SidebarTrigger; the breadcrumb row does not repeat it.

Meal Schedule's draft/posted body fills the viewport remaining below the shared header, preserving action reachability. Recipe editors gain the same workspace orientation as their catalog/detail pages. The shared shell itself does not change.

## Compatibility and verification

- Preserve all domain rules, permissions, body content, URL/filter state, dialogs and mutations.
- Shared loading/error views retain their recovery/loading content and match ready-state orientation.
- Verify every listed route family at desktop and 320px, one header/toggle/h1, no header overflow, and keyboard mobile sidebar open/close/focus return.
- Exercise draft/posted Meal Schedule and representative catalogs, records, editors and receiving; retain existing login and posting regression coverage.
- Review expected visual-baseline changes individually; do not use broad snapshot refresh to hide unrelated differences.
- Run lint, architecture checks, relevant unit/browser tests, typecheck and production build; record exact results in the PR.

The second PR removes redundant Planning context cards/copy, improves optional details and posted Item inspection. It does not reimplement or fork this header. Later module cleanup PRs reuse the same presentation boundaries.
