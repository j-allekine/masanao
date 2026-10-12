"use client";

import { useState } from "react";
import type { IssuanceReviewItem } from "../types";
import { AlertTriangle, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
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
import { isPositiveExactDecimal } from "@/features/supply-operations/domain/delivery-receipt";

type ReviewRow = IssuanceReviewItem;

export default function QuantityReviewDialog({
  rows,
  pendingPax,
  pendingItemIds,
  demandLockedItemIds,
  onClose,
  onConfirm,
  onReset,
}: {
  rows: ReviewRow[];
  pendingPax: boolean;
  pendingItemIds: string[];
  demandLockedItemIds: string[];
  onClose: () => void;
  onConfirm: (itemId: string, quantity: string) => void;
  onReset: (itemId: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState("");
  function confirm(row: ReviewRow) {
    if (
      !isPositiveExactDecimal(quantity) ||
      (row.policy === "whole-only" && !/^\d+(?:\.0+)?$/.test(quantity))
    ) {
      setError(
        row.policy === "whole-only"
          ? "Enter a positive whole quantity for this Item."
          : "Enter a positive decimal quantity.",
      );
      return;
    }
    onConfirm(row.itemId, quantity);
    setEditing(null);
    setError("");
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        finalFocus={() => document.getElementById("issuance-review")}
        className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>Combined quantities and stock</DialogTitle>
          <DialogDescription>
            Recipes and Stock items are combined by Item in Base Units. Save
            draft to persist confirmations. Stock checks are advisory until
            posting.
          </DialogDescription>
        </DialogHeader>
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
          <ul className="flex flex-col gap-3">
            {rows.map((row) => (
              <li
                key={row.itemId}
                className="flex min-w-0 flex-col gap-3 rounded-lg border p-3"
              >
                <h3 className="break-words font-semibold">{row.itemName}</h3>
                <dl className="grid min-w-0 grid-cols-1 sm:grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-body-sm">
                  <dt>Calculated</dt>
                  <dd className="break-words tabular-nums">
                    {row.calculatedApproximate ? "≈ " : ""}
                    {row.calculatedQuantity} {row.baseUnitAbbreviation}
                    {row.calculatedApproximate ? " (approximate)" : ""}
                  </dd>
                  <dt>Final quantity</dt>
                  <dd className="break-words tabular-nums">
                    {row.finalQuantity} {row.baseUnitAbbreviation}
                  </dd>
                  <dt>Available</dt>
                  <dd className="break-words tabular-nums">
                    {row.availableQuantity} {row.baseUnitAbbreviation}
                  </dd>
                </dl>
                {row.warning ? (
                  <Alert variant="destructive">
                    <AlertTriangle aria-label="Quantity requires review" />
                    <AlertDescription>
                      {row.warning === "fractional"
                        ? "This whole-only Item has a fractional total. Confirm a positive whole final quantity."
                        : "This positive demand rounds to zero. Confirm a positive final quantity."}
                    </AlertDescription>
                  </Alert>
                ) : null}
                {row.shortage ? (
                  <Alert variant="destructive">
                    <AlertTriangle aria-label="Insufficient stock" />
                    <AlertDescription>
                      Shortage: required {row.finalQuantity}{" "}
                      {row.baseUnitAbbreviation}; available{" "}
                      {row.availableQuantity} {row.baseUnitAbbreviation}.
                    </AlertDescription>
                  </Alert>
                ) : null}
                {demandLockedItemIds.includes(row.itemId) ? (
                  <p className="flex items-start gap-2 text-body-sm">
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
                  <FieldGroup>
                    <Field data-invalid={Boolean(error)}>
                      <FieldLabel htmlFor={`final-${row.itemId}`}>
                        Final quantity for {row.itemName}
                      </FieldLabel>
                      <Input
                        id={`final-${row.itemId}`}
                        inputMode="decimal"
                        value={quantity}
                        aria-invalid={Boolean(error)}
                        aria-describedby={`final-help-${row.itemId}`}
                        onChange={(event) => {
                          setQuantity(event.target.value);
                          setError("");
                        }}
                      />
                      <FieldDescription id={`final-help-${row.itemId}`}>
                        {error ||
                          `Enter the exact positive ${row.policy === "whole-only" ? "whole " : ""}quantity in ${row.baseUnitAbbreviation}.`}
                      </FieldDescription>
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => confirm(row)}>
                        Confirm quantity
                      </Button>
                      <Button
                        variant="outline"
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
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={pendingItemIds.includes(row.itemId)}
                      aria-label={`Adjust issued quantity for ${row.itemName}`}
                      onClick={() => {
                        setEditing(row.itemId);
                        setQuantity(row.finalQuantity);
                        setError("");
                      }}
                    >
                      Adjust issued quantity
                    </Button>
                    {demandLockedItemIds.includes(row.itemId) ? (
                      <Button
                        variant="ghost"
                        aria-label={`Reset adjustment for ${row.itemName}`}
                        onClick={() => onReset(row.itemId)}
                      >
                        Reset adjustment
                      </Button>
                    ) : null}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
