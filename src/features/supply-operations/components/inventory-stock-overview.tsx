import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { StockStatus } from "../domain/inventory";
import type { InventoryListItem } from "../types";

type RestockStatus = Extract<StockStatus, "out-of-stock" | "reorder-now">;

export default function InventoryStockOverview({ items, onFilter }: {
  items: InventoryListItem[];
  onFilter: (status: RestockStatus) => void;
}) {
  const counts = useMemo(() => {
    const totals: Record<StockStatus, number> = { good: 0, "out-of-stock": 0, "reorder-now": 0, "review-required": 0 };
    for (const { stockStatus } of items) totals[stockStatus] += 1;
    return totals;
  }, [items]);
  const outOfStock = counts["out-of-stock"];
  const reorderNow = counts["reorder-now"];
  const restock = outOfStock + reorderNow;
  const review = counts["review-required"];

  return (
    <section aria-labelledby="inventory-stock-overview" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="inventory-stock-overview" className="text-heading-3 font-semibold">Stock overview</h2>
        <p className="text-body-sm text-muted-foreground">All active items · Current stock</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.8fr)]">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Items tracked</CardDescription>
            <CardTitle><span className="text-heading-1 tabular-nums">{items.length}</span></CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Good stock</CardDescription>
            <CardTitle><span className="text-heading-1 tabular-nums text-success-foreground">{counts.good}</span></CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm" className="col-span-2 bg-warning-muted lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-warning-foreground">
              <span className="text-heading-1 tabular-nums">{restock}</span> {restock === 1 ? "needs restocking" : "need restocking"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={outOfStock === 0} onClick={() => onFilter("out-of-stock")}>
              {outOfStock} out of stock
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={reorderNow === 0} onClick={() => onFilter("reorder-now")}>
              {reorderNow} reorder now
            </Button>
          </CardContent>
        </Card>
      </div>
      {review > 0 && (
        <p className="text-body-sm text-muted-foreground">Review required for {review} {review === 1 ? "item" : "items"}.</p>
      )}
    </section>
  );
}
