import type { InventoryListItem } from "../types";
import { filterInventory, getInventoryListQuery, getInventoryListState, paginateInventory, type InventoryListState } from "../domain/inventory-list-state";

type HistoryEdit = { query: string; replace: boolean };
type NavigationEffects = {
  refresh: () => void;
  writeHistory: (edit: HistoryEdit) => void;
};

/** Owns Inventory's query, stock snapshot and history ordering together.
 * Browser effects are supplied by the hook; tests exercise this same module
 * with recorded history and explicitly delivered stock snapshots.
 */
export function createInventoryNavigation(initialItems: InventoryListItem[], initialQuery: string, effects: NavigationEffects) {
  let items = initialItems;
  let query = initialQuery;
  let refreshing = false;
  let pendingHistory: HistoryEdit[] = [];
  const listeners = new Set<() => void>();

  function readView() {
    const state = getInventoryListState(new URLSearchParams(query));
    return {
      currentQuery: query,
      state,
      pagination: paginateInventory(filterInventory(items, state), state.page),
      hasFilters: Boolean(state.search.trim() || state.categoryId || state.stockStatus),
      refreshing,
    };
  }
  let snapshot = readView();
  const serverSnapshot = snapshot;

  function publish() {
    snapshot = readView();
    listeners.forEach((listener) => listener());
  }

  function writeHistory(edit: HistoryEdit) {
    // Native history during an RSC refresh can suspend urgent input commits.
    if (refreshing) pendingHistory.push(edit);
    else effects.writeHistory(edit);
  }

  function canonicalQuery() {
    const { pagination } = readView();
    return getInventoryListQuery(query, { page: pagination.page });
  }

  function canonicalizePage() {
    const canonical = canonicalQuery();
    if (new URLSearchParams(query).has("page") && canonical !== query) {
      query = canonical;
      writeHistory({ query, replace: true });
    }
  }

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    navigate(updates: Partial<InventoryListState>, replace = false) {
      query = getInventoryListQuery(query, updates);
      query = canonicalQuery();
      writeHistory({ query, replace });
      publish();
    },
    refresh() {
      refreshing = true;
      publish();
      effects.refresh();
    },
    receive(nextItems: InventoryListItem[], browserQuery: string) {
      const snapshotArrived = items !== nextItems;
      items = nextItems;
      // URL-only updates must not replace input entered during a refresh.
      if (!pendingHistory.length) query = browserQuery;
      // Router transitions can settle before their RSC snapshot is committed.
      // Only a new server-owned snapshot ends the refresh and releases history.
      if (snapshotArrived) {
        refreshing = false;
        const edits = pendingHistory;
        pendingHistory = [];
        edits.forEach(effects.writeHistory);
      }
      canonicalizePage();
      publish();
    },
    restore(browserQuery: string) {
      // Back/forward supersedes edits queued against the previous history entry.
      pendingHistory = [];
      query = browserQuery;
      canonicalizePage();
      publish();
    },
  };
}
