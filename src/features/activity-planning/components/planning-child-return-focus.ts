"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

/** Focus only an authorized filtered row, or a collection's known fallback. */
export function usePlanningChildReturnFocus(prefix: string, rows: readonly { id: string }[], page: number, pageSize: number, fallbackId: string, selectPage: (page: number) => void, enabled = true) {
  const query = useSearchParams().toString();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    function restoreFocus() {
      if (new URLSearchParams(window.location.search).toString() !== query) return;
      const hash = window.location.hash.slice(1);
      if (!hash.startsWith(prefix) && hash !== fallbackId) { handled.current = null; return; }
      if (handled.current === hash) return;
      const index = rows.findIndex(row => `${prefix}${row.id}` === hash);
      const targetPage = index < 0 ? page : Math.floor(index / pageSize) + 1;
      if (targetPage !== page) { selectPage(targetPage); return; }
      const target = document.getElementById(index < 0 ? fallbackId : hash);
      if (!target) return;
      handled.current = hash;
      target.focus();
      target.scrollIntoView({ block: "center" });
    }
    restoreFocus();
    window.addEventListener("hashchange", restoreFocus);
    window.addEventListener("popstate", restoreFocus);
    return () => {
      window.removeEventListener("hashchange", restoreFocus);
      window.removeEventListener("popstate", restoreFocus);
    };
  }, [prefix, rows, page, pageSize, fallbackId, selectPage, enabled, query]);
}
