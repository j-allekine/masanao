"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
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

export default function StockPicker({ line, addedItems = [], submissionError, onClose, onApply }: {
  line: LocalStockItem | null;
  addedItems?: LocalStockItem[];
  submissionError?: string;
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
  const unavailableSavedItem = Boolean(line && !loading && !item && !options.some((option) => option.id === line.itemId));
  const itemHelp = loading ? "Loading available Items…" : unavailableSavedItem ? "This saved Item is no longer available. Select an available Item to edit the line." : options.length === 0 ? "No active Stock items are available." : null;
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
        setNotice(`${item.name} added to stock.`);
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
          <DialogDescription className="sr-only">Choose an Item, quantity and Unit.</DialogDescription>
        </DialogHeader>
        <div className="grid min-w-0 gap-6 sm:grid-cols-2">
          <FieldGroup className="gap-3">
            <Field>
              <FieldLabel htmlFor="stock-item">Item</FieldLabel>
              <Combobox items={itemOptions} filteredItems={itemOptions.filter((option) => option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))} inputValue={query} isItemEqualToValue={(a: ItemOption, b: ItemOption) => a.value === b.value}
                onInputValueChange={(value, details) => {
                  setQuery(value);
                  if (details.reason === "input-change" && value !== item?.name) {
                    setItemId("");
                    setUnit("base");
                    setError("");
                    setNotice("");
                  }
                }} value={itemOptions.find((option) => option.value === itemId) ?? null} disabled={pending} onValueChange={(option: ItemOption | null) => {
                setItemId(option?.value ?? "");
                setUnit("base");
                setError("");
                setNotice("");
              }}>
                <ComboboxInput ref={itemInput} id="stock-item" placeholder="Search active Items" className="w-full" aria-describedby={itemHelp ? "stock-item-help" : undefined} />
                <ComboboxContent>
                  <ComboboxList>{(option: ItemOption) => <ComboboxItem key={option.value} value={option}>{option.label}</ComboboxItem>}</ComboboxList>
                  <ComboboxEmpty>No active Items match your search.</ComboboxEmpty>
                </ComboboxContent>
              </Combobox>
              {itemHelp ? <FieldDescription id="stock-item-help">{itemHelp}</FieldDescription> : null}
            </Field>
            <FieldGroup className="gap-3">
              <FieldGroup className="gap-3">
                <Field data-invalid={invalidQuantity}>
                  <FieldLabel htmlFor="stock-quantity">Quantity</FieldLabel>
                  <Input id="stock-quantity" inputMode="decimal" value={quantity} disabled={pending} aria-invalid={invalidQuantity} aria-describedby={invalidQuantity ? "stock-quantity-help" : undefined} onChange={(event) => { setQuantity(event.target.value); setError(""); }} />
                  {invalidQuantity ? <FieldDescription id="stock-quantity-help">Enter a positive decimal quantity, such as 0.25 or 2.</FieldDescription> : null}
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
              {baseQuantity ? <FieldDescription className="break-words tabular-nums" aria-live="polite">Base quantity: {baseQuantity} {item!.baseUnit.abbreviation}</FieldDescription> : null}
            </FieldGroup>
          </FieldGroup>
          <section aria-label="Stock already added" className="flex min-w-0 flex-col gap-3">
            {item ? <section aria-label="Selected Stock item" className="flex flex-col gap-2">
              <h3 className="text-body-sm font-medium">{line ? "Changes" : "Selected to add (1)"}</h3>
              <div className="flex min-w-0 items-center justify-between gap-2 rounded-md border p-2">
                <div className="min-w-0"><p className="break-words font-medium">{item.name}</p><p className="text-muted-foreground tabular-nums">{quantity || "Quantity pending"} {units.find((entry) => entry.value === unit) ? (conversion?.alternateUnit.abbreviation ?? item.baseUnit.abbreviation) : ""}</p></div>
                <Button variant="ghost" size="icon-sm" disabled={pending} aria-label="Clear Stock selection" onClick={() => { setItemId(""); setQuery(""); setQuantity(""); setUnit("base"); setError(""); setNotice(""); itemInput.current?.focus(); }}><X /></Button>
              </div>
            </section> : null}
            <h3 className="text-body-sm font-medium">Stock already added ({addedItems.length})</h3>
            {addedItems.length ? (
              <ul className="flex max-h-48 flex-col divide-y overflow-y-auto">
                {addedItems.map((entry) => (
                  <li key={entry.id} className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2">
                    <p className="min-w-0 break-words text-body-sm font-medium">{entry.itemName}</p>
                    <p className="break-words text-body-sm tabular-nums">{entry.enteredQuantity} {entry.selectedUnitAbbreviation}</p>
                    {entry.conversionId ? <p className="w-full break-words text-label text-muted-foreground tabular-nums">Base quantity: {multiplyExactPositiveDecimals(entry.enteredQuantity, entry.conversionFactor)} {entry.baseUnitAbbreviation}</p> : null}
                  </li>
                ))}
              </ul>
            ) : <Empty><EmptyHeader><EmptyDescription>No Stock lines added yet.</EmptyDescription></EmptyHeader></Empty>}
          </section>
        </div>
        {error || submissionError ? <Alert variant="destructive"><AlertDescription>{error || submissionError}</AlertDescription></Alert> : null}
        {notice ? <p role="status" className="text-body-sm">{notice}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={close}>{line || !addedItems.length || applying ? "Cancel" : "Done"}</Button>
          <Button disabled={pending || !item || !isPositiveExactDecimal(quantity) || !validUnit} onClick={apply}>{loading ? "Loading…" : applying ? "Applying…" : line ? "Apply changes" : "Add Stock item"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
