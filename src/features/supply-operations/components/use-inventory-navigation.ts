"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { InventoryListItem } from "../types";
import { createInventoryNavigation } from "./inventory-navigation";

const subscribeHydration = () => () => {};

export function useInventoryNavigation(items: InventoryListItem[]) {
  const router = useRouter();
  const initialQuery = useSearchParams().toString();
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const [navigation] = useState(() => createInventoryNavigation(items, initialQuery, {
    refresh: () => router.refresh(),
    writeHistory: ({ query, replace }) => {
      window.history[replace ? "replaceState" : "pushState"](null, "", `/inventory${query ? `?${query}` : ""}`);
    },
  }));
  const view = useSyncExternalStore(navigation.subscribe, navigation.getSnapshot, navigation.getServerSnapshot);

  useEffect(() => {
    function refreshInventory() {
      if (window.location.pathname === "/inventory") navigation.refresh();
    }
    let restoreFrame: number | undefined;
    function refreshAfterRestore() {
      if (window.location.pathname !== "/inventory") return;
      navigation.restore(window.location.search.slice(1));
      if (restoreFrame !== undefined) window.cancelAnimationFrame(restoreFrame);
      // Next restores its cached tree on this event. Request fresh stock after
      // that restoration, so the cached tree cannot replace the fresh request.
      restoreFrame = window.requestAnimationFrame(refreshInventory);
    }
    function restorePage(event: PageTransitionEvent) {
      if (event.persisted) refreshAfterRestore();
    }
    refreshInventory();
    window.addEventListener("popstate", refreshAfterRestore);
    window.addEventListener("pageshow", restorePage);
    return () => {
      if (restoreFrame !== undefined) window.cancelAnimationFrame(restoreFrame);
      window.removeEventListener("popstate", refreshAfterRestore);
      window.removeEventListener("pageshow", restorePage);
    };
  }, [navigation]);

  // Start the entry refresh before synchronizing/canonicalizing its query.
  // Otherwise an invalid initial page writes history while Next is still
  // entering the route, which can interrupt an already-open Filters dialog.
  useEffect(() => {
    if (window.location.pathname === "/inventory") {
      navigation.receive(items, window.location.search.slice(1));
    }
  }, [navigation, items, initialQuery]);

  return { ...view, hydrated, navigate: navigation.navigate, requestRefresh: navigation.refresh };
}
