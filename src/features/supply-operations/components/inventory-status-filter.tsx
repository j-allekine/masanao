"use client";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { stockStatusLabels } from "../domain/inventory";
import type { InventoryStatusFilterValue } from "../domain/inventory-list-state";

export type { InventoryStatusFilterValue } from "../domain/inventory-list-state";

const statuses = ["good", "reorder-now", "out-of-stock"] as const;

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
            <ToggleGroupItem key={status} value={status}>{stockStatusLabels[status]}</ToggleGroupItem>
          ))}
        </ToggleGroup>
        {value ? <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>Clear Stock status</Button> : null}
      </div>
    </div>
  );
}
