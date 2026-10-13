"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldDescription, FieldSet, FieldLegend } from "@/components/ui/field";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Empty, EmptyHeader, EmptyDescription } from "@/components/ui/empty";
import { listIssuanceStockItemsAction } from "../actions";
import { isPositiveExactDecimal, multiplyExactPositiveDecimals } from "@/features/supply-operations/domain/delivery-receipt";
import type { IssuanceStockItem, IssuanceStockItemOption } from "../types";

export type LocalStockItem = IssuanceStockItem & { unsaved?: boolean; changed?: boolean };
type ItemOption = { value: string; label: string };

export default function StockPicker({ line, addedItems = [], onClose, onApply }: {
  line: LocalStockItem | null;
  addedItems?: LocalStockItem[];
  onClose: () => void;
  onApply: (line: LocalStockItem, signal: AbortSignal) => Promise<boolean>;
}) {
  const [options, setOptions] = useState<IssuanceStockItemOption[]>([]);
  const [query, setQuery] = useState(line?.itemName ?? "");
  const [itemId, setItemId] = useState(line?.itemId ?? "");
  const [quantity, setQuantity] = useState(line?.enteredQuantity ?? "");
  const [unit, setUnit] = useState(line?.conversionId ?? "base");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, startTransition] = useTransition();
  const [applying, setApplying] = useState(false);
  const application = useRef<AbortController | null>(null);
  const itemInput = useRef<HTMLInputElement | null>(null);
  const pending = loading || applying;

  useEffect(() => {
    if (notice && !pending) itemInput.current?.focus();
  }, [notice, pending]);

  useEffect(() => {
    let active = true;
    startTransition(async () => {
      const result = await listIssuanceStockItemsAction();
      if (!active) return;
      if (result.ok) setOptions(result.value);
      else setError(result.error);
    });
    return () => {
      active = false;
      application.current?.abort();
    };
  }, []);

  const item = options.find((option) => option.id === itemId);
  const itemOptions = options.map((option) => ({ value: option.id, label: option.name }));
  const conversion = item?.conversions.find((entry) => entry.id === unit);
  const units = item ? [
    { value: "base", label: `${item.baseUnit.name} (${item.baseUnit.abbreviation}) · Base` },
    ...item.conversions.map((entry) => ({ value: entry.id, label: `${entry.alternateUnit.name} (${entry.alternateUnit.abbreviation}) · ${entry.factor} ${item.baseUnit.abbreviation}` })),
  ] : [];
  const invalidQuantity = quantity !== "" && !isPositiveExactDecimal(quantity);
  const validUnit = unit === "base" || Boolean(conversion);
  const baseQuantity = item && isPositiveExactDecimal(quantity) && validUnit
    ? multiplyExactPositiveDecimals(quantity, conversion?.factor ?? "1")
    : null;

  function close() {
    application.current?.abort();
    onClose();
  }

  async function apply() {
    if (pending) return;
    if (!item || !isPositiveExactDecimal(quantity) || !validUnit) {
      setError("Select an available Item and Unit, and enter a positive decimal quantity.");
      return;
    }
    const selectedUnit = conversion?.alternateUnit ?? item.baseUnit;
    const controller = new AbortController();
    application.current?.abort();
    application.current = controller;
    setApplying(true);
    setError("");
    setNotice("");
    try {
      const accepted = await onApply({
        id: line?.id ?? `new-${crypto.randomUUID()}`,
        itemId: item.id, itemName: item.name, enteredQuantity: quantity,
        conversionId: conversion?.id ?? null, conversionFactor: conversion?.factor ?? "1",
        selectedUnitId: selectedUnit.id, selectedUnitName: selectedUnit.name,
        selectedUnitAbbreviation: selectedUnit.abbreviation,
        baseUnitId: item.baseUnit.id, baseUnitName: item.baseUnit.name,
        baseUnitAbbreviation: item.baseUnit.abbreviation,
        unsaved: line?.unsaved ?? !line, changed: true,
      }, controller.signal);
      if (controller.signal.aborted || !accepted) return;
      if (!line) {
        setItemId("");
        setQuery("");
        setQuantity("");
        setUnit("base");
        setNotice(`${item.name} added to stock. Add another Item or close this dialog.`);
      }
    } finally {
      if (!controller.signal.aborted) setApplying(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent finalFocus={() => document.getElementById(line ? `stock-actions-${line.id}` : "issuance-add")} className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{line ? "Edit Stock item" : "Add Stock item"}</DialogTitle>
          <DialogDescription>Choose an Item and its Unit. Review the Stock lines already added to this issuance.</DialogDescription>
        </DialogHeader>
        <div className="grid min-w-0 gap-6 sm:grid-cols-2">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="stock-item">Item</FieldLabel>
              <Combobox items={itemOptions} inputValue={query} onInputValueChange={setQuery} value={itemOptions.find((option) => option.value === itemId) ?? null} disabled={pending} onValueChange={(option: ItemOption | null) => {
                setItemId(option?.value ?? "");
                setUnit("base");
                setError("");
                setNotice("");
              }}>
                <ComboboxInput ref={itemInput} id="stock-item" placeholder="Search active Items" className="w-full" aria-describedby="stock-item-help" />
                <ComboboxContent>
                  <ComboboxList>{(option: ItemOption) => <ComboboxItem key={option.value} value={option}>{option.label}</ComboboxItem>}</ComboboxList>
                  <ComboboxEmpty>No active Items match your search.</ComboboxEmpty>
                </ComboboxContent>
              </Combobox>
              <FieldDescription id="stock-item-help">
                {loading ? "Loading available Items…" : line && !item ? "This saved Item is no longer available. Select an available Item to edit the line." : options.length === 0 ? "No active Stock items are available." : "Type an Item name to find it."}
              </FieldDescription>
            </Field>
            <FieldSet>
              <FieldLegend variant="label">Quantity and Unit</FieldLegend>
              <FieldGroup>
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
                  {item && !validUnit ? <FieldDescription>This saved Unit is unavailable. Select a current Unit.</FieldDescription> : null}
                </Field>
              </FieldGroup>
              <FieldDescription className="break-words tabular-nums" aria-live="polite">{baseQuantity ? `Base quantity: ${baseQuantity} ${item!.baseUnit.abbreviation}` : "Select an Item, Unit, and quantity to preview the Base quantity."}</FieldDescription>
            </FieldSet>
          </FieldGroup>
          <section aria-label="Stock already added" className="flex min-w-0 flex-col gap-3">
            <h3 className="text-body-sm font-medium">Stock already added ({addedItems.length})</h3>
            {addedItems.length ? (
              <ul className="flex max-h-64 flex-col gap-3 overflow-y-auto">
                {addedItems.map((entry) => (
                  <li key={entry.id} className="flex min-w-0 flex-col gap-1 rounded-lg border p-3">
                    <p className="break-words text-body-sm font-medium">{entry.itemName}</p>
                    <p className="break-words text-body-sm tabular-nums">{entry.enteredQuantity} {entry.selectedUnitAbbreviation}</p>
                    <p className="break-words text-body-sm text-muted-foreground tabular-nums">Base quantity: {multiplyExactPositiveDecimals(entry.enteredQuantity, entry.conversionFactor)} {entry.baseUnitAbbreviation}</p>
                  </li>
                ))}
              </ul>
            ) : <Empty><EmptyHeader><EmptyDescription>No Stock lines added yet.</EmptyDescription></EmptyHeader></Empty>}
            <p className="text-body-sm text-muted-foreground">These are direct Stock lines. Recipe ingredients appear in combined review.</p>
          </section>
        </div>
        {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
        {notice ? <p role="status" className="text-body-sm">{notice}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={close}>{line || !addedItems.length || applying ? "Cancel" : "Done"}</Button>
          <Button disabled={pending} onClick={apply}>{loading ? "Loading…" : applying ? "Applying…" : line ? "Apply changes" : "Add Stock item"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
