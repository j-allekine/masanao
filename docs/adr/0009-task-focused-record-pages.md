---
status: accepted
---

# Task-focused record pages

Masanao record pages should expose the current task without requiring a second mostly empty overview page. A Meal Schedule has at most one Issuance Record, so preparation and posted review now share the Meal Schedule workspace. Existing issuance URLs redirect to that workspace. One record heading and status replace repeated Planning/Issuance headings and an intermediate Open issuance action.

For nested records, retain navigable breadcrumbs above the heading and omit a duplicate Back-to-parent action when the breadcrumb already provides that destination. Supporting planning information belongs in a named Meal details Sheet. Required working information, validation and consequential actions remain visible. Draft save is secondary; final posting is primary and still requires explicit confirmation. Breadcrumb navigation retains unsaved-change protection.

This is the preferred direction for future record-page work, not permission for a global redesign or a mandatory identical layout for every surface. Catalogs retain search, filters and pagination. Receiving retains Vendor/PO identity needed to verify the transaction. Editable creation flows may require a Back action describing their actual previous step. Essential quantities, warnings and identity must not be hidden merely to reduce visual density.

Live planning details and persisted posted evidence remain distinct. Meal details shows current planning information; the posted heading, quantities, actor/time and Record details use the saved posting evidence. A later planning edit cannot rewrite issuance history.

Adoption starts with Meal Schedule only. Features continue to own permissions, data, validation, mutations and navigation guards. Promote presentation into shared workspace components only when a second real consumer establishes the common interface. See [the record-page design guide](../record-page-design.md) for applicability and verification limits.

## 2026-10-16 refinement: shared foundation and quieter Planning records

User review found that the initial Meal details Sheet repeated identity already visible in breadcrumbs and the record heading. Adopt a shared workspace header across authenticated modules in one foundation PR, then apply the compact record patterns across all Planning in a separate dependent PR. Header presentation is universal; each feature still owns its fields, permissions, URLs and mutations.

For a small group of supporting fields, use an inline disclosure containing only meaningful information not already shown. Omit the control when no such values remain. AIP reference, Activity venue/budget/particulars and non-repeated Meal Office/Venue are examples; required task data and warnings remain visible. Keep larger Sheets/dialogs where their inspection/editing task justifies them, including ingredient and issued-Item inspection. This refines the earlier default Meal details Sheet choice rather than prohibiting Sheets system-wide.

Keep Design fiscal year and Activity date/Office/planned pax visible; put collection counts with their headings. Replace duplicate parent Back controls with actual breadcrumbs and retain known catalog return state through safe local targets. Do not use a help icon as a substitute for record metadata. Distinct live planning and immutable posting evidence retain explicit meaning when values differ.

The system-wide header foundation does not authorize a global page-body redesign. Later modules adopt the same visual language through task-specific scoped changes. See [Planning frontend standard](../specs/planning-frontend-standard.md) and [header foundation](../specs/workspace-header-standard.md).
