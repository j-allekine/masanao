"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InventoryListItem } from "../types";

export function InventoryCategoryFilter({ categories, value, onValueChange }: {
  categories: InventoryListItem["category"][];
  value: string;
  onValueChange: (value: string) => void;
}) {
  const options = [{ value: "", label: "All Categories" }, ...categories.map((category) => ({ value: category.id, label: category.name }))];
  return <div className="flex w-full min-w-0 items-end gap-2 sm:w-auto">
    <Field className="min-w-0 flex-1 sm:w-56 sm:flex-none">
      <FieldLabel htmlFor="inventory-category">Category</FieldLabel>
      <Select items={options} value={value} onValueChange={(next) => onValueChange(next ?? "")}>
        <SelectTrigger id="inventory-category" className="w-full min-w-0"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectGroup>{options.map((option) => <SelectItem key={option.value} value={option.value}><span className="whitespace-normal break-words">{option.label}</span></SelectItem>)}</SelectGroup>
        </SelectContent>
      </Select>
    </Field>
    {value ? <Button type="button" variant="ghost" size="sm" aria-label="Clear Category" className="shrink-0" onClick={() => onValueChange("")}>Clear</Button> : null}
  </div>;
}
