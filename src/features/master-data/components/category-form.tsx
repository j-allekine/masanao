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

import { createCategoryAction, updateCategoryAction } from "../actions";
import type {
  CategoryField,
  CategoryFieldErrors,
  CategoryFormActionState,
  CategoryListItem,
} from "../types";

type CategoryFormValues = Record<CategoryField, string>;

const emptyFormValues: CategoryFormValues = {
  name: "",
  description: "",
};

function initialValues(category?: CategoryListItem): CategoryFormValues {
  if (!category) return emptyFormValues;

  return {
    name: category.name,
    description: category.description ?? "",
  };
}

function CategoryFieldInput({
  id,
  label,
  value,
  error,
  onChange,
  mode,
}: {
  id: CategoryField;
  label: string;
  value: string;
  error?: string[];
  onChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  mode: "create" | "edit";
}) {
  const hasError = Boolean(error?.length);
  const inputId = `${mode}-category-${id}`;
  const errorId = `${inputId}-error`;
  const isDescription = id === "description";

  return (
    <Field data-invalid={hasError}>
      <FieldLabel htmlFor={inputId}>
        {label}
        {!isDescription ? (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </FieldLabel>
      {isDescription ? (
        <Textarea
          id={inputId}
          name={id}
          value={value}
          onChange={onChange}
          rows={4}
          maxLength={500}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
        />
      ) : (
        <Input
          id={inputId}
          name={id}
          value={value}
          onChange={onChange}
          required
          maxLength={100}
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

export default function CategoryForm({
  mode,
  category,
  onCancel,
  onSuccess,
  onDirtyChange,
}: {
  mode: "create" | "edit";
  category?: CategoryListItem;
  onCancel: () => void;
  onSuccess: (category: CategoryListItem) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const initialFormValues = initialValues(category);
  const [formValues, setFormValues] = useState(initialFormValues);
  const [fieldErrors, setFieldErrors] = useState<CategoryFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();
  const isDirty = (Object.keys(initialFormValues) as CategoryField[]).some(
    (field) => formValues[field] !== initialFormValues[field],
  );

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    const firstInvalidField = (["name", "description"] as CategoryField[]).find(
      (field) => fieldErrors[field]?.length,
    );

    if (!firstInvalidField) return;

    const targetId = `${mode}-category-${firstInvalidField}`;
    const timeoutId = window.setTimeout(() => {
      document.getElementById(targetId)?.focus();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fieldErrors, mode]);

  function updateField(field: CategoryField, value: string) {
    setFormValues((currentValues) => ({ ...currentValues, [field]: value }));
    setFieldErrors((currentErrors) => {
      if (!currentErrors[field]) return currentErrors;

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
    setFormError(null);
  }

  function handleResult(result: CategoryFormActionState) {
    if (result.status === "error") {
      setFormError(result.error);
      setFieldErrors(result.fields);
      return;
    }

    onSuccess(result.category);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    if (mode === "edit" && category) {
      formData.set("id", category.id);
    }

    startTransition(async () => {
      try {
        const result =
          mode === "create"
            ? await createCategoryAction(formData)
            : await updateCategoryAction(formData);

        handleResult(result);
      } catch {
        setFormError(
          "The Category could not be saved. Check your connection and try again.",
        );
      }
    });
  }

  if (mode === "edit" && !category) return null;

  return (
    <form
      aria-label={`${mode === "create" ? "Create" : "Edit"} Category`}
      aria-busy={isSubmitting}
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="max-h-[min(62vh,34rem)] overflow-y-auto px-1 py-2">
        {formError ? (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Could not save Category</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <FieldGroup>
          <CategoryFieldInput
            id="name"
            label="Name"
            value={formValues.name}
            error={fieldErrors.name}
            onChange={(event) => updateField("name", event.target.value)}
            mode={mode}
          />
          <CategoryFieldInput
            id="description"
            label="Description (optional)"
            value={formValues.description}
            error={fieldErrors.description}
            onChange={(event) =>
              updateField("description", event.target.value)
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
              ? "Add Category"
              : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}
