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

Pending. Results below will identify their exact source revision, commands,
outcomes and limits before this PR becomes ready for review.
