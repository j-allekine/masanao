"use client";

import {
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

import { createMealScheduleAction } from "../../actions";
import type {
  MealScheduleField,
  MealScheduleFieldErrors,
} from "../../types";

type MealScheduleFormValues = Record<MealScheduleField, string>;

const emptyFormValues: MealScheduleFormValues = {
  label: "",
  mealTime: "",
  plannedServings: "",
};

export default function MealScheduleForm({
  activityDesignId,
  activityId,
}: {
  activityDesignId: string;
  activityId: string;
}) {
  const router = useRouter();
  const [formValues, setFormValues] = useState(emptyFormValues);
  const [fieldErrors, setFieldErrors] = useState<MealScheduleFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  function updateField(field: MealScheduleField, value: string) {
    setFormValues((currentValues) => ({ ...currentValues, [field]: value }));
    setFieldErrors((currentErrors) => {
      if (!currentErrors[field]) return currentErrors;

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
    setFormError(null);
    setSuccessMessage(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);
    setSuccessMessage(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await createMealScheduleAction(formData);

        if (result.status === "error") {
          setFormError(result.error);
          setFieldErrors(result.fields);
          return;
        }

        setFormValues(emptyFormValues);
        setSuccessMessage("Meal Schedule created.");
        router.refresh();
      } catch {
        setFormError(
          "The Meal Schedule could not be saved. Check your connection and try again.",
        );
      }
    });
  }

  function fieldHasError(field: MealScheduleField) {
    return Boolean(fieldErrors[field]?.length);
  }

  function inputId(field: MealScheduleField) {
    return `meal-schedule-${activityId}-${field}`;
  }

  return (
    <form
      className="flex flex-col gap-4"
      aria-label="Create Meal Schedule"
      onSubmit={handleSubmit}
    >
      {formError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not save Meal Schedule</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
      {successMessage ? (
        <Alert>
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      ) : null}

      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={fieldHasError("label")}>
          <FieldLabel htmlFor={inputId("label")}>Meal label</FieldLabel>
          <Input
            id={inputId("label")}
            name="label"
            value={formValues.label}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              updateField("label", event.target.value)
            }
            aria-invalid={fieldHasError("label")}
          />
          {fieldHasError("label") ? (
            <FieldError
              errors={fieldErrors.label?.map((message) => ({ message }))}
            />
          ) : (
            <FieldDescription>
              Use Lunch, Snack, Feeding, or another staff-facing label.
            </FieldDescription>
          )}
        </Field>
        <Field data-invalid={fieldHasError("mealTime")}>
          <FieldLabel htmlFor={inputId("mealTime")}>Meal time</FieldLabel>
          <Input
            id={inputId("mealTime")}
            name="mealTime"
            type="time"
            value={formValues.mealTime}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              updateField("mealTime", event.target.value)
            }
            aria-invalid={fieldHasError("mealTime")}
          />
          {fieldHasError("mealTime") ? (
            <FieldError
              errors={fieldErrors.mealTime?.map((message) => ({ message }))}
            />
          ) : (
            <FieldDescription>Use the local HH:mm time.</FieldDescription>
          )}
        </Field>
        <Field data-invalid={fieldHasError("plannedServings")}>
          <FieldLabel htmlFor={inputId("plannedServings")}>
            Planned servings (optional)
          </FieldLabel>
          <Input
            id={inputId("plannedServings")}
            name="plannedServings"
            type="number"
            min={0}
            step={1}
            value={formValues.plannedServings}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              updateField("plannedServings", event.target.value)
            }
            aria-invalid={fieldHasError("plannedServings")}
          />
          {fieldHasError("plannedServings") ? (
            <FieldError
              errors={fieldErrors.plannedServings?.map((message) => ({
                message,
              }))}
            />
          ) : (
            <FieldDescription>
              Leave blank when servings are not decided.
            </FieldDescription>
          )}
        </Field>
      </FieldGroup>
      <input type="hidden" name="activityDesignId" value={activityDesignId} />
      <input type="hidden" name="activityId" value={activityId} />
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <Plus data-icon="inline-start" />
          )}
          {isSubmitting ? "Saving…" : "Add Meal Schedule"}
        </Button>
      </div>
    </form>
  );
}
