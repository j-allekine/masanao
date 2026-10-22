---
status: accepted
---

# Recipe reference boundary

Masanao treats a Recipe as an administrator-maintained, reusable template for
one food. It contains one or more existing Items with their usual quantities in
each Item's Base Unit or an exact Item-specific conversion, plus an optional
practical preparation note. A Recipe has no serving target, Meal Schedule,
Issuance Record, stock movement, nested Recipe, or meal-combo behavior.

Issuance later copies a selected Recipe into a Meal Schedule-specific Recipe
Snapshot, where staff record the actual operational quantities. This keeps the
Recipe library reusable while preventing a reference template from changing
stock or being mistaken for an event's issue record. Used Recipes are
deactivated rather than deleted; old snapshots remain identifiable.
