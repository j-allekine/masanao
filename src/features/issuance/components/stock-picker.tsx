"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { listIssuanceStockItemsAction } from "../actions";
import { isPositiveExactDecimal } from "@/features/supply-operations/domain/delivery-receipt";
import type { IssuanceStockItem, IssuanceStockItemOption } from "../types";

export type LocalStockItem = IssuanceStockItem & { unsaved?: boolean; changed?: boolean };

export default function StockPicker({ line, onClose, onApply }: {
  line: LocalStockItem | null;
  onClose: () => void;
  onApply: (line: LocalStockItem) => void;
}) {
  const [options, setOptions] = useState<IssuanceStockItemOption[]>([]);
  const [query, setQuery] = useState("");
  const [itemId, setItemId] = useState(line?.itemId ?? "");
  const [quantity, setQuantity] = useState(line?.enteredQuantity ?? "");
  const [unit, setUnit] = useState(line?.conversionId ?? "base");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    startTransition(async () => {
      const result = await listIssuanceStockItemsAction();
      if (result.ok) setOptions(result.value);
      else setError(result.error);
    });
  }, []);
  const item = options.find((option) => option.id === itemId);
  const units = item ? [
    { value: "base", label: `${item.baseUnit.name} (${item.baseUnit.abbreviation}) · Base` },
    ...item.conversions.map((conversion) => ({ value: conversion.id, label: `${conversion.alternateUnit.name} (${conversion.alternateUnit.abbreviation}) · ${conversion.factor} ${item.baseUnit.abbreviation}` })),
  ] : [];
  const invalidQuantity = quantity !== "" && !isPositiveExactDecimal(quantity);
  function apply() {
    const conversion = item?.conversions.find((entry) => entry.id === unit);
    if (!item || !isPositiveExactDecimal(quantity) || (unit !== "base" && !conversion)) {
      setError("Select an available Item and Unit, and enter a positive decimal quantity.");
      return;
    }
    const selectedUnit = conversion?.alternateUnit ?? item.baseUnit;
    onApply({
      id: line?.id ?? `new-${crypto.randomUUID()}`,
      itemId: item.id, itemName: item.name, enteredQuantity: quantity,
      conversionId: conversion?.id ?? null, conversionFactor: conversion?.factor ?? "1",
      selectedUnitId: selectedUnit.id, selectedUnitName: selectedUnit.name,
      selectedUnitAbbreviation: selectedUnit.abbreviation,
      baseUnitId: item.baseUnit.id, baseUnitName: item.baseUnit.name,
      baseUnitAbbreviation: item.baseUnit.abbreviation,
      unsaved: line?.unsaved ?? !line, changed: true,
    });
  }
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent finalFocus={() => document.getElementById(line ? `stock-actions-${line.id}` : "issuance-add")} className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{line ? "Edit Stock item" : "Add Stock item"}</DialogTitle>
        <DialogDescription>Choose an Item and its Unit. Meal pax is required before posting.</DialogDescription>
      </DialogHeader>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="stock-search">Search Items</FieldLabel>
          <Input id="stock-search" value={query} disabled={pending} onChange={(event) => setQuery(event.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor="stock-item">Item</FieldLabel>
          <Select items={options.map((option) => ({value: option.id, label: option.name}))} value={itemId} disabled={pending} onValueChange={(value) => { setItemId(value ?? ""); setUnit("base"); setError(""); }}>
            <SelectTrigger id="stock-item" className="w-full"><SelectValue placeholder="Select Item" /></SelectTrigger>
            <SelectContent><SelectGroup>{options.filter((option) => option.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map((option) => <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>)}</SelectGroup></SelectContent>
          </Select>
          {!pending && options.filter((option) => option.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())).length === 0 ? <FieldDescription>No matching Items available.</FieldDescription> : null}
          {line && !pending && !item ? <FieldDescription>This saved Item is no longer available. Select an available Item to edit the line.</FieldDescription> : null}
        </Field>
        <Field data-invalid={invalidQuantity}>
          <FieldLabel htmlFor="stock-quantity">Quantity</FieldLabel>
          <Input id="stock-quantity" inputMode="decimal" value={quantity} disabled={pending} aria-invalid={invalidQuantity} aria-describedby="stock-quantity-help" onChange={(event) => setQuantity(event.target.value)} />
          <FieldDescription id="stock-quantity-help">{invalidQuantity ? "Enter a positive decimal quantity, such as 0.25 or 2." : "Enter the exact quantity in the selected Unit."}</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="stock-unit">Unit</FieldLabel>
          <Select items={units} value={units.some((entry) => entry.value === unit) ? unit : null} disabled={pending || !item} onValueChange={(value) => setUnit(value ?? "base")}>
            <SelectTrigger id="stock-unit" className="w-full"><SelectValue placeholder="Select Unit" /></SelectTrigger>
            <SelectContent><SelectGroup>{units.map((entry) => <SelectItem key={entry.value} value={entry.value}>{entry.label}</SelectItem>)}</SelectGroup></SelectContent>
          </Select>
        </Field>
      </FieldGroup>
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button disabled={pending} onClick={apply}>{pending ? "Loading…" : line ? "Apply changes" : "Add Stock item"}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
