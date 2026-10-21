"use client";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { stockStatusLabels } from "../domain/inventory";
import type { InventoryStatusFilterValue } from "../domain/inventory-list-state";

export type { InventoryStatusFilterValue } from "../domain/inventory-list-state";

const statuses = ["good", "reorder-now", "out-of-stock"] as const;
const statusTones = {
  good: "aria-pressed:border-success aria-pressed:bg-success-muted aria-pressed:text-success-foreground",
  "reorder-now": "aria-pressed:border-warning aria-pressed:bg-warning-muted aria-pressed:text-warning-foreground",
  "out-of-stock": "aria-pressed:border-destructive aria-pressed:bg-destructive/10 aria-pressed:text-destructive",
};
const statusDots = {
  good: "bg-success",
  "reorder-now": "bg-warning",
  "out-of-stock": "bg-destructive",
};

export function InventoryStatusFilter({
  value,
  onChange,
}: {
  value: InventoryStatusFilterValue;
  onChange: (value: InventoryStatusFilterValue) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span id="inventory-stock-status-label" className="text-body-sm font-medium">Stock status</span>
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          aria-labelledby="inventory-stock-status-label"
          value={value ? [value] : []}
          onValueChange={(values) => onChange((values[0] ?? "") as InventoryStatusFilterValue)}
          variant="outline"
          size="sm"
          className="max-w-full flex-wrap"
        >
          {statuses.map((status) => (
            <ToggleGroupItem key={status} value={status} className={statusTones[status]}>
              <span aria-hidden="true" className={cn("size-2 rounded-full", statusDots[status])} />
              {stockStatusLabels[status]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {value ? <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>Clear Stock status</Button> : null}
      </div>
    </div>
  );
}
