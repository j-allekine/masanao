"use client";

import {
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Save } from "lucide-react";

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
import { SheetFooter } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";

import { updateMealScheduleAction } from "../../actions";
import type {
  MealScheduleField,
  MealScheduleFieldErrors,
  MealScheduleListItem,
} from "../../types";

type MealScheduleFormValues = Record<MealScheduleField, string>;

function initialValues(mealSchedule: MealScheduleListItem): MealScheduleFormValues {
  return {
    label: mealSchedule.label,
    mealTime: mealSchedule.mealTime,
    plannedServings: mealSchedule.plannedServings?.toString() ?? "",
  };
}

export default function MealScheduleEditForm({
  activityDesignId,
  mealSchedule,
  onCancel,
  onSuccess,
}: {
  activityDesignId: string;
  mealSchedule: MealScheduleListItem;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [formValues, setFormValues] = useState(() =>
    initialValues(mealSchedule),
  );
  const [fieldErrors, setFieldErrors] = useState<MealScheduleFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
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
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await updateMealScheduleAction(formData);

        if (result.status === "error") {
          setFormError(result.error);
          setFieldErrors(result.fields);
          return;
        }

        onSuccess();
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

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      aria-label="Edit Meal Schedule"
      onSubmit={handleSubmit}
    >
      <div className="flex-1 overflow-y-auto p-4">
        {formError ? (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Could not save Meal Schedule</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <FieldGroup>
          <Field data-invalid={fieldHasError("label")}>
            <FieldLabel htmlFor="edit-meal-schedule-label">
              Meal label
            </FieldLabel>
            <Input
              id="edit-meal-schedule-label"
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
                Use a staff-facing label such as Lunch, Snack, or Feeding.
              </FieldDescription>
            )}
          </Field>
          <Field data-invalid={fieldHasError("mealTime")}>
            <FieldLabel htmlFor="edit-meal-schedule-time">
              Meal time
            </FieldLabel>
            <Input
              id="edit-meal-schedule-time"
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
            <FieldLabel htmlFor="edit-meal-schedule-servings">
              Planned servings (optional)
            </FieldLabel>
            <Input
              id="edit-meal-schedule-servings"
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
        <input
          type="hidden"
          name="activityDesignId"
          value={activityDesignId}
        />
        <input
          type="hidden"
          name="activityId"
          value={mealSchedule.activityId}
        />
        <input
          type="hidden"
          name="mealScheduleId"
          value={mealSchedule.id}
        />
      </div>
      <SheetFooter className="sm:flex-row sm:justify-end">
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
          ) : (
            <Save data-icon="inline-start" />
          )}
          {isSubmitting ? "Saving…" : "Save changes"}
        </Button>
      </SheetFooter>
    </form>
  );
}
