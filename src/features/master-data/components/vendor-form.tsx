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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

import { createVendorAction, updateVendorAction } from "../actions";
import type {
  VendorField,
  VendorFieldErrors,
  VendorFormActionState,
  VendorListItem,
} from "../types";

type VendorFormValues = Record<VendorField, string>;

const emptyFormValues: VendorFormValues = {
  name: "",
  contactPerson: "",
  contactNumber: "",
  email: "",
  address: "",
};

function initialValues(vendor?: VendorListItem): VendorFormValues {
  if (!vendor) return emptyFormValues;

  return {
    name: vendor.name,
    contactPerson: vendor.contactPerson ?? "",
    contactNumber: vendor.contactNumber ?? "",
    email: vendor.email ?? "",
    address: vendor.address ?? "",
  };
}

function VendorFieldInput({
  id,
  label,
  value,
  error,
  onChange,
  mode,
  multiline = false,
}: {
  id: VendorField;
  label: string;
  value: string;
  error?: string[];
  onChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  mode: "create" | "edit";
  multiline?: boolean;
}) {
  const hasError = Boolean(error?.length);
  const inputId = `${mode}-vendor-${id}`;
  const errorId = `${inputId}-error`;

  return (
    <Field data-invalid={hasError}>
      <FieldLabel htmlFor={inputId}>
        {label}
        {id === "name" ? (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </FieldLabel>
      {multiline ? (
        <Textarea
          id={inputId}
          name={id}
          value={value}
          onChange={onChange}
          rows={3}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
        />
      ) : (
        <Input
          id={inputId}
          name={id}
          value={value}
          onChange={onChange}
          required={id === "name"}
          type={id === "email" ? "email" : "text"}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
        />
      )}
      {hasError ? (
        <FieldError
          id={errorId}
          errors={error?.map((message) => ({ message }))}
        />
      ) : null}
    </Field>
  );
}

export default function VendorForm({
  mode,
  vendor,
  onCancel,
  onSuccess,
  onDirtyChange,
}: {
  mode: "create" | "edit";
  vendor?: VendorListItem;
  onCancel: () => void;
  onSuccess: (vendor: VendorListItem) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const initialFormValues = initialValues(vendor);
  const [formValues, setFormValues] = useState(initialFormValues);
  const [fieldErrors, setFieldErrors] = useState<VendorFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();
  const isDirty = (Object.keys(initialFormValues) as VendorField[]).some(
    (field) => formValues[field] !== initialFormValues[field],
  );

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    const firstInvalidField = (
      ["name", "contactPerson", "contactNumber", "email", "address"] as VendorField[]
    ).find((field) => fieldErrors[field]?.length);

    if (!firstInvalidField) return;

    const targetId = `${mode}-vendor-${firstInvalidField}`;
    const timeoutId = window.setTimeout(() => {
      document.getElementById(targetId)?.focus();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fieldErrors, mode]);

  function updateField(field: VendorField, value: string) {
    setFormValues((currentValues) => ({ ...currentValues, [field]: value }));
    setFieldErrors((currentErrors) => {
      if (!currentErrors[field]) return currentErrors;

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
    setFormError(null);
  }

  function handleResult(result: VendorFormActionState) {
    if (result.status === "error") {
      const hasFieldError = Object.keys(result.fields).some(
        (field) => field !== "form",
      );
      setFormError(hasFieldError && !result.fields.form ? null : result.error);
      setFieldErrors(result.fields);
      return;
    }

    onSuccess(result.vendor);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    if (mode === "edit" && vendor) {
      formData.set("id", vendor.id);
    }

    startTransition(async () => {
      try {
        const result =
          mode === "create"
            ? await createVendorAction(formData)
            : await updateVendorAction(formData);

        handleResult(result);
      } catch {
        setFormError(
          "The Vendor could not be saved. Check your connection and try again.",
        );
      }
    });
  }

  if (mode === "edit" && !vendor) return null;

  return (
    <form
      aria-label={`${mode === "create" ? "Add" : "Edit"} Vendor`}
      aria-busy={isSubmitting}
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="max-h-[min(62vh,34rem)] overflow-y-auto px-1 py-2">
        {formError ? (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Could not save Vendor</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <FieldGroup>
          <VendorFieldInput
            id="name"
            label="Name"
            value={formValues.name}
            error={fieldErrors.name}
            onChange={(event) => updateField("name", event.target.value)}
            mode={mode}
          />
          <VendorFieldInput
            id="contactPerson"
            label="Contact person"
            value={formValues.contactPerson}
            error={fieldErrors.contactPerson}
            onChange={(event) =>
              updateField("contactPerson", event.target.value)
            }
            mode={mode}
          />
          <VendorFieldInput
            id="contactNumber"
            label="Contact number"
            value={formValues.contactNumber}
            error={fieldErrors.contactNumber}
            onChange={(event) =>
              updateField("contactNumber", event.target.value)
            }
            mode={mode}
          />
          <VendorFieldInput
            id="email"
            label="Email"
            value={formValues.email}
            error={fieldErrors.email}
            onChange={(event) => updateField("email", event.target.value)}
            mode={mode}
          />
          <VendorFieldInput
            id="address"
            label="Address"
            value={formValues.address}
            error={fieldErrors.address}
            onChange={(event) => updateField("address", event.target.value)}
            mode={mode}
            multiline
          />
        </FieldGroup>
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Spinner data-icon="inline-start" />
          ) : mode === "create" ? (
            <Plus data-icon="inline-start" />
          ) : (
            <Save data-icon="inline-start" />
          )}
          {isSubmitting
            ? "Saving…"
            : mode === "create"
              ? "Add Vendor"
              : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}
