"use client";

import {
  useEffect,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Plus } from "lucide-react";

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

import { createItemAction } from "../actions";
import type {
  CategoryListItem,
  ItemField,
  ItemFieldErrors,
  ItemFormActionState,
  ItemListItem,
  UnitListItem,
} from "../types";

type ItemFormValues = Record<ItemField, string>;

const emptyFormValues: ItemFormValues = {
  name: "",
  categoryId: "",
  baseUnitId: "",
  note: "",
};

function ItemFieldError({
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

function LookupField({
  id,
  label,
  placeholder,
  value,
  error,
  options,
  onValueChange,
}: {
  id: "categoryId" | "baseUnitId";
  label: string;
  placeholder: string;
  value: string;
  error?: string[];
  options: Array<{ id: string; label: string }>;
  onValueChange: (value: string) => void;
}) {
  const inputId = `create-item-${id}`;
  const hasError = Boolean(error?.length);

  return (
    <Field data-invalid={hasError}>
      <FieldLabel htmlFor={inputId}>
        {label}
        <span className="text-destructive" aria-hidden="true">
          *
        </span>
      </FieldLabel>
      <Select
        value={value || null}
        onValueChange={(nextValue) => onValueChange(nextValue ?? "")}
      >
        <SelectTrigger
          id={inputId}
          className="w-full"
          aria-invalid={hasError}
          aria-describedby={hasError ? `${inputId}-error` : undefined}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.length > 0 ? (
              options.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="__none" disabled>
                No active options available
              </SelectItem>
            )}
          </SelectGroup>
        </SelectContent>
      </Select>
      <ItemFieldError id={inputId} errors={error} />
    </Field>
  );
}

export default function ItemForm({
  categories,
  units,
  onCancel,
  onSuccess,
  onDirtyChange,
}: {
  categories: CategoryListItem[];
  units: UnitListItem[];
  onCancel: () => void;
  onSuccess: (item: ItemListItem) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [formValues, setFormValues] = useState<ItemFormValues>(emptyFormValues);
  const [fieldErrors, setFieldErrors] = useState<ItemFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();
  const isDirty = (Object.keys(emptyFormValues) as ItemField[]).some(
    (field) => formValues[field] !== emptyFormValues[field],
  );
  const activeCategories = categories.filter((category) => category.isActive);
  const activeUnits = units.filter((unit) => unit.active);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    const firstInvalidField = (
      ["name", "categoryId", "baseUnitId", "note"] as ItemField[]
    ).find((field) => fieldErrors[field]?.length);

    if (!firstInvalidField) return;

    const targetId = `create-item-${firstInvalidField}`;
    const timeoutId = window.setTimeout(() => {
      document.getElementById(targetId)?.focus();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fieldErrors]);

  function updateField(field: ItemField, value: string) {
    setFormValues((currentValues) => ({ ...currentValues, [field]: value }));
    setFieldErrors((currentErrors) => {
      if (!currentErrors[field]) return currentErrors;

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
    setFormError(null);
  }

  function handleResult(result: ItemFormActionState) {
    if (result.status === "error") {
      setFormError(result.error);
      setFieldErrors(result.fields);
      return;
    }

    onSuccess(result.item);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    for (const field of Object.keys(emptyFormValues) as ItemField[]) {
      if (field === "note" && formValues[field] === "") {
        formData.delete(field);
      } else {
        formData.set(field, formValues[field]);
      }
    }

    startTransition(async () => {
      try {
        const result = await createItemAction(formData);
        handleResult(result);
      } catch {
        setFormError(
          "The Item could not be saved. Check your connection and try again.",
        );
      }
    });
  }

  function handleTextChange(
    field: "name" | "note",
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    updateField(field, event.target.value);
  }

  return (
    <form
      aria-label="Create Item"
      aria-busy={isSubmitting}
      noValidate
      onSubmit={handleSubmit}
    >
      <div className="max-h-[min(62vh,34rem)] overflow-y-auto px-1 py-2">
        {formError ? (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Could not save Item</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <FieldGroup>
          <Field data-invalid={Boolean(fieldErrors.name?.length)}>
            <FieldLabel htmlFor="create-item-name">
              Name
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </FieldLabel>
            <Input
              id="create-item-name"
              name="name"
              value={formValues.name}
              onChange={(event) => handleTextChange("name", event)}
              required
              maxLength={100}
              aria-invalid={Boolean(fieldErrors.name?.length)}
              aria-describedby={
                fieldErrors.name?.length ? "create-item-name-error" : undefined
              }
            />
            <ItemFieldError
              id="create-item-name"
              errors={fieldErrors.name}
            />
          </Field>

          <LookupField
            id="categoryId"
            label="Category"
            placeholder="Select a Category"
            value={formValues.categoryId}
            error={fieldErrors.categoryId}
            options={activeCategories.map((category) => ({
              id: category.id,
              label: category.name,
            }))}
            onValueChange={(value) => updateField("categoryId", value)}
          />

          <LookupField
            id="baseUnitId"
            label="Base Unit"
            placeholder="Select a Base Unit"
            value={formValues.baseUnitId}
            error={fieldErrors.baseUnitId}
            options={activeUnits.map((unit) => ({
              id: unit.id,
              label: `${unit.name} (${unit.abbreviation})`,
            }))}
            onValueChange={(value) => updateField("baseUnitId", value)}
          />

          <Field data-invalid={Boolean(fieldErrors.note?.length)}>
            <FieldLabel htmlFor="create-item-note">
              Item Note <span className="text-muted-foreground">(optional)</span>
            </FieldLabel>
            <Textarea
              id="create-item-note"
              name="note"
              value={formValues.note}
              onChange={(event) => handleTextChange("note", event)}
              rows={4}
              maxLength={500}
              aria-invalid={Boolean(fieldErrors.note?.length)}
              aria-describedby={
                fieldErrors.note?.length ? "create-item-note-error" : undefined
              }
            />
            <ItemFieldError id="create-item-note" errors={fieldErrors.note} />
          </Field>
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
          {isSubmitting ? <Spinner data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
          {isSubmitting ? "Saving…" : "Add Item"}
        </Button>
      </DialogFooter>
    </form>
  );
}
