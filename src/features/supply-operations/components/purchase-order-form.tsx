"use client";

import {
  useEffect,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Plus, Save } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

import {
  createPurchaseOrderAction,
  updatePurchaseOrderAction,
} from "../actions";
import type {
  PurchaseOrderField,
  PurchaseOrderFieldErrors,
  PurchaseOrderFormActionState,
  PurchaseOrderListItem,
  PurchaseOrderVendorOption,
} from "../types";

type PurchaseOrderFormValues = Record<PurchaseOrderField, string>;

const emptyFormValues: PurchaseOrderFormValues = {
  purchaseOrderNo: "",
  vendorId: "",
  referenceNumber: "",
  note: "",
};

function initialValues(purchaseOrder?: PurchaseOrderListItem) {
  if (!purchaseOrder) return emptyFormValues;

  return {
    purchaseOrderNo: purchaseOrder.purchaseOrderNo,
    vendorId: purchaseOrder.vendor.id,
    referenceNumber: purchaseOrder.referenceNumber ?? "",
    note: purchaseOrder.note ?? "",
  } satisfies PurchaseOrderFormValues;
}

function PurchaseOrderFieldError({
  id,
  errors,
}: {
  id: string;
  errors?: string[];
}) {
  if (!errors?.length) return null;

  return (
    <FieldError
      id={`${id}-error`}
      errors={errors.map((message) => ({ message }))}
    />
  );
}

