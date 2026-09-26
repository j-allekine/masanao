"use client";

import { Fragment, useState, useSyncExternalStore, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import LocalDatePicker, { formatLocalDate } from "@/components/workspace/local-date-picker";

import { postDeliveryReceiptAction } from "../actions";
import { addExactPositiveDecimals, formatDeliveryReceiptAmount, isPositiveExactDecimal, multiplyExactPositiveDecimals, reindexLineErrorsAfterRemoval } from "../domain/delivery-receipt";
import type { DeliveryReceiptField, DeliveryReceiptFieldErrors, DeliveryReceiptLineFieldErrors, ItemListItem } from "../types";

type DeliveryReceiptLineField = keyof DeliveryReceiptLineFieldErrors;

type Line = {
  id: string;
  itemId: string;
  unit: string;
  quantity: string;
  unitPrice: string;
};

const initialLine: Line = {
  id: "initial",
  itemId: "",
  unit: "",
  quantity: "",
  unitPrice: "",
};

function createLine(): Line {
  return { ...initialLine, id: crypto.randomUUID() };
}

function localDate() {
  return formatLocalDate(new Date());
}

type ItemPickerProps = {
  items: ItemListItem[];
  value: string;
  invalid: boolean;
  describedBy?: string;
  id: string;
  onValueChange: (itemId: string, item?: ItemListItem) => void;
};

function ItemPicker({ items, value, invalid, describedBy, id, onValueChange }: ItemPickerProps) {
  const options = items.map((item) => ({ value: item.id, label: item.name, item }));

  if (!options.length) {
    return <Input id={id} aria-label="Item" aria-describedby={describedBy} aria-invalid={invalid} disabled value="No active Items available" readOnly />;
  }

  function selectItem(item: unknown) {
    if (typeof item === "string" && item) {
      onValueChange(item, items.find((candidate) => candidate.id === item));
      return;
    }
    if (item && typeof item === "object" && "value" in item && typeof item.value === "string" && item.value) {
      if ("item" in item && item.item && typeof item.item === "object") {
        onValueChange(item.value, item.item as ItemListItem);
        return;
      }
      const label = "label" in item && typeof item.label === "string" ? item.label : undefined;
      onValueChange(item.value, items.find((candidate) => candidate.id === item.value) ?? (label ? items.find((candidate) => candidate.name === label) : undefined));
    }
  }

  const selectedOption = options.find((option) => option.value === value) ?? null;

  return <Combobox items={options} value={selectedOption} onValueChange={(item) => { if (item !== null) selectItem(item); }}>
    <ComboboxInput
      id={id}
      aria-label="Item"
      aria-describedby={describedBy}
      aria-invalid={invalid}
      placeholder="Search active Items"
    />
    <ComboboxContent>
      <ComboboxList className="max-h-72">
            {(item: { value: string; label: string; item: ItemListItem }) => <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>}
      </ComboboxList>
      <ComboboxEmpty>
            No active Items match your search.
      </ComboboxEmpty>
    </ComboboxContent>
  </Combobox>;
}

export default function DeliveryReceiptForm({ purchaseOrderId, items, presentation = "page" }: { purchaseOrderId: string; items: ItemListItem[]; presentation?: "page" | "dialog" }) {
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

  function lineFieldError(index: number, field: DeliveryReceiptLineField, id: string) {
    const messages = errors.lines?.[index]?.[field] ?? (errors.lines ? undefined : errors[field]);
    return messages?.length
      ? <FieldError id={id} errors={messages.map((message) => ({ message }))} />
      : null;
  }

  function lineHasError(index: number, field: DeliveryReceiptLineField) {
    return Boolean(errors.lines?.[index]?.[field]?.length ?? (!errors.lines && errors[field]?.length));
  }

  function clearLineError(index: number, field: DeliveryReceiptLineField) {
    setErrors((current) => {
      const hasTopLevelError = Boolean(current[field]?.length);
      const line = current.lines?.[index];
      if (!hasTopLevelError && !line?.[field]) return current;

      const next = { ...current };
      if (hasTopLevelError) delete next[field];
      if (line?.[field]) {
        const nextLine = { ...line };
        delete nextLine[field];
        const nextLines = { ...current.lines };
        if (Object.keys(nextLine).length) nextLines[index] = nextLine;
        else delete nextLines[index];
        next.lines = Object.keys(nextLines).length ? nextLines : undefined;
      }
      return next;
    });
    setFormError(null);
  }

  function updateLine(id: string, next: Partial<Line>) {
    setLines((current) => current.map((value) => value.id === id ? { ...value, ...next } : value));
  }

  function focusItem(id: string) {
    requestAnimationFrame(() => document.getElementById(`item-${id}`)?.focus());
  }

  function addLine() {
    const line = createLine();
    setLines((current) => [...current, line]);
    focusItem(line.id);
  }

  function removeLine(id: string) {
    const removedIndex = lines.findIndex((line) => line.id === id);
    if (removedIndex < 0) return;
    const next = lines.filter((line) => line.id !== id);
    setLines((current) => current.filter((line) => line.id !== id));
    setErrors((currentErrors) => {
      const nextLines = reindexLineErrorsAfterRemoval(currentErrors.lines, removedIndex);
      if (nextLines === currentErrors.lines) return currentErrors;
      return { ...currentErrors, lines: nextLines };
    });
    setFormError(null);
    requestAnimationFrame(() => {
      const focusTarget = next[removedIndex] ?? next[removedIndex - 1];
      if (focusTarget) document.getElementById(`item-${focusTarget.id}`)?.focus();
      else document.getElementById("add-delivery-line")?.focus();
    });
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
      return {
        itemId: value.itemId,
        selectedUnitId: selectedUnitId || undefined,
        conversionId: conversionId || undefined,
        quantity: value.quantity,
        unitPrice: value.unitPrice,
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

  const receiptTotal = lines.reduce((total, value) => {
    if (!isPositiveExactDecimal(value.quantity) || !isPositiveExactDecimal(value.unitPrice)) return total;
    return addExactPositiveDecimals(total, multiplyExactPositiveDecimals(value.quantity, value.unitPrice));
  }, "0");

  return <form aria-label="Record delivery" aria-busy={posting} className={presentation === "dialog" ? "flex flex-col gap-6 px-6 py-5" : "flex flex-col gap-6"} data-client-ready={isHydrated ? "true" : undefined} noValidate onSubmit={submit}>
    {formError ? <Alert variant="destructive"><AlertTitle>Could not post Delivery Receipt</AlertTitle><AlertDescription>{formError}</AlertDescription></Alert> : null}
    <FieldGroup className="grid gap-4 sm:grid-cols-2">
      <Field data-invalid={Boolean(errors.receiptNo?.length)}>
        <FieldLabel htmlFor="receiptNo">Receipt number</FieldLabel>
        <Input id="receiptNo" name="receiptNo" aria-label="Receipt number" aria-invalid={Boolean(errors.receiptNo?.length)} aria-describedby={errors.receiptNo?.length ? "delivery-receipt-receiptNo-error" : undefined} maxLength={100} onChange={() => clearError("receiptNo")} required />
        {fieldError("receiptNo")}
      </Field>
      <LocalDatePicker id="receiptDate" name="receiptDate" label="Receipt date" emptyLabel="Select receipt date" value={date} error={errors.receiptDate} required onChange={(value) => { setDateOverride(value); clearError("receiptDate"); }} />
    </FieldGroup>

    <section aria-labelledby="delivery-lines-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <h2 id="delivery-lines-heading" className="text-heading-3 font-semibold">Delivery Receipt lines</h2>
            <p aria-live="polite" className="text-body-sm text-muted-foreground">{lines.length} {lines.length === 1 ? "line" : "lines"}</p>
          </div>
        </div>
        <Button id="add-delivery-line" type="button" variant="outline" onClick={addLine}><Plus data-icon="inline-start" />Add line</Button>
      </div>
      {lines.length ? <Table aria-label="Delivery Receipt lines" className="min-w-[60rem] table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[20%]">Item</TableHead>
            <TableHead className="w-[14%]">Unit</TableHead>
            <TableHead className="w-[12%] whitespace-nowrap" aria-label="Delivered quantity">Delivered Qty</TableHead>
            <TableHead className="w-[15%] whitespace-nowrap" aria-label="Base Unit quantity">Base Unit Qty</TableHead>
            <TableHead className="w-[14%] whitespace-nowrap">Unit price</TableHead>
            <TableHead className="w-[17%]">Amount</TableHead>
            <TableHead className="w-[8%] text-right">Remove</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
      {lines.map((value, index) => {
        const item = items.find((candidate) => candidate.id === value.itemId);
        const conversion = item?.unitConversions?.find((candidate) => `${candidate.alternateUnit.id}:${candidate.id}` === value.unit);
        const calculated = /^\d+(?:\.\d+)?$/.test(value.quantity) && /[1-9]/.test(value.quantity)
          ? multiplyExactPositiveDecimals(value.quantity, conversion?.baseUnitQuantity ?? "1")
          : "";
        const lineAmount = calculated && /^\d+(?:\.\d+)?$/.test(value.unitPrice) && /[1-9]/.test(value.unitPrice)
          ? multiplyExactPositiveDecimals(value.quantity, value.unitPrice)
          : "";
        const errorId = (field: DeliveryReceiptField) => `delivery-receipt-${value.id}-${field}-error`;

        return <Fragment key={value.id}><TableRow aria-label={`Delivery line ${index + 1}`}>
            <TableCell className="align-top whitespace-normal">
            <Field data-invalid={lineHasError(index, "itemId")}>
              <FieldLabel className="sr-only">Item</FieldLabel>
              <ItemPicker id={`item-${value.id}`} items={items} value={value.itemId} invalid={lineHasError(index, "itemId")} describedBy={lineHasError(index, "itemId") ? errorId("itemId") : undefined} onValueChange={(itemId, selectedItem) => {
                const selected = selectedItem ?? items.find((candidate) => candidate.id === itemId);
                updateLine(value.id, { itemId, unit: selected ? `${selected.baseUnit.id}:` : "", quantity: "", unitPrice: "" });
                clearLineError(index, "itemId"); clearLineError(index, "selectedUnitId"); clearLineError(index, "quantity"); clearLineError(index, "unitPrice");
              }} />
              {lineFieldError(index, "itemId", errorId("itemId"))}
            </Field>
            </TableCell>
            <TableCell className="align-top whitespace-normal">
            <Field data-invalid={lineHasError(index, "selectedUnitId")}>
              <FieldLabel className="sr-only">Unit</FieldLabel>
              <Select items={item ? [{ value: `${item.baseUnit.id}:`, label: `${item.baseUnit.name} (${item.baseUnit.abbreviation})` }, ...(item.unitConversions?.filter((candidate) => candidate.alternateUnit.active).map((candidate) => ({ value: `${candidate.alternateUnit.id}:${candidate.id}`, label: candidate.label })) ?? [])] : []} value={value.unit || null} disabled={!item} onValueChange={(unit) => {
                if (unit === null) return;
                updateLine(value.id, { unit: unit ?? "", quantity: "", unitPrice: "" });
                clearLineError(index, "selectedUnitId"); clearLineError(index, "quantity"); clearLineError(index, "unitPrice");
              }}>
                <SelectTrigger aria-label="Unit" aria-invalid={lineHasError(index, "selectedUnitId")} aria-describedby={lineHasError(index, "selectedUnitId") ? errorId("selectedUnitId") : undefined} className="w-full"><SelectValue placeholder="Select an Item first" /></SelectTrigger>
                <SelectContent><SelectGroup>{item ? <><SelectItem value={`${item.baseUnit.id}:`}>{item.baseUnit.name} ({item.baseUnit.abbreviation})</SelectItem>{item.unitConversions?.filter((candidate) => candidate.alternateUnit.active).map((candidate) => <SelectItem key={candidate.id} value={`${candidate.alternateUnit.id}:${candidate.id}`}>{candidate.label}</SelectItem>)}</> : null}</SelectGroup></SelectContent>
              </Select>
              {lineFieldError(index, "selectedUnitId", errorId("selectedUnitId"))}
            </Field>
            </TableCell>
            <TableCell className="align-top whitespace-normal">
            <Field data-invalid={lineHasError(index, "quantity")}>
              <FieldLabel className="sr-only" htmlFor={`quantity-${value.id}`}>Quantity</FieldLabel>
              <Input id={`quantity-${value.id}`} aria-label="Quantity" aria-invalid={lineHasError(index, "quantity")} aria-describedby={lineHasError(index, "quantity") ? errorId("quantity") : undefined} inputMode="decimal" value={value.quantity} onChange={(event) => { updateLine(value.id, { quantity: event.target.value }); clearLineError(index, "quantity"); }} required />
              {lineFieldError(index, "quantity", errorId("quantity"))}
            </Field>
            </TableCell>
            <TableCell className="align-top whitespace-normal">
            <Field>
              <FieldLabel className="sr-only" htmlFor={`calculated-${value.id}`}>Calculated Base Unit quantity</FieldLabel>
              <Input id={`calculated-${value.id}`} aria-label="Calculated Base Unit quantity" value={calculated ? `${calculated} ${item?.baseUnit.abbreviation ?? item?.baseUnit.name ?? "Base Units"}` : ""} readOnly />
            </Field>
            </TableCell>
            <TableCell className="align-top whitespace-normal">
            <Field data-invalid={lineHasError(index, "unitPrice")}>
              <FieldLabel className="sr-only" htmlFor={`unit-price-${value.id}`}>Unit price</FieldLabel>
              <InputGroup>
                <InputGroupAddon><InputGroupText>₱</InputGroupText></InputGroupAddon>
                <InputGroupInput id={`unit-price-${value.id}`} aria-label="Unit price" className="text-right" aria-invalid={lineHasError(index, "unitPrice")} aria-describedby={lineHasError(index, "unitPrice") ? errorId("unitPrice") : undefined} inputMode="decimal" placeholder="0.00" value={value.unitPrice} onChange={(event) => { updateLine(value.id, { unitPrice: event.target.value }); clearLineError(index, "unitPrice"); }} required />
              </InputGroup>
              {lineFieldError(index, "unitPrice", errorId("unitPrice"))}
            </Field>
            </TableCell>
            <TableCell className="align-top text-right whitespace-normal">
              <Field>
                <FieldLabel className="sr-only" htmlFor={`amount-${value.id}`}>Amount</FieldLabel>
                <InputGroup>
                  <InputGroupAddon><InputGroupText>₱</InputGroupText></InputGroupAddon>
                  <InputGroupInput id={`amount-${value.id}`} aria-label="Amount" className="text-right" value={formatDeliveryReceiptAmount(lineAmount)} readOnly />
                </InputGroup>
              </Field>
            </TableCell>
            <TableCell className="align-top text-right whitespace-normal">
              <Tooltip>
                <TooltipTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove delivery line ${index + 1}`} onClick={() => removeLine(value.id)}><Trash2 /></Button>} />
                <TooltipContent>Remove delivery line {index + 1}</TooltipContent>
              </Tooltip>
            </TableCell>
        </TableRow></Fragment>;
      })}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={5} />
            <TableCell className="text-right">
              <div className="flex items-baseline justify-end gap-2">
                <span>Total</span>
                <span>₱ {formatDeliveryReceiptAmount(receiptTotal)}</span>
              </div>
            </TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table> : <Empty>
        <EmptyHeader><EmptyTitle>No Delivery Receipt lines</EmptyTitle><EmptyDescription>Add a line before posting this delivery.</EmptyDescription></EmptyHeader>
        <EmptyContent><Button type="button" variant="outline" onClick={addLine}><Plus data-icon="inline-start" />Add line</Button></EmptyContent>
      </Empty>}
    </section>

    <Field data-invalid={Boolean(errors.note?.length)}>
      <FieldLabel htmlFor="note">Receipt note</FieldLabel>
      <Textarea id="note" name="note" aria-invalid={Boolean(errors.note?.length)} aria-describedby={errors.note?.length ? "delivery-receipt-note-error" : undefined} maxLength={500} onChange={() => clearError("note")} />
      {fieldError("note")}
    </Field>

    {presentation === "dialog" ? <DialogFooter className="sticky bottom-0 z-10 mx-0 mb-0 rounded-none px-6 py-4">
      <Button type="button" variant="outline" disabled={posting} onClick={() => router.push(`/purchase-orders/${purchaseOrderId}`)}>Cancel</Button>
      <Button type="submit" disabled={posting || !items.length || !lines.length}>{posting ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}{posting ? "Posting..." : "Post delivery"}</Button>
    </DialogFooter> : <div className="flex flex-wrap justify-end gap-3">
      <Button type="button" variant="outline" disabled={posting} onClick={() => router.push(`/purchase-orders/${purchaseOrderId}`)}>Cancel</Button>
      <Button type="submit" disabled={posting || !items.length || !lines.length}>{posting ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}{posting ? "Posting..." : "Post delivery"}</Button>
    </div>}
  </form>;
}
