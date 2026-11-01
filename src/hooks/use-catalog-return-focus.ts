"use client";

import { useEffect, useRef, useState } from "react";

/** Focus a visible authorized result only after its feature has restored the URL. */
export function useCatalogReturnFocus({ records, prefix, fallbackId, query, enabled = true }: {
  records: readonly { id: string }[];
  prefix: string;
  fallbackId: string;
  query: string;
  enabled?: boolean;
}) {
  const consumed = useRef<string | null>(null);
  const [navigation, setNavigation] = useState(0);

  useEffect(() => {
    function revisit() {
      consumed.current = null;
      setNavigation((value) => value + 1);
    }
    window.addEventListener("hashchange", revisit);
    window.addEventListener("popstate", revisit);
    return () => {
      window.removeEventListener("hashchange", revisit);
      window.removeEventListener("popstate", revisit);
    };
  }, []);

  useEffect(() => {
    const renderedQuery = new URLSearchParams(query).toString();
    if (!enabled || new URLSearchParams(window.location.search).toString() !== renderedQuery) return;
    const hash = window.location.hash;
    if (!hash.startsWith(`#${prefix}`)) {
      consumed.current = null;
      return;
    }
    const pathname = window.location.pathname;
    const request = `${pathname}?${renderedQuery}${hash}`;
    if (consumed.current === request) return;
    let id: string | null = null;
    try { id = decodeURIComponent(hash.slice(prefix.length + 1)); } catch { /* Unknown target uses search. */ }
    const record = records.find((candidate) => candidate.id === id);
    const frame = window.requestAnimationFrame(() => {
      if (window.location.pathname !== pathname || new URLSearchParams(window.location.search).toString() !== renderedQuery || window.location.hash !== hash) return;
      const target = document.getElementById(record ? `${prefix}${record.id}` : fallbackId);
      if (!target?.getClientRects().length || target.matches(":disabled")) return;
      target.scrollIntoView({ block: "center" });
      target.focus({ preventScroll: true });
      consumed.current = request;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [records, prefix, fallbackId, query, enabled, navigation]);
}