function VendorField({
  mode,
  value,
  error,
  vendors,
  currentVendorId,
  onValueChange,
}: {
  mode: "create" | "edit";
  value: string;
  error?: string[];
  vendors: PurchaseOrderVendorOption[];
  currentVendorId?: string;
  onValueChange: (value: string) => void;
}) {
  const inputId = `${mode}-purchase-order-vendorId`;
  const hasError = Boolean(error?.length);
  const vendorOptions = vendors
    .filter((vendor) => vendor.isActive || vendor.id === currentVendorId)
    .map((vendor) => ({
      id: vendor.id,
      label: vendor.name,
    }));
  const lookupItems =
    vendorOptions.length > 0
      ? vendorOptions.map((vendor) => ({
          value: vendor.id,
          label: vendor.label,
        }))
      : [{ value: "__none", label: "No active Vendors available" }];

  return (
    <Field data-invalid={hasError}>
      <FieldLabel htmlFor={inputId}>
        Vendor
        <span className="text-destructive" aria-hidden="true">
          *
        </span>
      </FieldLabel>
      <Select
        items={lookupItems}
        value={value || null}
        onValueChange={(nextValue) => onValueChange(nextValue ?? "")}
        disabled={vendorOptions.length === 0}
      >
        <SelectTrigger
          id={inputId}
          className="w-full"
          aria-invalid={hasError}
          aria-describedby={hasError ? `${inputId}-error` : undefined}
        >
          <SelectValue placeholder="Select a Vendor" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {vendorOptions.length > 0 ? (
              vendorOptions.map((vendor) => (
                <SelectItem key={vendor.id} value={vendor.id}>
                  {vendor.label}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="__none" disabled>
                No active Vendors available
              </SelectItem>
            )}
          </SelectGroup>
        </SelectContent>
      </Select>
      <PurchaseOrderFieldError id={inputId} errors={error} />
    </Field>
  );
}

export default function PurchaseOrderForm({
  mode,
  purchaseOrder,
  vendors,
  onCancel,
  onSuccess,
  onDirtyChange,
}: {
  mode: "create" | "edit";
  purchaseOrder?: PurchaseOrderListItem;
  vendors: PurchaseOrderVendorOption[];
  onCancel: () => void;
  onSuccess: (purchaseOrder: PurchaseOrderListItem) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const initialFormValues = initialValues(purchaseOrder);
  const [formValues, setFormValues] =
    useState<PurchaseOrderFormValues>(initialFormValues);
  const [fieldErrors, setFieldErrors] = useState<PurchaseOrderFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();
  const isDirty = (Object.keys(initialFormValues) as PurchaseOrderField[]).some(
    (field) => formValues[field] !== initialFormValues[field],
  );

  const currentVendor = purchaseOrder
    ? vendors.find((vendor) => vendor.id === purchaseOrder.vendor.id) ??
      purchaseOrder.vendor
    : undefined;
  const vendorOptions =
    currentVendor &&
    !currentVendor.isActive &&
    !vendors.some((vendor) => vendor.id === currentVendor.id)
      ? [...vendors, currentVendor]
      : vendors;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    const firstInvalidField = (
      [
        "purchaseOrderNo",
        "vendorId",
        "referenceNumber",
        "note",
      ] as PurchaseOrderField[]
    ).find((field) => fieldErrors[field]?.length);

    if (!firstInvalidField) return;

    const targetId = `${mode}-purchase-order-${firstInvalidField}`;
    const timeoutId = window.setTimeout(() => {
      document.getElementById(targetId)?.focus();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fieldErrors, mode]);

  function updateField(field: PurchaseOrderField, value: string) {
    setFormValues((currentValues) => ({ ...currentValues, [field]: value }));
    setFieldErrors((currentErrors) => {
      if (!currentErrors[field]) return currentErrors;

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
    setFormError(null);
  }

  function handleResult(result: PurchaseOrderFormActionState) {
    if (result.status === "error") {
      setFormError(result.error);
      setFieldErrors(result.fields);
      return;
    }

    onSuccess(result.purchaseOrder);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    if (mode === "edit" && purchaseOrder) {
      formData.set("id", purchaseOrder.id);
    }
    for (const field of Object.keys(initialFormValues) as PurchaseOrderField[]) {
      if (
        (field === "referenceNumber" || field === "note") &&
        formValues[field] === ""
      ) {
        formData.delete(field);
      } else {
        formData.set(field, formValues[field]);
      }
    }

    startTransition(async () => {
      try {
        const result =
          mode === "create"
            ? await createPurchaseOrderAction(formData)
            : await updatePurchaseOrderAction(formData);
        handleResult(result);
      } catch {
        setFormError(
          "The Purchase Order could not be saved. Check your connection and try again.",
        );
      }
    });
  }

  function handleTextChange(
    field: "purchaseOrderNo" | "referenceNumber" | "note",
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    updateField(field, event.target.value);
  }

  if (mode === "edit" && !purchaseOrder) return null;

  const hasEligibleVendor = vendorOptions.some(
    (vendor) =>
      vendor.isActive ||
      (mode === "edit" && vendor.id === purchaseOrder?.vendor.id),
  );

  return (
    <form
      aria-label={`${mode === "create" ? "Create" : "Edit"} Purchase Order`}
      aria-busy={isSubmitting}
      className="flex min-h-0 flex-col"
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-1 py-2">
        {formError ? (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Could not save Purchase Order</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <FieldGroup>
          <Field data-invalid={Boolean(fieldErrors.purchaseOrderNo?.length)}>
            <FieldLabel htmlFor={`${mode}-purchase-order-purchaseOrderNo`}>
              Purchase Order No.
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </FieldLabel>
            <Input
              id={`${mode}-purchase-order-purchaseOrderNo`}
              name="purchaseOrderNo"
              value={formValues.purchaseOrderNo}
              onChange={(event) => handleTextChange("purchaseOrderNo", event)}
              required
              maxLength={100}
              aria-invalid={Boolean(fieldErrors.purchaseOrderNo?.length)}
              aria-describedby={
                fieldErrors.purchaseOrderNo?.length
                  ? `${mode}-purchase-order-purchaseOrderNo-error`
                  : undefined
              }
            />
            <PurchaseOrderFieldError
              id={`${mode}-purchase-order-purchaseOrderNo`}
              errors={fieldErrors.purchaseOrderNo}
            />
          </Field>

          <VendorField
            mode={mode}
            value={formValues.vendorId}
            error={fieldErrors.vendorId}
            vendors={vendorOptions}
            currentVendorId={purchaseOrder?.vendor.id}
            onValueChange={(value) => updateField("vendorId", value)}
          />

          <Field data-invalid={Boolean(fieldErrors.referenceNumber?.length)}>
            <FieldLabel htmlFor={`${mode}-purchase-order-referenceNumber`}>
              Reference number <span className="text-muted-foreground">(optional)</span>
            </FieldLabel>
            <Input
              id={`${mode}-purchase-order-referenceNumber`}
              name="referenceNumber"
              value={formValues.referenceNumber}
              onChange={(event) => handleTextChange("referenceNumber", event)}
              maxLength={100}
              aria-invalid={Boolean(fieldErrors.referenceNumber?.length)}
              aria-describedby={
                fieldErrors.referenceNumber?.length
                  ? `${mode}-purchase-order-referenceNumber-error`
                  : undefined
              }
            />
            <PurchaseOrderFieldError
              id={`${mode}-purchase-order-referenceNumber`}
              errors={fieldErrors.referenceNumber}
            />
          </Field>

          <Field data-invalid={Boolean(fieldErrors.note?.length)}>
            <FieldLabel htmlFor={`${mode}-purchase-order-note`}>
              Note <span className="text-muted-foreground">(optional)</span>
            </FieldLabel>
            <Textarea
              id={`${mode}-purchase-order-note`}
              name="note"
              value={formValues.note}
              onChange={(event) => handleTextChange("note", event)}
              rows={4}
              maxLength={500}
              aria-invalid={Boolean(fieldErrors.note?.length)}
              aria-describedby={
                fieldErrors.note?.length
                  ? `${mode}-purchase-order-note-error`
                  : undefined
              }
            />
            <PurchaseOrderFieldError
              id={`${mode}-purchase-order-note`}
              errors={fieldErrors.note}
            />
          </Field>
        </FieldGroup>
      </div>
      <DialogFooter className="shrink-0">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !hasEligibleVendor}>
          {isSubmitting ? (
            <Spinner data-icon="inline-start" />
          ) : mode === "create" ? (
            <Plus data-icon="inline-start" />
          ) : (
            <Save data-icon="inline-start" />
          )}
          {isSubmitting
            ? "Saving..."
            : mode === "create"
              ? "Add Purchase Order"
              : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}
