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

import { createOfficeAction, updateOfficeAction } from "../actions";
import type {
  OfficeField,
  OfficeFieldErrors,
  OfficeFormActionState,
  OfficeListItem,
} from "../types";

type OfficeFormValues = Record<OfficeField, string>;

const emptyFormValues: OfficeFormValues = {
  name: "",
  abbreviation: "",
  headName: "",
  headDesignation: "",
  officialEmail: "",
  contactNumber: "",
};

function initialValues(office?: OfficeListItem): OfficeFormValues {
  if (!office) return { ...emptyFormValues };

  return {
    name: office.name,
    abbreviation: office.abbreviation ?? "",
    headName: office.headName ?? "",
    headDesignation: office.headDesignation ?? "",
    officialEmail: office.officialEmail ?? "",
    contactNumber: office.contactNumber ?? "",
  };
}

function OfficeFieldInput({
  id,
  label,
  value,
  error,
  onChange,
  mode,
  required = false,
  type = "text",
  maxLength,
  inputMode,
}: {
  id: OfficeField;
  label: string;
  value: string;
  error?: string[];
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  mode: "create" | "edit";
  required?: boolean;
  type?: "email" | "text";
  maxLength: number;
  inputMode?: "email" | "tel";
}) {
  const hasError = Boolean(error?.length);
  const inputId = `${mode}-office-${id}`;
  const errorId = `${inputId}-error`;

  return (
    <Field data-invalid={hasError}>
      <FieldLabel htmlFor={inputId}>
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        ) : (
          <span
            className="font-normal text-muted-foreground"
            aria-hidden="true"
          >
            (optional)
          </span>
        )}
      </FieldLabel>
      <Input
        id={inputId}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        maxLength={maxLength}
        inputMode={inputMode}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
      />
      {hasError ? (
        <FieldError
          id={errorId}
          errors={error?.map((message) => ({ message }))}
        />
      ) : null}
    </Field>
  );
}

export default function OfficeForm({
  mode,
  office,
  onCancel,
  onSuccess,
  onDirtyChange,
}: {
  mode: "create" | "edit";
  office?: OfficeListItem;
  onCancel: () => void;
  onSuccess: (office: OfficeListItem) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const initialFormValues = initialValues(office);
  const [formValues, setFormValues] = useState(initialFormValues);
  const [fieldErrors, setFieldErrors] = useState<OfficeFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();
  const isDirty = (Object.keys(initialFormValues) as OfficeField[]).some(
    (field) => formValues[field] !== initialFormValues[field],
  );

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    const firstInvalidField = (
      [
        "name",
        "abbreviation",
        "headName",
        "headDesignation",
        "officialEmail",
        "contactNumber",
      ] as OfficeField[]
    ).find((field) => fieldErrors[field]?.length);

    if (!firstInvalidField) return;

    const targetId = `${mode}-office-${firstInvalidField}`;
    const timeoutId = window.setTimeout(() => {
      document.getElementById(targetId)?.focus();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fieldErrors, mode]);

  function updateField(field: OfficeField, value: string) {
    setFormValues((currentValues) => ({ ...currentValues, [field]: value }));
    setFieldErrors((currentErrors) => {
      if (!currentErrors[field]) return currentErrors;

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
    setFormError(null);
  }

  function handleResult(result: OfficeFormActionState) {
    if (result.status === "error") {
      setFormError(result.error);
      setFieldErrors(result.fields);
      return;
    }

    onSuccess(result.office);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    if (mode === "edit" && office) {
      formData.set("id", office.id);
    }

    startTransition(async () => {
      try {
        const result =
          mode === "create"
            ? await createOfficeAction(formData)
            : await updateOfficeAction(formData);

        handleResult(result);
      } catch {
        setFormError(
          "The Office could not be saved. Check your connection and try again.",
        );
      }
    });
  }

  if (mode === "edit" && !office) return null;

  return (
    <form
      aria-label={`${mode === "create" ? "Create" : "Edit"} Office`}
      aria-busy={isSubmitting}
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="max-h-[min(62vh,34rem)] overflow-y-auto px-1 py-2">
        {formError ? (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Could not save Office</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <FieldGroup className="sm:grid sm:grid-cols-2">
          <div className="sm:col-span-2">
            <OfficeFieldInput
              id="name"
              label="Name"
              value={formValues.name}
              error={fieldErrors.name}
              onChange={(event) => updateField("name", event.target.value)}
              mode={mode}
              required
              maxLength={200}
            />
          </div>
          <OfficeFieldInput
            id="abbreviation"
            label="Abbreviation"
            value={formValues.abbreviation}
            error={fieldErrors.abbreviation}
            onChange={(event) =>
              updateField("abbreviation", event.target.value)
            }
            mode={mode}
            maxLength={20}
          />
          <OfficeFieldInput
            id="headName"
            label="Head name"
            value={formValues.headName}
            error={fieldErrors.headName}
            onChange={(event) => updateField("headName", event.target.value)}
            mode={mode}
            maxLength={200}
          />
          <OfficeFieldInput
            id="headDesignation"
            label="Head designation"
            value={formValues.headDesignation}
            error={fieldErrors.headDesignation}
            onChange={(event) =>
              updateField("headDesignation", event.target.value)
            }
            mode={mode}
            maxLength={150}
          />
          <OfficeFieldInput
            id="officialEmail"
            label="Official email"
            value={formValues.officialEmail}
            error={fieldErrors.officialEmail}
            onChange={(event) =>
              updateField("officialEmail", event.target.value)
            }
            mode={mode}
            type="email"
            inputMode="email"
            maxLength={254}
          />
          <div className="sm:col-span-2">
            <OfficeFieldInput
              id="contactNumber"
              label="Contact number"
              value={formValues.contactNumber}
              error={fieldErrors.contactNumber}
              onChange={(event) =>
                updateField("contactNumber", event.target.value)
              }
              mode={mode}
              inputMode="tel"
              maxLength={100}
            />
          </div>
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
              ? "Add Office"
              : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}
