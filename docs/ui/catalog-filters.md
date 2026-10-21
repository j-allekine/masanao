# Catalog filter standard

Use `WorkspaceCatalogToolbar` for Inventory, Items, Recipes, Purchase Orders,
Activity Designs, Activities, and the Units, Categories, Offices and Vendors
catalogs. Each feature supplies its labels, available choices, values and
handlers. Features continue to own matching, URL state, permissions and paging.

- Search and filter dropdowns share one compact row above the results when the
  available toolbar width is at least 760px. Use the toolbar's available width,
  including the effect of the workspace sidebar, rather than screen width alone.
- Search appears first with the visible label Search and a search icon. Its
  accessible name retains the feature-specific description.
- A populated search has one keyboard-accessible Clear search control inside
  the input. Clearing keeps other filter selections and returns focus to search.
- Use `WorkspaceFilterField` for labeled selectors, with equal widths and the
  primitive's default control height. Inventory stock status uses the same
  dropdown presentation as Item lifecycle status. Retain colored stock badges
  in the results; these two statuses keep their separate domain meanings.
- Show one Reset action when additional filters are selected. It resets the
  feature's complete filter state and returns focus to search on desktop.
- When the toolbar cannot fit the controls, show search beside a Filters button
  with an active-filter count. Open the existing Sheet primitive with full-width
  labeled dropdowns. Changes apply immediately; Show results closes the panel.
  Reset filters clears the filters and closes the panel. Closing or Escape
  returns focus to the Filters trigger. Widening to desktop closes the panel
  and preserves selections in the inline controls.
- Search-only catalogs keep the same search layout without an empty Filters
  button. Create, Export and Refresh retain their existing action areas.
- Keep empty-result recovery beside the results. Search remains available when a
  catalog has no records. Do not add unsupported filters to fill the toolbar.
- Controls must be ready before accepting typing; never discard input during
  hydration. Preserve each feature's history, debounce and page-reset behavior.

Verify default, populated, combined, cleared and empty-result states at desktop,
intermediate and 320px widths. Check visible labels, equal control heights,
keyboard clearing, focus restoration and page overflow. Shared changes require
fresh evidence from every consuming catalog.
