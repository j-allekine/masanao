"use client";

import { useRef, useState } from "react";
import type { IssuanceReviewItem } from "../types";
import { AlertTriangle, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { isValidIssuanceFinalQuantity } from "../domain/quantities";
import { useItemDisplayUnit } from "@/features/supply-operations/components/item-display-unit";
import { formatConvertedQuantity } from "@/features/supply-operations/domain/inventory-display-unit";
import { formatDisplayNumber, ungroupDisplayNumber } from "@/lib/format-display-number";
import { addRational, compareRational, decimalRational, finiteDecimal, rational } from "../domain/rational";
import { Badge } from "@/components/ui/badge";

type ReviewRow = IssuanceReviewItem;

function ReviewQuantities({ row }: { row: ReviewRow }) {
  const { selector, unit, factor } = useItemDisplayUnit({
    id: row.itemId, name: row.itemName, baseUnit: { name: row.baseUnitName, abbreviation: row.baseUnitAbbreviation },
    unitConversions: row.unitConversions ?? [],
  });
  const final = decimalRational(row.finalQuantity);
  const available = decimalRational(row.availableQuantity);
  const calculated = rational(BigInt(row.calculatedNumerator), BigInt(row.calculatedDenominator));
  const display = (value: ReturnType<typeof rational>) => {
    const exact = factor ? null : finiteDecimal(value);
    return `${exact === null ? formatConvertedQuantity(value, factor) : formatDisplayNumber(exact)} ${unit.abbreviation}`;
  };
  const shortfall = row.shortage ? addRational(final, rational(-available.numerator, available.denominator)) : null;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <dl className="grid min-w-0 grid-cols-1 gap-x-4 gap-y-1 text-body-sm sm:grid-cols-4">
        <div className="grid min-w-0 grid-cols-[6rem_minmax(0,1fr)] gap-2 sm:block">
          <dt className="text-muted-foreground">Final quantity</dt>
          <dd className="min-w-0 wrap-anywhere text-right font-medium tabular-nums sm:text-left">{display(final)}</dd>
        </div>
        <div className="grid min-w-0 grid-cols-[6rem_minmax(0,1fr)] gap-2 sm:block">
          <dt className="text-muted-foreground">Available</dt>
          <dd className="min-w-0 wrap-anywhere text-right tabular-nums sm:text-left">{display(available)}</dd>
        </div>
        <div className="grid min-w-0 grid-cols-[6rem_minmax(0,1fr)] gap-2 sm:block">
          <dt className="text-muted-foreground">Short by</dt>
          <dd className="min-w-0 wrap-anywhere text-right tabular-nums sm:text-left">{shortfall ? <span className="font-medium text-destructive">{display(shortfall)}</span> : "—"}</dd>
        </div>
        {selector ? <div className="grid min-w-0 grid-cols-[6rem_minmax(0,1fr)] items-center gap-2 sm:block"><dt className="text-muted-foreground">Unit</dt><dd className="text-right sm:text-left">{selector}</dd></div> : null}
      </dl>
      {compareRational(calculated, final) !== 0 || row.warning ? (
        <p className="wrap-anywhere text-body-sm text-muted-foreground">Calculated {display(calculated)}</p>
      ) : null}
      {factor ? <p className="wrap-anywhere text-xs text-muted-foreground">Base unit: {formatDisplayNumber(row.finalQuantity)} {row.baseUnitAbbreviation} final · {formatDisplayNumber(row.availableQuantity)} {row.baseUnitAbbreviation} available</p> : null}
    </div>
  );
}

