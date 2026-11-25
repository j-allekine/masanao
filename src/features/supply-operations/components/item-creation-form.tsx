"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createItemWithConversionsAction } from "../actions";
import type { CategoryListItem, ItemFieldErrors, ItemFormActionState, ItemListItem, UnitListItem } from "../types";
import ItemForm from "./item-form";

type ConversionInput = { key: string; alternateUnitId: string; baseUnitQuantity: string };

function ConversionFields({ units, baseUnitId, pending, conversions, setConversions, errors }: {
  units: UnitListItem[]; baseUnitId: string; pending: boolean; conversions: ConversionInput[];
  setConversions: (values: ConversionInput[]) => void; errors: Record<string, string[]>;
}) {
  const baseUnit = units.find((unit) => unit.id === baseUnitId);
  const eligible = units.filter((unit) => unit.active && unit.id !== baseUnitId);
  useEffect(() => {
    if (pending) return;
    const key = Object.keys(errors).find((key) => key.startsWith("conversions."));
    if (key) document.querySelector<HTMLElement>(`[data-item-conversion-field="${key}"]`)?.focus();
  }, [errors, pending]);
  function change(index: number, patch: Partial<ConversionInput>) {
    setConversions(conversions.map((entry, i) => i === index ? { ...entry, ...patch } : entry));
  }
  return <FieldGroup aria-label="Optional alternate units">
    <Field><FieldLabel>Alternate units (optional)</FieldLabel><FieldDescription>Set how much of this Item one package contains. {baseUnit ? `Base Unit: ${baseUnit.name} (${baseUnit.abbreviation}).` : "Choose the Base Unit first."}</FieldDescription></Field>
    {conversions.map((conversion, index) => {
      const unitKey = `conversions.${index}.alternateUnitId`;
      const quantityKey = `conversions.${index}.baseUnitQuantity`;
      return <FieldGroup key={conversion.key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-2">
        <Field data-invalid={Boolean(errors[unitKey])}><FieldLabel htmlFor={`item-create-unit-${conversion.key}`}>1 alternate unit</FieldLabel><Select items={eligible.map((unit) => ({ value: unit.id, label: `${unit.name} (${unit.abbreviation})` }))} value={conversion.alternateUnitId || null} onValueChange={(value) => change(index, { alternateUnitId: value ?? "" })} disabled={pending || !baseUnitId}>
          <SelectTrigger id={`item-create-unit-${conversion.key}`} data-item-conversion-field={unitKey} aria-label={`Alternate Unit ${index + 1}`} aria-invalid={Boolean(errors[unitKey])} className="w-full min-w-0"><SelectValue placeholder="Choose a Unit" /></SelectTrigger><SelectContent><SelectGroup>{eligible.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name} ({unit.abbreviation})</SelectItem>)}</SelectGroup></SelectContent>
        </Select>{errors[unitKey] && <FieldError errors={errors[unitKey].map((message) => ({ message }))} />}</Field>
        <Field data-invalid={Boolean(errors[quantityKey])}><FieldLabel htmlFor={`item-create-factor-${conversion.key}`}>Equals ({baseUnit?.abbreviation ?? "Base Unit"})</FieldLabel><Input id={`item-create-factor-${conversion.key}`} data-item-conversion-field={quantityKey} aria-label={`Base Unit quantity ${index + 1}`} aria-invalid={Boolean(errors[quantityKey])} inputMode="decimal" value={conversion.baseUnitQuantity} onChange={(event) => change(index, { baseUnitQuantity: event.target.value })} disabled={pending} />{errors[quantityKey] && <FieldError errors={errors[quantityKey].map((message) => ({ message }))} />}</Field>
        <Button type="button" size="icon-sm" variant="ghost" className="mt-6" disabled={pending} aria-label={`Remove alternate Unit ${index + 1}`} onClick={() => setConversions(conversions.filter((_, i) => i !== index))}><Trash2 /></Button>
      </FieldGroup>;
    })}
    <Button type="button" variant="outline" className="w-fit" disabled={pending || !baseUnitId} onClick={() => setConversions([...conversions, { key: crypto.randomUUID(), alternateUnitId: "", baseUnitQuantity: "" }])}><Plus data-icon="inline-start" />Add alternate Unit</Button>
    <p className="text-body-sm text-muted-foreground">The Item and its alternate units save together.</p>
  </FieldGroup>;
}

export default function ItemCreationForm({ initialName = "", categories, units, onCancel, onSuccess, onDirtyChange, onPendingChange, cancelLabel = "Cancel" }: {
  initialName?: string; categories: CategoryListItem[]; units: UnitListItem[];
  onCancel: () => void; onSuccess: (item: ItemListItem) => void;
  onDirtyChange?: (dirty: boolean) => void; onPendingChange?: (pending: boolean) => void; cancelLabel?: string;
}) {
  const [conversions, setConversions] = useState<ConversionInput[]>([]);
  const [conversionErrors, setConversionErrors] = useState<Record<string, string[]>>({});
  const [itemDirty, setItemDirty] = useState(false);
  useEffect(() => { onDirtyChange?.(itemDirty || conversions.length > 0); }, [itemDirty, conversions.length, onDirtyChange]);
  async function create(formData: FormData): Promise<ItemFormActionState> {
    onPendingChange?.(true);
    try {
      const result = await createItemWithConversionsAction({ item: Object.fromEntries(formData.entries()), conversions: conversions.map(({ alternateUnitId, baseUnitQuantity }) => ({ alternateUnitId, baseUnitQuantity })) });
      if (result.ok) return { status: "success", item: result.item };
      setConversionErrors(result.fields);
      const fields: ItemFieldErrors = {};
      for (const key of ["name", "categoryId", "baseUnitId", "reorderLevel", "issuanceQuantityPolicy", "note", "form"] as const) {
        if (result.fields[key]) fields[key] = result.fields[key];
      }
      return { status: "error", kind: result.kind === "busy" ? "server" : result.kind, error: result.error, fields };
    } finally { onPendingChange?.(false); }
  }
  return <ItemForm mode="create" initialName={initialName} categories={categories} units={units} onCancel={onCancel} cancelLabel={cancelLabel} onSuccess={onSuccess} onDirtyChange={setItemDirty} createAction={create}
    onBaseUnitChange={(baseUnitId) => {
      setConversions(current => current.map(entry => ({ ...entry, alternateUnitId: entry.alternateUnitId === baseUnitId ? "" : entry.alternateUnitId, baseUnitQuantity: "" })));
      setConversionErrors({});
    }}
    additionalFields={({ baseUnitId, pending }) => <ConversionFields units={units} baseUnitId={baseUnitId} pending={pending} conversions={conversions} errors={conversionErrors} setConversions={(values) => { setConversions(values); setConversionErrors({}); }} />} />;
}
