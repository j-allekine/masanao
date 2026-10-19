"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InventoryListItem } from "../types";

export function InventoryCategoryFilter({ categories, value, onValueChange }: {
  categories: InventoryListItem["category"][];
  value: string;
  onValueChange: (value: string) => void;
}) {
  const options = [{ value: "", label: "All Categories" }, ...categories.map((category) => ({ value: category.id, label: category.name }))];
  return <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end lg:flex-1">
    <FieldGroup className="min-w-0 sm:max-w-72 sm:flex-1">
      <Field>
        <FieldLabel htmlFor="inventory-category">Category</FieldLabel>
        <Select items={options} value={value} onValueChange={(next) => onValueChange(next ?? "")}>
          <SelectTrigger id="inventory-category" className="w-full min-w-0"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectGroup>{options.map((option) => <SelectItem key={option.value} value={option.value}><span className="whitespace-normal break-words">{option.label}</span></SelectItem>)}</SelectGroup>
          </SelectContent>
        </Select>
      </Field>
    </FieldGroup>
    {value ? <Button type="button" variant="outline" onClick={() => onValueChange("")}>Clear Category</Button> : null}
  </div>;
}
