# Catalog filter standard

Use `WorkspaceCatalogToolbar` for Inventory, Items, Recipes, Purchase Orders,
Activity Designs, Activities, and the Units, Categories, Offices and Vendors
catalogs. Each feature supplies its labels, available choices, values and
handlers. Features continue to own matching, URL state, permissions and paging.

- Search appears first with a persistent visible label and a search icon.
- A populated search has one keyboard-accessible Clear search control inside
  the input. Clearing keeps other filter selections and returns focus to search.
- Additional filters sit together below search. Use `WorkspaceFilterField` for
  labeled selectors, with equal widths and the primitive's default control height.
- Short stock-status choices retain their colored toggle group and text labels.
  Active/Inactive lifecycle status remains a separate Item filter.
- Show one Clear filters action when additional filters are selected. It resets
  the feature's complete filter state and returns focus to search.
- On narrow screens, search and selectors use the available width. Short options
  wrap within their group. Clear actions keep their natural width.
- Keep empty-result recovery beside the results. Search remains available when a
  catalog has no records. Do not add unsupported filters to fill the toolbar.
- Controls must be ready before accepting typing; never discard input during
  hydration. Preserve each feature's history, debounce and page-reset behavior.

Verify default, populated, combined, cleared and empty-result states at desktop,
intermediate and 320px widths. Check visible labels, equal control heights,
keyboard clearing, focus restoration and page overflow. Shared changes require
fresh evidence from every consuming catalog.
