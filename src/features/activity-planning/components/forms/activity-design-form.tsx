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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

import {
  createActivityDesignAction,
  updateActivityDesignAction,
} from "../../actions";
import type {
  ActivityDesignField,
  ActivityDesignListItem,
  FieldErrors,
} from "../../types";
import FiscalYearPicker from "./fiscal-year-picker";

type ActivityDesignFormValues = Record<ActivityDesignField, string>;

const emptyFormValues: ActivityDesignFormValues = {
  activityDesignNo: "",
  fiscalYear: "",
  title: "",
  aipReferenceCode: "",
};

function initialValues(
  activityDesign?: ActivityDesignListItem,
): ActivityDesignFormValues {
  if (!activityDesign) return emptyFormValues;

  return {
    activityDesignNo: activityDesign.activityDesignNo,
    fiscalYear: String(activityDesign.fiscalYear),
    title: activityDesign.title,
    aipReferenceCode: activityDesign.aipReferenceCode ?? "",
  };
}

function ActivityDesignFieldInput({
  id,
  label,
  description,
  value,
  error,
  onChange,
  mode,
}: {
  id: Exclude<ActivityDesignField, "fiscalYear">;
  label: string;
  description: string;
  value: string;
  error?: string[];
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  mode: "create" | "edit";
}) {
  const hasError = Boolean(error?.length);
  const inputId = `${mode}-activity-design-${id}`;

  return (
    <Field data-invalid={hasError}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <Input
        id={inputId}
        name={id}
        value={value}
        onChange={onChange}
        aria-invalid={hasError}
      />
      {hasError ? (
        <FieldError errors={error?.map((message) => ({ message }))} />
      ) : (
        <FieldDescription>{description}</FieldDescription>
      )}
    </Field>
  );
}

export default function ActivityDesignForm({
  mode,
  activityDesign,
  onCancel,
  onSuccess,
  onDirtyChange,
}: {
  mode: "create" | "edit";
  activityDesign?: ActivityDesignListItem;
  onCancel: () => void;
  onSuccess: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const initialFormValues = initialValues(activityDesign);
  const [formValues, setFormValues] = useState(initialFormValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();
  const isDirty = (Object.keys(initialFormValues) as ActivityDesignField[]).some(
    (field) => formValues[field] !== initialFormValues[field],
  );

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  function updateField(field: ActivityDesignField, value: string) {
    setFormValues((currentValues) => ({ ...currentValues, [field]: value }));
    setFieldErrors((currentErrors) => {
      if (!currentErrors[field]) return currentErrors;

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
    setFormError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    if (mode === "edit" && activityDesign) {
      formData.set("id", activityDesign.id);
    }

    startTransition(async () => {
      try {
        const result =
          mode === "create"
            ? await createActivityDesignAction(formData)
            : await updateActivityDesignAction(formData);

        if (result.status === "error") {
          setFormError(result.error);
          setFieldErrors(result.fields);
          return;
        }

        onSuccess();
      } catch {
        setFormError(
          "The Activity Design could not be saved. Check your connection and try again.",
        );
      }
    });
  }

  if (mode === "edit" && !activityDesign) return null;

  return (
    <form
      aria-label={`${mode === "create" ? "Create" : "Edit"} Activity Design`}
      onSubmit={handleSubmit}
    >
      <div className="max-h-[min(62vh,34rem)] overflow-y-auto px-1 py-2">
        {formError ? (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Could not save Activity Design</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <FieldGroup>
          <ActivityDesignFieldInput
            id="activityDesignNo"
            label="Activity Design No."
            description="Leading/trailing spaces are removed and case differences are treated as the same number."
            value={formValues.activityDesignNo}
            error={fieldErrors.activityDesignNo}
            onChange={(event) =>
              updateField("activityDesignNo", event.target.value)
            }
            mode={mode}
          />
          <Field data-invalid={Boolean(fieldErrors.fiscalYear?.length)}>
            <FieldLabel htmlFor={`${mode}-activity-design-fiscalYear`}>
              Fiscal Year
            </FieldLabel>
            <FiscalYearPicker
              id={`${mode}-activity-design-fiscalYear`}
              value={formValues.fiscalYear}
              hasError={Boolean(fieldErrors.fiscalYear?.length)}
              onChange={(value) => updateField("fiscalYear", value)}
            />
            {fieldErrors.fiscalYear?.length ? (
              <FieldError
                errors={fieldErrors.fiscalYear.map((message) => ({ message }))}
              />
            ) : (
              <FieldDescription>
                Choose a four-digit fiscal year from 1900 to 9999.
              </FieldDescription>
            )}
            <input
              type="hidden"
              name="fiscalYear"
              value={formValues.fiscalYear}
            />
          </Field>
          <ActivityDesignFieldInput
            id="title"
            label="Title"
            description="Use the name staff will recognize during planning."
            value={formValues.title}
            error={fieldErrors.title}
            onChange={(event) => updateField("title", event.target.value)}
            mode={mode}
          />
          <ActivityDesignFieldInput
            id="aipReferenceCode"
            label="AIP Reference Code"
            description="Optional. Keep the external LGU planning reference if one is available."
            value={formValues.aipReferenceCode}
            error={fieldErrors.aipReferenceCode}
            onChange={(event) =>
              updateField("aipReferenceCode", event.target.value)
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
              ? "Create Activity Design"
              : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}