export default function QuantityReviewDialog({
  rows,
  pendingPax,
  pendingItemIds,
  demandLockedItemIds,
  onClose,
  onConfirm,
  onReset,
  onSave,
  saving,
  canSave,
  error: saveError,
  notice,
}: {
  rows: ReviewRow[];
  pendingPax: boolean;
  pendingItemIds: string[];
  demandLockedItemIds: string[];
  onClose: () => void;
  onConfirm: (itemId: string, quantity: string) => void;
  onReset: (itemId: string) => void;
  onSave: () => void;
  saving: boolean;
  canSave: boolean;
  error: string;
  notice: string;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState("");
  const quantityRef = useRef<HTMLInputElement>(null);
  function confirm(row: ReviewRow) {
    const exactQuantity = ungroupDisplayNumber(quantity);
    if (!isValidIssuanceFinalQuantity(exactQuantity, row.policy)) {
      setError(
        row.policy === "whole-only"
          ? "Enter a positive whole quantity for this Item."
          : "Enter a positive decimal quantity.",
      );
      requestAnimationFrame(() => quantityRef.current?.focus());
      return;
    }
    onConfirm(row.itemId, exactQuantity);
    setEditing(null);
    setError("");
  }
  const orderedRows = [...rows].sort((a, b) => Number(Boolean(b.warning || b.shortage)) - Number(Boolean(a.warning || a.shortage)));
  const shortageCount = rows.filter((row) => row.shortage).length;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent
        finalFocus={() => document.getElementById("issuance-review")}
        showCloseButton={!saving}
        className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-3xl"
      >
        <DialogHeader>
          <DialogTitle>Combined quantities and stock</DialogTitle>
          <DialogDescription>
            {shortageCount ? `${formatDisplayNumber(shortageCount)} ${shortageCount === 1 ? "item" : "items"} short. ` : ""}
            Stock is checked again when posting.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto px-1 pb-1">
          {pendingPax ? (
            <Alert>
              <AlertTriangle aria-label="Review incomplete" />
              <AlertDescription>
                Meal pax pending. This review is incomplete; displayed quantities
                are known contributions only.
              </AlertDescription>
            </Alert>
          ) : null}
          {rows.length === 0 ? (
            <p>No calculated Item quantities yet.</p>
          ) : (
            <ul className="divide-y">
              {orderedRows.map((row) => (
                <li
                  key={row.itemId}
                  className="grid min-w-0 grid-cols-1 gap-2 py-3 first:pt-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,3fr)_auto] sm:items-start"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 sm:flex-col sm:items-start">
                    <h3 className="break-words font-semibold">{row.itemName}</h3>
                    <Badge variant={row.warning || row.shortage ? "destructive" : "secondary"}>{row.warning ? "Needs confirmation" : row.shortage ? "Shortage" : row.adjusted ? "Adjusted" : "Stock sufficient"}</Badge>
                  </div>
                  <ReviewQuantities row={row} />
                  {row.warning ? (
                    <Alert variant="destructive" className="sm:col-span-full">
                      <AlertTriangle aria-label="Quantity requires review" />
                      <AlertDescription>
                        {row.warning === "fractional"
                          ? "This whole-only Item has a fractional total. Confirm a positive whole final quantity."
                          : "This positive demand rounds to zero. Confirm a positive final quantity."}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  {demandLockedItemIds.includes(row.itemId) ? (
                    <p className="flex items-start gap-2 text-body-sm sm:col-span-full">
                      <LockKeyhole
                        aria-label="Demand locked"
                        className="mt-0.5 size-4 shrink-0"
                      />
                      <span>
                        {row.adjusted
                          ? "Adjusted. Reset this confirmation"
                          : "Confirmation changed. Save confirmation or reset"}{" "}
                        before changing demand for {row.itemName}. Recipe
                        contributions remain calculated.
                      </span>
                    </p>
                  ) : null}
                  {editing === row.itemId ? (
                    <FieldGroup className="sm:col-span-full">
                      <Field data-invalid={Boolean(error)}>
                        <FieldLabel htmlFor={`final-${row.itemId}`} required>
                          Final quantity for {row.itemName}
                        </FieldLabel>
                        <Input
                          disabled={saving}
                          id={`final-${row.itemId}`}
                          ref={quantityRef}
                          inputMode="decimal"
                          required
                          value={quantity}
                          aria-invalid={Boolean(error)}
                          aria-describedby={error ? `final-error-${row.itemId}` : `final-help-${row.itemId}`}
                          onChange={(event) => {
                            setQuantity(event.target.value);
                            setError("");
                          }}
                        />
                        <FieldDescription id={`final-help-${row.itemId}`}>
                          Enter the exact positive {row.policy === "whole-only" ? "whole " : ""}quantity in {row.baseUnitAbbreviation}.
                        </FieldDescription>
                        {error ? <FieldError id={`final-error-${row.itemId}`} visuallyHidden>{error}</FieldError> : null}
                      </Field>
                      <div className="flex flex-wrap gap-2">
                        <Button disabled={saving} onClick={() => confirm(row)}>
                          Confirm quantity
                        </Button>
                        <Button
                          variant="outline"
                          disabled={saving}
                          onClick={() => {
                            setEditing(null);
                            setError("");
                          }}
                        >
                          Cancel adjustment
                        </Button>
                      </div>
                    </FieldGroup>
                  ) : (
                    <div className="flex flex-wrap gap-2 sm:col-start-3 sm:row-start-1 sm:justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={saving || pendingItemIds.includes(row.itemId)}
                        aria-label={`Adjust issued quantity for ${row.itemName}`}
                        onClick={() => {
                          setEditing(row.itemId);
                          setQuantity(row.finalQuantity);
                          setError("");
                        }}
                      >
                        Adjust
                      </Button>
                      {demandLockedItemIds.includes(row.itemId) ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={saving}
                          aria-label={`Reset adjustment for ${row.itemName}`}
                          onClick={() => onReset(row.itemId)}
                        >
                          Reset
                        </Button>
                      ) : null}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {saveError ? <Alert variant="destructive"><AlertDescription>{saveError}</AlertDescription></Alert> : null}
          {notice === "Draft saved." ? <p role="status">{notice}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            Close review
          </Button>
          <Button disabled={saving || !canSave || editing !== null} onClick={onSave}>{saving ? "Saving…" : "Save draft"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
