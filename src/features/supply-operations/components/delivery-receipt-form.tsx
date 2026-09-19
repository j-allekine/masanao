"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { postDeliveryReceiptAction } from "../actions";
import { multiplyExactPositiveDecimals } from "../domain/delivery-receipt";
import type { ItemListItem } from "../types";

type Line = { id: string; itemId: string; unit: string; quantity: string; actual: string; varianceNote: string };
const newLine = (): Line => ({ id: crypto.randomUUID(), itemId: "", unit: "", quantity: "", actual: "", varianceNote: "" });
const decimal = (value: string) => { const [whole, fraction = ""] = value.split("."); return `${whole.replace(/^0+(?=\d)/, "") || "0"}.${fraction.replace(/0+$/, "")}`; };

export default function DeliveryReceiptForm({ purchaseOrderId, items }: { purchaseOrderId: string; items: ItemListItem[] }) {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [isPosting, startTransition] = useTransition();
  const update = (id: string, partial: Partial<Line>) => setLines((current) => current.map((line) => line.id === id ? { ...line, ...partial } : line));
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null);
    const data = new FormData(event.currentTarget);
    data.set("purchaseOrderId", purchaseOrderId); data.set("receiptDate", date);
    data.set("lines", JSON.stringify(lines.map(({ unit, actual, ...line }) => { const [selectedUnitId, conversionId] = unit.split(":"); return { ...line, selectedUnitId: selectedUnitId || undefined, conversionId: conversionId || undefined, actualReceivedBaseUnitQuantity: actual || undefined }; })));
    startTransition(async () => { const result = await postDeliveryReceiptAction(data); if (result.status === "success") router.push(`/purchase-orders/${purchaseOrderId}#delivery-receipt-${result.receipt.id}`); else setError(result.error); });
  }
  return <form aria-label="Record delivery" aria-busy={isPosting} className="flex flex-col gap-6" noValidate onSubmit={submit}>
    {error ? <Alert variant="destructive"><AlertTitle>Could not post Delivery Receipt</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
    <FieldGroup><Field><FieldLabel htmlFor="receiptNo">Receipt number <span className="text-destructive" aria-hidden="true">*</span></FieldLabel><Input id="receiptNo" name="receiptNo" required maxLength={100} /></Field><Field><FieldLabel htmlFor="receiptDate">Receipt date <span className="text-destructive" aria-hidden="true">*</span></FieldLabel><Input id="receiptDate" name="receiptDate" type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></Field><Field><FieldLabel htmlFor="note">Receipt note <span className="text-muted-foreground">(optional)</span></FieldLabel><Textarea id="note" name="note" rows={3} maxLength={500} /></Field></FieldGroup>
    <section aria-labelledby="delivery-lines" className="flex flex-col gap-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="delivery-lines" className="text-lg font-semibold">Delivery lines</h2><p className="text-sm text-muted-foreground">Record each accepted Item separately.</p></div><Button type="button" variant="outline" onClick={() => setLines((current) => [...current, newLine()])}><Plus data-icon="inline-start" />Add line</Button></div>
      {lines.map((line, index) => { const item = items.find((candidate) => candidate.id === line.itemId); const conversion = item?.unitConversions?.find((candidate) => `${candidate.alternateUnit.id}:${candidate.id}` === line.unit); const calculated = /^\d+(?:\.\d+)?$/.test(line.quantity) && /[1-9]/.test(line.quantity) ? multiplyExactPositiveDecimals(line.quantity, conversion?.baseUnitQuantity ?? "1") : null; const varies = Boolean(line.actual && calculated && decimal(line.actual) !== decimal(calculated)); return <section key={line.id} aria-label={`Delivery line ${index + 1}`} className="rounded-lg border p-4"><div className="mb-4 flex items-center justify-between gap-3"><h3 className="font-medium">Line {index + 1}</h3><Button type="button" variant="ghost" size="sm" disabled={lines.length === 1 || isPosting} onClick={() => setLines((current) => current.filter((candidate) => candidate.id !== line.id))}><Trash2 data-icon="inline-start" />Remove line</Button></div><FieldGroup><Field><FieldLabel>Item <span className="text-destructive">*</span></FieldLabel><Select items={items.map((candidate) => ({ value: candidate.id, label: candidate.name }))} value={line.itemId || null} onValueChange={(value) => { const selected = items.find((candidate) => candidate.id === value); update(line.id, { itemId: value ?? "", unit: selected ? `${selected.baseUnit.id}:` : "" }); }}><SelectTrigger className="w-full"><SelectValue placeholder="Select an active Item" /></SelectTrigger><SelectContent><SelectGroup>{items.map((candidate) => <SelectItem key={candidate.id} value={candidate.id}>{candidate.name}</SelectItem>)}</SelectGroup></SelectContent></Select></Field><Field><FieldLabel>Unit <span className="text-destructive">*</span></FieldLabel><Select value={line.unit || null} disabled={!item} onValueChange={(value) => update(line.id, { unit: value ?? "" })}><SelectTrigger className="w-full"><SelectValue placeholder="Select an Item first" /></SelectTrigger><SelectContent><SelectGroup>{item ? <><SelectItem value={`${item.baseUnit.id}:`}>{item.baseUnit.name} ({item.baseUnit.abbreviation})</SelectItem>{item.unitConversions?.filter((candidate) => candidate.alternateUnit.active).map((candidate) => <SelectItem key={candidate.id} value={`${candidate.alternateUnit.id}:${candidate.id}`}>{candidate.label}</SelectItem>)}</> : null}</SelectGroup></SelectContent></Select></Field><Field><FieldLabel>Quantity <span className="text-destructive">*</span></FieldLabel><Input inputMode="decimal" value={line.quantity} onChange={(event) => update(line.id, { quantity: event.target.value })} /></Field><Field><FieldLabel>Calculated Base Unit quantity</FieldLabel><Input value={calculated ?? "Enter a positive quantity"} readOnly /></Field><Field><FieldLabel>Actual received Base Unit quantity <span className="text-muted-foreground">(defaults to calculation)</span></FieldLabel><Input inputMode="decimal" value={line.actual} placeholder={calculated ?? "Enter a positive quantity first"} onChange={(event) => update(line.id, { actual: event.target.value })} /></Field>{varies ? <Field><FieldLabel>Variance note <span className="text-destructive">*</span></FieldLabel><Textarea rows={2} maxLength={500} required value={line.varianceNote} onChange={(event) => update(line.id, { varianceNote: event.target.value })} /></Field> : null}</FieldGroup></section>; })}
    </section><div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="outline" disabled={isPosting} onClick={() => router.push(`/purchase-orders/${purchaseOrderId}`)}>Cancel</Button><Button type="submit" disabled={isPosting || items.length === 0}>{isPosting ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}{isPosting ? "Posting..." : "Post delivery"}</Button></div></form>;
}
