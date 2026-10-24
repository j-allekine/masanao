import { describe, expect, it, vi } from "vitest";
import { createInventoryNavigation } from "../src/features/supply-operations/components/inventory-navigation";
import type { InventoryListItem } from "../src/features/supply-operations/types";

const rows: InventoryListItem[] = Array.from({ length: 25 }, (_, index) => ({
  id: String(index), name: `Rice ${index}`, category: { id: "pantry", name: "Pantry" },
  baseUnit: { id: "kg", name: "Kilogram", abbreviation: "kg" }, reorderLevel: "1",
  balance: { kind: "valid", quantity: "1.000000000000000001" }, stockStatus: "good",
}));

function setup(query = "") {
  const history: { query: string; replace: boolean }[] = [];
  const refresh = vi.fn();
  const navigation = createInventoryNavigation(rows, query, {
    refresh,
    writeHistory: (edit) => history.push(edit),
  });
  return { navigation, history, refresh };
}

describe("Inventory navigation lifecycle", () => {
  it("keeps input and export query immediate while deferring history until fresh stock arrives", () => {
    const { navigation, history, refresh } = setup("other=keep");
    navigation.refresh();
    navigation.navigate({ search: " Rice ", page: 1 }, true);
    navigation.navigate({ categoryId: "pantry", page: 1 });
    navigation.navigate({ page: 2 });
    const pending = navigation.getSnapshot();
    expect(pending).toMatchObject({ refreshing: true, hasFilters: true, state: { search: " Rice ", categoryId: "pantry", page: 2 } });
    expect(pending.pagination.rows).toEqual(rows.slice(10, 20));
    expect(new URLSearchParams(pending.currentQuery).get("other")).toBe("keep");
    expect(history).toEqual([]);
    expect(refresh).toHaveBeenCalledTimes(1);

    // A URL notification with the same stock snapshot is not completion.
    navigation.receive(rows, "other=keep");
    expect(navigation.getSnapshot()).toEqual(pending);
    expect(history).toEqual([]);

    navigation.receive([...rows], "other=keep");
    expect(navigation.getSnapshot()).toMatchObject({ refreshing: false, currentQuery: pending.currentQuery });
    expect(history).toEqual([
      { query: "other=keep&q=+Rice+", replace: true },
      { query: "other=keep&q=+Rice+&category=pantry", replace: false },
      { query: "other=keep&q=+Rice+&category=pantry&page=2", replace: false },
    ]);
    navigation.receive([...rows], pending.currentQuery);
    expect(history).toHaveLength(3);
  });

  it("discards queued edits on history restore and accepts subsequent typing", () => {
    const { navigation, history } = setup("category=pantry");
    navigation.refresh();
    navigation.navigate({ search: "discard me" }, true);
    navigation.restore("q=Rice&page=2");
    expect(navigation.getSnapshot()).toMatchObject({ state: { search: "Rice", categoryId: "", page: 2 } });
    navigation.refresh();
    navigation.navigate({ search: "Rice 1", page: 1 }, true);
    navigation.receive([...rows], "q=Rice&page=2");
    expect(history).toEqual([{ query: "q=Rice+1", replace: true }]);
    expect(navigation.getSnapshot()).toMatchObject({ refreshing: false, state: { search: "Rice 1", page: 1 } });
  });

  it("uses the restored URL when a refresh completes without new edits", () => {
    const { navigation, history } = setup();
    navigation.refresh();
    navigation.navigate({ categoryId: "pantry" });
    navigation.restore("q=Rice&page=2");
    navigation.receive([...rows], "q=Rice&page=2");
    expect(history).toEqual([]);
    expect(navigation.getSnapshot()).toMatchObject({ refreshing: false, currentQuery: "q=Rice&page=2" });
  });

  it("adopts sidebar query changes without treating them as a completed refresh", () => {
    const { navigation, history } = setup("q=Rice&category=pantry&page=2");
    navigation.refresh();
    navigation.receive(rows, "");
    expect(navigation.getSnapshot()).toMatchObject({ currentQuery: "", hasFilters: false, refreshing: true, state: { page: 1 } });
    navigation.receive([...rows], "");
    expect(navigation.getSnapshot().refreshing).toBe(false);
    expect(history).toEqual([]);
  });

  it("replaces a page made invalid by fresh stock after releasing pending history", () => {
    const { navigation, history } = setup("q=Rice&category=pantry&status=good&other=keep");
    navigation.refresh();
    navigation.navigate({ page: 3 });
    navigation.receive(rows.slice(0, 12), "q=Rice&category=pantry&status=good&other=keep");
    expect(navigation.getSnapshot().pagination).toMatchObject({ page: 2, total: 12, rows: rows.slice(10, 12) });
    expect(history).toEqual([
      { query: "q=Rice&category=pantry&status=good&other=keep&page=3", replace: false },
      { query: "q=Rice&category=pantry&status=good&other=keep&page=2", replace: true },
    ]);
    navigation.refresh();
    navigation.receive([], history.at(-1)!.query);
    expect(navigation.getSnapshot().pagination).toMatchObject({ page: 1, rows: [], total: 0 });
    expect(history.at(-1)).toEqual({ query: "q=Rice&category=pantry&status=good&other=keep", replace: true });
  });

  it("defers initial page correction until the entry refresh supplies fresh stock", () => {
    const { navigation, history } = setup("q=Rice&page=999");
    const serverSnapshot = navigation.getServerSnapshot();
    expect(history).toEqual([]);
    expect(serverSnapshot.pagination.page).toBe(3);
    navigation.refresh();
    navigation.receive(rows, "q=Rice&page=999");
    expect(history).toEqual([]);
    expect(navigation.getSnapshot()).toMatchObject({ refreshing: true, currentQuery: "q=Rice&page=3" });
    navigation.receive([...rows], "q=Rice&page=999");
    expect(history).toEqual([{ query: "q=Rice&page=3", replace: true }]);
    expect(navigation.getServerSnapshot()).toBe(serverSnapshot);
    expect(navigation.getSnapshot().currentQuery).toBe("q=Rice&page=3");
  });

  it("publishes one coherent view for combined filter clearing and stops notifying unsubscribed consumers", () => {
    const { navigation, history } = setup("q=Rice&category=pantry&status=good&page=2&other=keep");
    const observed: ReturnType<typeof navigation.getSnapshot>[] = [];
    const unsubscribe = navigation.subscribe(() => observed.push(navigation.getSnapshot()));
    navigation.navigate({ search: "", categoryId: "", stockStatus: "", page: 1 });
    expect(observed).toHaveLength(1);
    expect(observed[0]).toMatchObject({ currentQuery: "other=keep", hasFilters: false, pagination: { page: 1, total: 25 } });
    expect(observed[0].pagination.rows[0].balance).toEqual(rows[0].balance);
    expect(history).toEqual([{ query: "other=keep", replace: false }]);
    expect(navigation.getSnapshot()).toBe(observed[0]);
    unsubscribe();
    navigation.refresh();
    expect(observed).toHaveLength(1);
  });
});
