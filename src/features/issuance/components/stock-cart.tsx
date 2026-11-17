"use client";

import { formatDisplayNumber } from "@/lib/format-display-number";
import { useEffect, useRef, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isPositiveExactDecimal, multiplyExactPositiveDecimals } from "@/features/supply-operations/domain/delivery-receipt";
import { listIssuanceStockItemsAction } from "../actions";
import type { IssuanceStockItemOption } from "../types";
import type { LocalStockItem } from "./stock-picker";

type CartLine = { item: IssuanceStockItemOption; quantity: string; unit: string };

export default function StockCart({ onClose, onApply, submissionError }: {
  onClose: () => void;
  onApply: (lines: LocalStockItem[], signal: AbortSignal) => Promise<boolean>;
  submissionError: string;
}) {
  const [options, setOptions] = useState<IssuanceStockItemOption[]>([]);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [error, setError] = useState("");
  const [loading, startTransition] = useTransition();
  const [applying, setApplying] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  const visible = options.filter((item) => item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));

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
      request.current?.abort();
    };
  }, []);

  function close() {
    request.current?.abort();
    onClose();
  }

  function updateLine(id: string, change: Partial<Pick<CartLine, "quantity" | "unit">>) {
    setCart((current) => current.map((entry) => entry.item.id === id ? { ...entry, ...change } : entry));
  }

  async function apply() {
    if (request.current || !cart.length || cart.some(({ quantity }) => !isPositiveExactDecimal(quantity))) return;
    const controller = new AbortController();
    request.current = controller;
    setApplying(true);
    try {
      const lines = cart.map(({ item, quantity, unit }): LocalStockItem => {
        const conversion = item.conversions.find((entry) => entry.id === unit);
        const selected = conversion?.alternateUnit ?? item.baseUnit;
        return {
          id: `new-${crypto.randomUUID()}`,
          itemId: item.id,
          itemName: item.name,
          enteredQuantity: quantity,
          conversionId: conversion?.id ?? null,
          conversionFactor: conversion?.factor ?? "1",
          selectedUnitId: selected.id,
          selectedUnitName: selected.name,
          selectedUnitAbbreviation: selected.abbreviation,
          baseUnitId: item.baseUnit.id,
          baseUnitName: item.baseUnit.name,
          baseUnitAbbreviation: item.baseUnit.abbreviation,
          unsaved: true,
          changed: true,
        };
      });
      await onApply(lines, controller.signal);
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setApplying(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent initialFocus={search} finalFocus={() => document.getElementById("issuance-add")} className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-3xl">
        <DialogHeader className="pr-8">
          <DialogTitle>Add Stock item</DialogTitle>
          <DialogDescription className="sr-only">Choose Stock items and enter their quantities and Units.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto px-1 pb-1">
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <section aria-label="Find Stock items" className="flex min-w-0 flex-col gap-2">
              <Field>
                <FieldLabel htmlFor="stock-cart-search">Search Stock items</FieldLabel>
                <Input ref={search} id="stock-cart-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
              </Field>
              <ul aria-label="Stock results" className="max-h-64 divide-y overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
                {visible.map((item) => (
                  <li key={item.id} className="flex min-h-11 items-center justify-between gap-2 py-1.5">
                    <span className="min-w-0 break-words font-medium">{item.name}</span>
                    {cart.some((entry) => entry.item.id === item.id) ? (
                      <Badge variant="outline" className="border-transparent bg-success-muted text-success-foreground">In cart</Badge>
                    ) : (
                      <Button variant="outline" size="sm" disabled={applying} aria-label={`Add ${item.name}`} onClick={() => {
                        setCart((current) => [...current, { item, quantity: "", unit: "base" }]);
                        search.current?.focus({ preventScroll: true });
                      }}><Plus data-icon="inline-start" />Add</Button>
                    )}
                  </li>
                ))}
              </ul>
              {loading && <p role="status">Loading Stock items…</p>}
              {!loading && !error && !visible.length && <p className="text-muted-foreground">No Stock items match your search.</p>}
            </section>
            <section aria-labelledby="stock-cart-heading" className="flex min-w-0 flex-col gap-2 rounded-lg border bg-muted/30 p-3">
              <h3 id="stock-cart-heading" className="font-semibold">To add ({formatDisplayNumber(cart.length)})</h3>
              {cart.length ? (
                <ul aria-label="Stock items to add" tabIndex={0} className="max-h-64 divide-y overflow-y-auto rounded-md p-1.5 outline-none focus-visible:outline-1 focus-visible:-outline-offset-2 focus-visible:outline-ring overscroll-contain [scrollbar-gutter:stable]">
                  {cart.map(({ item, quantity, unit }) => {
                    const units = [
                      { value: "base", label: item.baseUnit.name },
                      ...item.conversions.map((entry) => ({ value: entry.id, label: entry.alternateUnit.name })),
                    ];
                    const conversion = item.conversions.find((entry) => entry.id === unit);
                    return (
                      <li key={item.id} className="flex min-w-0 flex-col gap-2 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="min-w-0 break-words font-medium">{item.name}</p>
                          <Button variant="ghost" size="icon-sm" disabled={applying} aria-label={`Remove ${item.name}`} onClick={() => {
                            setCart((current) => current.filter((entry) => entry.item.id !== item.id));
                            search.current?.focus({ preventScroll: true });
                          }}><X /></Button>
                        </div>
                        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-2">
                          <Field>
                            <FieldLabel htmlFor={`stock-quantity-${item.id}`}>Quantity</FieldLabel>
                            <Input id={`stock-quantity-${item.id}`} inputMode="decimal" className="tabular-nums" required disabled={applying} value={quantity}
                              aria-invalid={Boolean(quantity && !isPositiveExactDecimal(quantity))}
                              onChange={(event) => updateLine(item.id, { quantity: event.target.value })} />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor={`stock-unit-${item.id}`}>Unit</FieldLabel>
                            <Select items={units} value={unit} disabled={applying} onValueChange={(value) => updateLine(item.id, { unit: value ?? "base" })}>
                              <SelectTrigger id={`stock-unit-${item.id}`} className="w-full"><SelectValue /></SelectTrigger>
                              <SelectContent><SelectGroup>{units.map((entry) => <SelectItem key={entry.value} value={entry.value}>{entry.label}</SelectItem>)}</SelectGroup></SelectContent>
                            </Select>
                          </Field>
                        </div>
                        {conversion && isPositiveExactDecimal(quantity) && <p className="break-words text-xs text-muted-foreground">Base quantity: {formatDisplayNumber(multiplyExactPositiveDecimals(quantity, conversion.factor))} {item.baseUnit.abbreviation}</p>}
                      </li>
                    );
                  })}
                </ul>
              ) : <Empty><EmptyHeader><EmptyDescription>Add Stock items from the list.</EmptyDescription></EmptyHeader></Empty>}
            </section>
          </div>
          {(error || submissionError) && <Alert variant="destructive"><AlertDescription>{error || submissionError}</AlertDescription></Alert>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button disabled={loading || applying || !cart.length || cart.some(({ quantity }) => !isPositiveExactDecimal(quantity))} onClick={apply}>
            {applying ? "Applying…" : cart.length ? `Add ${formatDisplayNumber(cart.length)} Stock ${cart.length === 1 ? "item" : "items"}` : "Add Stock items"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
