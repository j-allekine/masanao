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

## Initial verification before ticket integration

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

These initial checks precede the Item inspection repair and additional ticket
coverage. They remain historical evidence for that starting revision.

## Integrated verification

Tickets #241–#244 are integrated at
`5901b169fd11a7e1c779cdcafd8e1211bae2c3be`. Production repair `7d32498`
adds stable date ordering for supplemental reconstructed receipt
evidence and readable mobile quantity/Unit presentation. Explicit saved source
order, numeric values, posting and inventory contracts remain unchanged. Review
subsequently identified a valid long-Unit wrapping edge case, repaired in
`748de7d` and integrated at `4a8dfbdfe7740b82db585df92fb47dba38f5cf38`.
The integrated report separates the 98/100 broad browser result from the six
passing focused journeys, including both initially timed-out Recipe cases.
All 100 distinct scenarios have passing evidence across runs; this is not one
uninterrupted 100/100 result.

Final local source checks at `4a8dfbd` passed: 433 unit/integration tests across
62 files, source and changed-test lint, both architecture checks, TypeScript and
production build. Independent review's one long-Unit finding was repaired and
re-reviewed with no remaining findings. Manual sample data remains intact.

See the [integrated #245 report](verification/issue-245-2026-10-19.md) for exact
revisions, fresh check results, failures and corrections, screenshot review,
ticket evidence and remaining verification limits. Historical PR #235/#236
evidence and the earlier ADR decision have not been rewritten as current results.

The delivery is [PR #247](https://github.com/j-allekine/masanao/pull/247), based on
`main` after the original header and Planning PRs were merged by an authorized
actor. This task does not authorize merging it. Final independent review,
current-head repository CI and ready-for-review status are handled after the
evidence commit.
