---
status: accepted
---

# Recipe baselines and Meal Schedule issuance quantities

Recipes describe reusable ingredient batches with explicit positive whole-number baseline pax; issuance scales a copied Recipe Snapshot without changing its master Recipe. Activity Planned pax supplies the initial issuance Meal pax, while Meal Schedule Planned servings is retired from the active planning workflow to avoid competing planning counts. Existing values must be handled safely during migration.

One Meal Schedule issuance includes Recipe demand and directly selected stock Items. Final stock requirements are combined by Item in Base Units; confirmed issued-quantity adjustments belong to this combined total rather than inventing allocations to individual dishes. Affected demand changes require explicitly resetting the adjustment first. Item-specific whole-quantity rules validate the combined total without guessing from Unit names or silently rounding counted Items.

Draft preparation never changes stock. Explicit posting checks availability and creates all stock-out movements together, once; kitchen staff and administrators can post. Posted issuance is immutable. Corrections, reversals, and returns are outside this release, despite the resulting lack of an in-app remedy for posting mistakes.

[ADR 0008](0008-fifo-receipt-allocation.md) extends posting with FIFO receipt allocations and labelled reconstruction of existing sample history. It preserves the combined-quantity and single-ledger boundaries established here.

Deliver through three module specifications: Recipe baseline setup and Item issuance-quantity policy may proceed independently; issuance depends on both and includes its associated Planning label/field transition. Prototype A guides hierarchy and interaction, not literal production code or illustrative data. The detailed decisions are recorded in [recipe-scaling-production-decisions.md](../recipe-scaling-production-decisions.md).
