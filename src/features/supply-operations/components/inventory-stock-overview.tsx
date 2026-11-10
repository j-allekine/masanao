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

  return (
    <section aria-labelledby="inventory-stock-overview" className="@container flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="inventory-stock-overview" className="text-heading-3 font-semibold">Stock overview</h2>
        <p className="text-body-sm text-muted-foreground">All active items · Current stock</p>
      </div>
      <div className="grid grid-cols-2 gap-2 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2.8fr)]">
        <Card size="sm" className="justify-center py-1.5">
          <CardHeader className="flex items-baseline justify-between gap-2 px-2.5">
            <CardDescription className="text-label @sm:text-body-sm">Items tracked</CardDescription>
            <CardTitle><span className="text-heading-3 tabular-nums">{items.length}</span></CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm" className="justify-center py-1.5">
          <CardHeader className="flex items-baseline justify-between gap-2 px-2.5">
            <CardDescription className="text-label @sm:text-body-sm">Good stock</CardDescription>
            <CardTitle><span className="text-heading-3 tabular-nums text-success-foreground">{counts.good}</span></CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm" className="col-span-2 bg-warning-muted py-1.5 @2xl:col-span-1">
          <CardContent className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-2.5">
            <CardTitle className="text-warning-foreground">
              <span className="text-heading-3 tabular-nums">{restock}</span> {restock === 1 ? "needs restocking" : "need restocking"}
            </CardTitle>
            <div className="flex flex-wrap gap-1.5">
              <Button type="button" size="sm" variant="outline" disabled={outOfStock === 0} onClick={() => onFilter("out-of-stock")}>
                {outOfStock} out of stock
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={reorderNow === 0} onClick={() => onFilter("reorder-now")}>
                {reorderNow} reorder now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
