"use client";

import { useState, useSyncExternalStore, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

import { postDeliveryReceiptAction } from "../actions";
import { exactDecimalsEqual, multiplyExactPositiveDecimals } from "../domain/delivery-receipt";
import type { DeliveryReceiptField, DeliveryReceiptFieldErrors, ItemListItem } from "../types";

type Line = {
  id: string;
  itemId: string;
  unit: string;
  quantity: string;
  actualReceivedBaseUnitQuantity: string;
  varianceNote: string;
};

const initialLine: Line = {
  id: "initial",
  itemId: "",
  unit: "",
  quantity: "",
  actualReceivedBaseUnitQuantity: "",
  varianceNote: "",
};

function createLine(): Line {
  return { ...initialLine, id: crypto.randomUUID() };
}

function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function DeliveryReceiptForm({ purchaseOrderId, items }: { purchaseOrderId: string; items: ItemListItem[] }) {
  const router = useRouter();
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [lines, setLines] = useState<Line[]>([initialLine]);
  const [dateOverride, setDateOverride] = useState<string | null>(null);
  const date = dateOverride ?? (isHydrated ? localDate() : "");
  const [errors, setErrors] = useState<DeliveryReceiptFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [posting, startTransition] = useTransition();

  function clearError(field: DeliveryReceiptField) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormError(null);
  }

  function fieldError(field: DeliveryReceiptField, id = `delivery-receipt-${field}-error`) {
    const messages = errors[field];
    return messages?.length
      ? <FieldError id={id} errors={messages.map((message) => ({ message }))} />
      : null;
  }

  function updateLine(id: string, next: Partial<Line>) {
    setLines((current) => current.map((value) => value.id === id ? { ...value, ...next } : value));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError(null);

    const data = new FormData(event.currentTarget);
    data.set("purchaseOrderId", purchaseOrderId);
    data.set("receiptDate", date);
    data.set("lines", JSON.stringify(lines.map((value) => {
      const [selectedUnitId, conversionId] = value.unit.split(":");
      const item = items.find((candidate) => candidate.id === value.itemId);
      const conversion = item?.unitConversions?.find((candidate) => `${candidate.alternateUnit.id}:${candidate.id}` === value.unit);
      const calculated = /^\d+(?:\.\d+)?$/.test(value.quantity)
        ? multiplyExactPositiveDecimals(value.quantity, conversion?.baseUnitQuantity ?? "1")
        : "";
      const actualDiffers = Boolean(value.actualReceivedBaseUnitQuantity && calculated && !exactDecimalsEqual(value.actualReceivedBaseUnitQuantity, calculated));

      return {
        itemId: value.itemId,
        selectedUnitId: selectedUnitId || undefined,
        conversionId: conversionId || undefined,
        quantity: value.quantity,
        actualReceivedBaseUnitQuantity: value.actualReceivedBaseUnitQuantity || undefined,
        varianceNote: actualDiffers ? value.varianceNote : undefined,
      };
    })));

    startTransition(async () => {
      const result = await postDeliveryReceiptAction(data);
      if (result.status === "success") {
        router.push(`/purchase-orders/${purchaseOrderId}#delivery-receipt-${result.receipt.id}`);
        return;
      }
      setErrors(result.fields);
      setFormError(result.error);
    });
  }

  return <form aria-label="Record delivery" aria-busy={posting} className="flex flex-col gap-6" data-client-ready={isHydrated ? "true" : undefined} noValidate onSubmit={submit}>
    {formError ? <Alert variant="destructive"><AlertTitle>Could not post Delivery Receipt</AlertTitle><AlertDescription>{formError}</AlertDescription></Alert> : null}
    <FieldGroup>
      <Field data-invalid={Boolean(errors.receiptNo?.length)}>
        <FieldLabel htmlFor="receiptNo">Receipt number</FieldLabel>
        <Input id="receiptNo" name="receiptNo" aria-label="Receipt number" aria-invalid={Boolean(errors.receiptNo?.length)} aria-describedby={errors.receiptNo?.length ? "delivery-receipt-receiptNo-error" : undefined} maxLength={100} onChange={() => clearError("receiptNo")} required />
        {fieldError("receiptNo")}
      </Field>
      <Field data-invalid={Boolean(errors.receiptDate?.length)}>
        <FieldLabel htmlFor="receiptDate">Receipt date</FieldLabel>
        <Input id="receiptDate" name="receiptDate" aria-label="Receipt date" aria-invalid={Boolean(errors.receiptDate?.length)} aria-describedby={errors.receiptDate?.length ? "delivery-receipt-receiptDate-error" : undefined} type="date" value={date} onChange={(event) => { setDateOverride(event.target.value); clearError("receiptDate"); }} required />
        {fieldError("receiptDate")}
      </Field>
      <Field data-invalid={Boolean(errors.note?.length)}>
        <FieldLabel htmlFor="note">Receipt note</FieldLabel>
        <Textarea id="note" name="note" aria-invalid={Boolean(errors.note?.length)} aria-describedby={errors.note?.length ? "delivery-receipt-note-error" : undefined} maxLength={500} onChange={() => clearError("note")} />
        {fieldError("note")}
      </Field>
    </FieldGroup>

    <section aria-label="Delivery lines" className="flex flex-col gap-4">
      <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, createLine()])}><Plus data-icon="inline-start" />Add line</Button>
      {lines.map((value, index) => {
        const item = items.find((candidate) => candidate.id === value.itemId);
        const conversion = item?.unitConversions?.find((candidate) => `${candidate.alternateUnit.id}:${candidate.id}` === value.unit);
        const calculated = /^\d+(?:\.\d+)?$/.test(value.quantity) && /[1-9]/.test(value.quantity)
          ? multiplyExactPositiveDecimals(value.quantity, conversion?.baseUnitQuantity ?? "1")
          : "";
        const actualDiffers = Boolean(value.actualReceivedBaseUnitQuantity && calculated && !exactDecimalsEqual(value.actualReceivedBaseUnitQuantity, calculated));
        const errorId = (field: DeliveryReceiptField) => `delivery-receipt-${value.id}-${field}-error`;

        return <section key={value.id} aria-label={`Delivery line ${index + 1}`} className="flex flex-col gap-4 rounded-lg border p-4">
          <Button type="button" variant="ghost" size="sm" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((candidate) => candidate.id !== value.id))}><Trash2 data-icon="inline-start" />Remove line</Button>
          <FieldGroup>
            <Field data-invalid={Boolean(errors.itemId?.length)}>
              <FieldLabel>Item</FieldLabel>
              <Select items={items.map((candidate) => ({ value: candidate.id, label: candidate.name }))} value={value.itemId || null} onValueChange={(id) => {
                const selected = items.find((candidate) => candidate.id === id);
                updateLine(value.id, { itemId: id ?? "", unit: selected ? `${selected.baseUnit.id}:` : "", quantity: "", actualReceivedBaseUnitQuantity: "", varianceNote: "" });
                clearError("itemId"); clearError("selectedUnitId"); clearError("quantity"); clearError("actualReceivedBaseUnitQuantity"); clearError("varianceNote");
              }}>
                <SelectTrigger aria-label="Item" aria-invalid={Boolean(errors.itemId?.length)} aria-describedby={errors.itemId?.length ? errorId("itemId") : undefined} className="w-full"><SelectValue placeholder="Select an active Item" /></SelectTrigger>
                <SelectContent><SelectGroup>{items.map((candidate) => <SelectItem key={candidate.id} value={candidate.id}>{candidate.name}</SelectItem>)}</SelectGroup></SelectContent>
              </Select>
              {fieldError("itemId", errorId("itemId"))}
            </Field>
            <Field data-invalid={Boolean(errors.selectedUnitId?.length)}>
              <FieldLabel>Unit</FieldLabel>
              <Select items={item ? [{ value: `${item.baseUnit.id}:`, label: `${item.baseUnit.name} (${item.baseUnit.abbreviation})` }, ...(item.unitConversions?.filter((candidate) => candidate.alternateUnit.active).map((candidate) => ({ value: `${candidate.alternateUnit.id}:${candidate.id}`, label: candidate.label })) ?? [])] : []} value={value.unit || null} disabled={!item} onValueChange={(unit) => {
                updateLine(value.id, { unit: unit ?? "", quantity: "", actualReceivedBaseUnitQuantity: "", varianceNote: "" });
                clearError("selectedUnitId"); clearError("quantity"); clearError("actualReceivedBaseUnitQuantity"); clearError("varianceNote");
              }}>
                <SelectTrigger aria-label="Unit" aria-invalid={Boolean(errors.selectedUnitId?.length)} aria-describedby={errors.selectedUnitId?.length ? errorId("selectedUnitId") : undefined} className="w-full"><SelectValue placeholder="Select an Item first" /></SelectTrigger>
                <SelectContent><SelectGroup>{item ? <><SelectItem value={`${item.baseUnit.id}:`}>{item.baseUnit.name} ({item.baseUnit.abbreviation})</SelectItem>{item.unitConversions?.filter((candidate) => candidate.alternateUnit.active).map((candidate) => <SelectItem key={candidate.id} value={`${candidate.alternateUnit.id}:${candidate.id}`}>{candidate.label}</SelectItem>)}</> : null}</SelectGroup></SelectContent>
              </Select>
              {fieldError("selectedUnitId", errorId("selectedUnitId"))}
            </Field>
            <Field data-invalid={Boolean(errors.quantity?.length)}>
              <FieldLabel htmlFor={`quantity-${value.id}`}>Quantity</FieldLabel>
              <Input id={`quantity-${value.id}`} aria-label="Quantity" aria-invalid={Boolean(errors.quantity?.length)} aria-describedby={errors.quantity?.length ? errorId("quantity") : undefined} inputMode="decimal" value={value.quantity} onChange={(event) => { updateLine(value.id, { quantity: event.target.value, actualReceivedBaseUnitQuantity: "", varianceNote: "" }); clearError("quantity"); clearError("actualReceivedBaseUnitQuantity"); clearError("varianceNote"); }} required />
              {fieldError("quantity", errorId("quantity"))}
            </Field>
            <Field>
              <FieldLabel htmlFor={`calculated-${value.id}`}>Calculated Base Unit quantity</FieldLabel>
              <Input id={`calculated-${value.id}`} aria-label="Calculated Base Unit quantity" value={calculated || "Enter a positive quantity"} readOnly />
            </Field>
            <Field data-invalid={Boolean(errors.actualReceivedBaseUnitQuantity?.length)}>
              <FieldLabel htmlFor={`actual-${value.id}`}>Actual received Base Unit quantity <span className="text-muted-foreground">(defaults to calculation)</span></FieldLabel>
              <Input id={`actual-${value.id}`} aria-label="Actual received Base Unit quantity" aria-invalid={Boolean(errors.actualReceivedBaseUnitQuantity?.length)} aria-describedby={errors.actualReceivedBaseUnitQuantity?.length ? errorId("actualReceivedBaseUnitQuantity") : undefined} inputMode="decimal" value={value.actualReceivedBaseUnitQuantity} placeholder={calculated || "Enter a positive quantity first"} onChange={(event) => { const actual = event.target.value; updateLine(value.id, { actualReceivedBaseUnitQuantity: actual, varianceNote: actual && calculated && !exactDecimalsEqual(actual, calculated) ? value.varianceNote : "" }); clearError("actualReceivedBaseUnitQuantity"); clearError("varianceNote"); }} />
              {fieldError("actualReceivedBaseUnitQuantity", errorId("actualReceivedBaseUnitQuantity"))}
            </Field>
            {actualDiffers ? <Field data-invalid={Boolean(errors.varianceNote?.length)}>
              <FieldLabel htmlFor={`variance-${value.id}`}>Variance note</FieldLabel>
              <Textarea id={`variance-${value.id}`} aria-label="Variance note" aria-invalid={Boolean(errors.varianceNote?.length)} aria-describedby={errors.varianceNote?.length ? errorId("varianceNote") : undefined} value={value.varianceNote} maxLength={500} onChange={(event) => { updateLine(value.id, { varianceNote: event.target.value }); clearError("varianceNote"); }} required />
              {fieldError("varianceNote", errorId("varianceNote"))}
            </Field> : null}
          </FieldGroup>
        </section>;
      })}
    </section>

    <div className="flex flex-wrap justify-end gap-3">
      <Button type="button" variant="outline" disabled={posting} onClick={() => router.push(`/purchase-orders/${purchaseOrderId}`)}>Cancel</Button>
      <Button type="submit" disabled={posting || !items.length}>{posting ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}{posting ? "Posting..." : "Post delivery"}</Button>
    </div>
  </form>;
}
