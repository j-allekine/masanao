---
status: accepted
---

# Task-focused record pages

Masanao record pages should expose the current task without requiring a second mostly empty overview page. A Meal Schedule has at most one Issuance Record, so preparation and posted review now share the Meal Schedule workspace. Existing issuance URLs redirect to that workspace. One record heading and status replace repeated Planning/Issuance headings and an intermediate Open issuance action.

For nested records, retain navigable breadcrumbs above the heading and omit a duplicate Back-to-parent action when the breadcrumb already provides that destination. Supporting planning information belongs in a named Meal details Sheet. Required working information, validation and consequential actions remain visible. Draft save is secondary; final posting is primary and still requires explicit confirmation. Breadcrumb navigation retains unsaved-change protection.

This is the preferred direction for future record-page work, not permission for a global redesign or a mandatory identical layout for every surface. Catalogs retain search, filters and pagination. Receiving retains Vendor/PO identity needed to verify the transaction. Editable creation flows may require a Back action describing their actual previous step. Essential quantities, warnings and identity must not be hidden merely to reduce visual density.

Live planning details and persisted posted evidence remain distinct. Meal details shows current planning information; the posted heading, quantities, actor/time and Record details use the saved posting evidence. A later planning edit cannot rewrite issuance history.

Adoption starts with Meal Schedule only. Features continue to own permissions, data, validation, mutations and navigation guards. Promote presentation into shared workspace components only when a second real consumer establishes the common interface. See [the record-page design guide](../record-page-design.md) for applicability and verification limits.
