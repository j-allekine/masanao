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

import { createUnitAction, updateUnitAction } from "../actions";
import type {
  UnitField,
  UnitFieldErrors,
  UnitFormActionState,
  UnitListItem,
} from "../types";

type UnitFormValues = Record<UnitField, string>;

const emptyFormValues: UnitFormValues = {
  name: "",
  abbreviation: "",
};

function initialValues(unit?: UnitListItem): UnitFormValues {
  if (!unit) return emptyFormValues;

  return {
    name: unit.name,
    abbreviation: unit.abbreviation,
  };
}

function UnitFieldInput({
  id,
  label,
  value,
  error,
  onChange,
  mode,
}: {
  id: UnitField;
  label: string;
  value: string;
  error?: string[];
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  mode: "create" | "edit";
}) {
  const hasError = Boolean(error?.length);
  const inputId = `${mode}-unit-${id}`;
  const errorId = `${inputId}-error`;

  return (
    <Field data-invalid={hasError}>
      <FieldLabel htmlFor={inputId}>
        {label}
        <span className="text-destructive" aria-hidden="true">
          *
        </span>
      </FieldLabel>
      <Input
        id={inputId}
        name={id}
        value={value}
        onChange={onChange}
        required
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

export default function UnitForm({
  mode,
  unit,
  onCancel,
  onSuccess,
  onDirtyChange,
}: {
  mode: "create" | "edit";
  unit?: UnitListItem;
  onCancel: () => void;
  onSuccess: (unit: UnitListItem) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const initialFormValues = initialValues(unit);
  const [formValues, setFormValues] = useState(initialFormValues);
  const [fieldErrors, setFieldErrors] = useState<UnitFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();
  const isDirty = (Object.keys(initialFormValues) as UnitField[]).some(
    (field) => formValues[field] !== initialFormValues[field],
  );

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    const firstInvalidField = (["name", "abbreviation"] as UnitField[]).find(
      (field) => fieldErrors[field]?.length,
    );

    if (!firstInvalidField) return;

    const targetId = `${mode}-unit-${firstInvalidField}`;
    const timeoutId = window.setTimeout(() => {
      document.getElementById(targetId)?.focus();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fieldErrors, mode]);

  function updateField(field: UnitField, value: string) {
    setFormValues((currentValues) => ({ ...currentValues, [field]: value }));
    setFieldErrors((currentErrors) => {
      if (!currentErrors[field]) return currentErrors;

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
    setFormError(null);
  }

  function handleResult(result: UnitFormActionState) {
    if (result.status === "error") {
      setFormError(result.error);
      setFieldErrors(result.fields);
      return;
    }

    onSuccess(result.unit);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    if (mode === "edit" && unit) {
      formData.set("id", unit.id);
    }

    startTransition(async () => {
      try {
        const result =
          mode === "create"
            ? await createUnitAction(formData)
            : await updateUnitAction(formData);

        handleResult(result);
      } catch {
        setFormError(
          "The Unit could not be saved. Check your connection and try again.",
        );
      }
    });
  }

  if (mode === "edit" && !unit) return null;

  return (
    <form
      aria-label={`${mode === "create" ? "Create" : "Edit"} Unit`}
      aria-busy={isSubmitting}
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="max-h-[min(62vh,34rem)] overflow-y-auto px-1 py-2">
        {formError ? (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Could not save Unit</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <FieldGroup>
          <UnitFieldInput
            id="name"
            label="Name"
            value={formValues.name}
            error={fieldErrors.name}
            onChange={(event) => updateField("name", event.target.value)}
            mode={mode}
          />
          <UnitFieldInput
            id="abbreviation"
            label="Abbreviation"
            value={formValues.abbreviation}
            error={fieldErrors.abbreviation}
            onChange={(event) =>
              updateField("abbreviation", event.target.value)
            }
            mode={mode}
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
              ? "Create Unit"
              : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}
