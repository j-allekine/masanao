# Planning specification #238 — current verification

## Scope and starting point

Specification #238 and tickets #241–#245 reuse the implementation delivered by
merged PR #236, with the shared header from merged PR #235 and verification PR
#246. The starting application revision is
`4c39236148ecb9fdb75e1940ed4f27d200e1ca7e` (current main on 2026-10-19).
Earlier evidence in `docs/pr236-completion-verification-2026-10-17.md` remains
historical and is not a result of this run.

## Dependency graph

- #239 (closed) → #241 → #242 and #243.
- #239 (closed) → #244.
- #240 (closed), #242, #243 and #244 → #245.

Each open ticket receives an isolated verification branch/worktree. Existing
behavior is reused; only demonstrated gaps warrant implementation changes.
The final PR collects ticket evidence and any repairs. No merge of this PR,
schema/API changes, inventory changes or manual sample-data deletion is part
of this task.

## Current verification

Source verification on `13b0fe7` (application code identical to the starting
revision):

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Passed |
| `pnpm exec prisma generate --generator client --config prisma7.config.ts` | Passed |
| `pnpm test:run` | 433 tests passed in 62 files |
| `pnpm lint` | Passed |
| `pnpm test:architecture` | Both checks passed |
| `pnpm build` | Passed with isolated `.next-build-issue238` output |
| `pnpm exec tsc --noEmit` | Passed after build |

Raw logs: `C:/Users/LENOVO/.codex/issue-238-evidence/` (`install.log`,
`generate.log`, `unit.log`, `lint.log`, `architecture.log`, `build.log`,
`typecheck.log`). The build's generated tsconfig additions were restored after
type checking; they are not authored changes.

Ticket-specific browser verification and final review are pending.
