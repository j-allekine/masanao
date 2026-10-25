"use client";

import { useEffect, useState } from "react";
import { readPurchaseOrderDeliverySummariesAction } from "../actions";
import type { PurchaseOrderListItem } from "../types";
import type { PurchaseOrderDeliverySummary } from "../domain/purchase-order-delivery-summary";

export function usePurchaseOrderDeliverySummaries(records: PurchaseOrderListItem[], snapshot: PurchaseOrderListItem[]) {
  const key = JSON.stringify(records.filter((record) => record.deliverySummary === null).map((record) => record.id));
  const [result, setResult] = useState<{
    key: string;
    snapshot: PurchaseOrderListItem[];
    summaries: { id: string; deliverySummary: PurchaseOrderDeliverySummary }[];
    unavailable: boolean;
  } | null>(null);

  useEffect(() => {
    const ids: string[] = JSON.parse(key);
    if (!ids.length) return;
    let active = true;
    void readPurchaseOrderDeliverySummariesAction(ids).then((response) => {
      if (!active) return;
      setResult({ key, snapshot, summaries: response.ok ? response.summaries : [], unavailable: !response.ok || response.summaries.length !== ids.length });
    }).catch(() => {
      if (active) setResult({ key, snapshot, summaries: [], unavailable: true });
    });
    return () => { active = false; };
  }, [key, snapshot]);

  const current = result?.key === key && result.snapshot === snapshot ? result : null;
  return {
    records: records.map((record) => record.deliverySummary !== null ? record : {
      ...record,
      deliverySummary: current?.summaries.find((summary) => summary.id === record.id)?.deliverySummary ?? null,
    }),
    amountsUnavailable: current?.unavailable ?? false,
  };
}
