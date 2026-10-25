"use client";

import { useEffect, useState } from "react";

/** Reveal only an explicitly requested creation, once its result page renders. */
export function useCreatedRecordFocus(
  visibleRecords: readonly { id: string }[],
  targetSelector: (id: string) => string,
) {
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingId || !visibleRecords.some((record) => record.id === pendingId)) return;

    const timeout = window.setTimeout(() => {
      const target = Array.from(document.querySelectorAll<HTMLElement>(targetSelector(pendingId)))
        .find((element) => element.getClientRects().length > 0);
      if (!target) return;
      target.scrollIntoView({ block: "center" });
      target.focus({ preventScroll: true });
      setPendingId(null);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [targetSelector, pendingId, visibleRecords]);

  return setPendingId;
}
