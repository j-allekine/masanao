"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

import { postDeliveryReceiptAction } from "../actions";
import { multiplyExactPositiveDecimals } from "../domain/delivery-receipt";
import type { DeliveryReceiptField, DeliveryReceiptFieldErrors, ItemListItem } from "../types";

export default function DeliveryReceiptForm({ purchaseOrderId, items }: { purchaseOrderId: string; items: ItemListItem[] }) {
  const router = useRouter();
  const [errors, setErrors] = useState<DeliveryReceiptFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPosting, startTransition] = useTransition();
  const [itemId, setItemId] = useState("");
  const [selectedUnitValue, setSelectedUnitValue] = useState("");
  const [quantity, setQuantity] = useState("");
  const [actualReceivedQuantity, setActualReceivedQuantity] = useState("");
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().slice(0, 10));
  const selectedItem = items.find((item) => item.id === itemId);
  const selectedConversion = selectedItem?.unitConversions?.find((conversion) => `${conversion.alternateUnit.id}:${conversion.id}` === selectedUnitValue);
  const conversionFactor = selectedConversion?.baseUnitQuantity ?? "1";
  const calculatedBaseUnitQuantity = /^\d+(?:\.\d+)?$/.test(quantity) && /[1-9]/.test(quantity)
    ? multiplyExactPositiveDecimals(quantity, conversionFactor)
    : null;
  const actualQuantityDiffers = Boolean(actualReceivedQuantity && calculatedBaseUnitQuantity && actualReceivedQuantity.replace(/(?:\.0+|(?<=\..*?)0+)$/, "") !== calculatedBaseUnitQuantity.replace(/(?:\.0+|(?<=\..*?)0+)$/, ""));

  function clearError(field: DeliveryReceiptField) {
    setErrors((current) => { if (!current[field]) return current; const next = { ...current }; delete next[field]; return next; });
    setFormError(null);
  }
  function fieldError(field: DeliveryReceiptField) {
    const messages = errors[field];
    return messages?.length ? <FieldError id={`delivery-receipt-${field}-error`} errors={messages.map((message) => ({ message }))} /> : null;
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setErrors({}); setFormError(null);
    const formData = new FormData(event.currentTarget); formData.set("purchaseOrderId", purchaseOrderId); formData.set("itemId", itemId); formData.set("receiptDate", receiptDate); if (!actualReceivedQuantity) formData.delete("actualReceivedBaseUnitQuantity");
    const [selectedUnitId, conversionId] = selectedUnitValue.split(":"); formData.set("selectedUnitId", selectedUnitId ?? ""); if (conversionId) formData.set("conversionId", conversionId);
    startTransition(async () => {
      const result = await postDeliveryReceiptAction(formData);
      if (result.status === "success") { router.push(`/purchase-orders/${purchaseOrderId}#delivery-receipt-${result.receipt.id}`); return; }
      setErrors(result.fields); setFormError(result.error);
    });
  }
  return <form aria-label="Record delivery" aria-busy={isPosting} className="flex flex-col gap-6" noValidate onSubmit={submit}>
    {formError ? <Alert variant="destructive"><AlertTitle>Could not post Delivery Receipt</AlertTitle><AlertDescription>{formError}</AlertDescription></Alert> : null}
    <FieldGroup>
      <Field data-invalid={Boolean(errors.receiptNo?.length)}><FieldLabel htmlFor="delivery-receipt-receiptNo">Receipt number <span className="text-destructive" aria-hidden="true">*</span></FieldLabel><Input id="delivery-receipt-receiptNo" name="receiptNo" maxLength={100} required aria-invalid={Boolean(errors.receiptNo?.length)} aria-describedby={errors.receiptNo?.length ? "delivery-receipt-receiptNo-error" : undefined} onChange={() => clearError("receiptNo")} />{fieldError("receiptNo")}</Field>
      <Field data-invalid={Boolean(errors.receiptDate?.length)}><FieldLabel htmlFor="delivery-receipt-receiptDate">Receipt date <span className="text-destructive" aria-hidden="true">*</span></FieldLabel><Input id="delivery-receipt-receiptDate" name="receiptDate" type="date" value={receiptDate} required aria-invalid={Boolean(errors.receiptDate?.length)} aria-describedby={errors.receiptDate?.length ? "delivery-receipt-receiptDate-error" : undefined} onChange={(event) => { setReceiptDate(event.target.value); clearError("receiptDate"); }} />{fieldError("receiptDate")}</Field>
      <Field data-invalid={Boolean(errors.note?.length)}><FieldLabel htmlFor="delivery-receipt-note">Receipt note <span className="text-muted-foreground">(optional)</span></FieldLabel><Textarea id="delivery-receipt-note" name="note" rows={3} maxLength={500} aria-invalid={Boolean(errors.note?.length)} aria-describedby={errors.note?.length ? "delivery-receipt-note-error" : undefined} onChange={() => clearError("note")} />{fieldError("note")}</Field>
      <Field data-invalid={Boolean(errors.itemId?.length)}><FieldLabel htmlFor="delivery-receipt-itemId">Item <span className="text-destructive" aria-hidden="true">*</span></FieldLabel><Select items={items.map((item) => ({ value: item.id, label: item.name }))} value={itemId || null} onValueChange={(value) => { setItemId(value ?? ""); setSelectedUnitValue(value ? `${items.find((item) => item.id === value)?.baseUnit.id}:` : ""); clearError("itemId"); clearError("selectedUnitId"); }}><SelectTrigger id="delivery-receipt-itemId" className="w-full" aria-invalid={Boolean(errors.itemId?.length)} aria-describedby={errors.itemId?.length ? "delivery-receipt-itemId-error" : undefined}><SelectValue placeholder="Select an active Item" /></SelectTrigger><SelectContent><SelectGroup>{items.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectGroup></SelectContent></Select>{fieldError("itemId")}</Field>
      <Field data-invalid={Boolean(errors.selectedUnitId?.length)}><FieldLabel htmlFor="delivery-receipt-selectedUnitId">Unit <span className="text-destructive" aria-hidden="true">*</span></FieldLabel><Select value={selectedUnitValue || null} disabled={!selectedItem} onValueChange={(value) => { setSelectedUnitValue(value ?? ""); clearError("selectedUnitId"); }}><SelectTrigger id="delivery-receipt-selectedUnitId" className="w-full" aria-invalid={Boolean(errors.selectedUnitId?.length)} aria-describedby={errors.selectedUnitId?.length ? "delivery-receipt-selectedUnitId-error" : undefined}><SelectValue placeholder="Select an Item first" /></SelectTrigger><SelectContent><SelectGroup>{selectedItem ? <><SelectItem value={`${selectedItem.baseUnit.id}:`}>{selectedItem.baseUnit.name} ({selectedItem.baseUnit.abbreviation})</SelectItem>{selectedItem.unitConversions?.filter((conversion) => conversion.alternateUnit.active).map((conversion) => <SelectItem key={conversion.id} value={`${conversion.alternateUnit.id}:${conversion.id}`}>{conversion.label}</SelectItem>)}</> : null}</SelectGroup></SelectContent></Select>{fieldError("selectedUnitId")}</Field>
      <Field data-invalid={Boolean(errors.quantity?.length)}><FieldLabel htmlFor="delivery-receipt-quantity">Quantity <span className="text-destructive" aria-hidden="true">*</span></FieldLabel><Input id="delivery-receipt-quantity" name="quantity" inputMode="decimal" value={quantity} required aria-invalid={Boolean(errors.quantity?.length)} aria-describedby={errors.quantity?.length ? "delivery-receipt-quantity-error" : undefined} onChange={(event) => { setQuantity(event.target.value); clearError("quantity"); }} />{fieldError("quantity")}</Field>
      <Field><FieldLabel htmlFor="delivery-receipt-calculatedBaseUnitQuantity">Calculated Base Unit quantity</FieldLabel><Input id="delivery-receipt-calculatedBaseUnitQuantity" value={calculatedBaseUnitQuantity ?? "Enter a positive quantity"} readOnly aria-label="Calculated Base Unit quantity" /></Field>
      <Field data-invalid={Boolean(errors.actualReceivedBaseUnitQuantity?.length)}><FieldLabel htmlFor="delivery-receipt-actualReceivedBaseUnitQuantity">Actual received Base Unit quantity <span className="text-muted-foreground">(defaults to calculation)</span></FieldLabel><Input id="delivery-receipt-actualReceivedBaseUnitQuantity" name="actualReceivedBaseUnitQuantity" inputMode="decimal" value={actualReceivedQuantity} placeholder={calculatedBaseUnitQuantity ?? "Enter a positive quantity first"} aria-invalid={Boolean(errors.actualReceivedBaseUnitQuantity?.length)} onChange={(event) => { setActualReceivedQuantity(event.target.value); clearError("actualReceivedBaseUnitQuantity"); }} />{fieldError("actualReceivedBaseUnitQuantity")}</Field>
      {actualQuantityDiffers ? <Field data-invalid={Boolean(errors.varianceNote?.length)}><FieldLabel htmlFor="delivery-receipt-varianceNote">Variance note <span className="text-destructive" aria-hidden="true">*</span></FieldLabel><Textarea id="delivery-receipt-varianceNote" name="varianceNote" rows={2} maxLength={500} required aria-invalid={Boolean(errors.varianceNote?.length)} onChange={() => clearError("varianceNote")} />{fieldError("varianceNote")}</Field> : null}
    </FieldGroup>
    <div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="outline" disabled={isPosting} onClick={() => router.push(`/purchase-orders/${purchaseOrderId}`)}>Cancel</Button><Button type="submit" disabled={isPosting || items.length === 0}>{isPosting ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />} {isPosting ? "Posting..." : "Post delivery"}</Button></div>
  </form>;
}
