"use client";

import { WorkspaceFilterField } from "@/components/workspace/catalog-controls";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InventoryListItem } from "../types";

export function InventoryCategoryFilter({ categories, value, onValueChange }: {
  categories: InventoryListItem["category"][];
  value: string;
  onValueChange: (value: string) => void;
}) {
  const options = [{ value: "", label: "All Categories" }, ...categories.map((category) => ({ value: category.id, label: category.name }))];
  return <WorkspaceFilterField id="inventory-category" label="Category">
      <Select items={options} value={value} onValueChange={(next) => onValueChange(next ?? "")}>
        <SelectTrigger id="inventory-category" className="w-full min-w-0"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectGroup>{options.map((option) => <SelectItem key={option.value} value={option.value}><span className="whitespace-normal break-words">{option.label}</span></SelectItem>)}</SelectGroup>
        </SelectContent>
      </Select>
  </WorkspaceFilterField>;
}
