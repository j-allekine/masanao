"use client";

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkspaceFilterField } from "@/components/workspace/catalog-controls";
import { stockStatusLabels } from "../domain/inventory";
import type { InventoryStatusFilterValue } from "../domain/inventory-list-state";

export type { InventoryStatusFilterValue } from "../domain/inventory-list-state";

const options = [
  { value: "", label: "All stock statuses" },
  ...(["good", "reorder-now", "out-of-stock"] as const).map((value) => ({ value, label: stockStatusLabels[value] })),
];

export function InventoryStatusFilter({
  value,
  onChange,
}: {
  value: InventoryStatusFilterValue;
  onChange: (value: InventoryStatusFilterValue) => void;
}) {
  return (
    <WorkspaceFilterField id="inventory-stock-status" label="Stock status">
      <Select items={options} value={value} onValueChange={(next) => onChange((next ?? "") as InventoryStatusFilterValue)}>
        <SelectTrigger id="inventory-stock-status" className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectGroup>
        </SelectContent>
      </Select>
    </WorkspaceFilterField>
  );
}
