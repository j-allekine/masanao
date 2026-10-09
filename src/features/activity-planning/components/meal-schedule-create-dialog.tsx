"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Pencil, Plus } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { WorkspaceFormActionButtons } from "@/components/workspace/form-actions";

import { createMealScheduleAction, updateMealScheduleAction } from "../actions";
import type {
  ActivityDetailItem,
  MealScheduleFieldErrors,
  MealScheduleListItem,
} from "../types";

type MealScheduleFormValues = {
  label: string;
  mealTime: string;
  plannedServings: string;
};

const emptyFormValues: MealScheduleFormValues = {
  label: "",
  mealTime: "",
  plannedServings: "",
};

function getInitialFormValues(
  mealSchedule: MealScheduleListItem | undefined,
): MealScheduleFormValues {
  if (!mealSchedule) return emptyFormValues;

  return {
    label: mealSchedule.label,
    mealTime: mealSchedule.mealTime,
    plannedServings: mealSchedule.plannedServings?.toString() ?? "",
  };
}

export default function MealScheduleCreateDialog({
  activity,
  mealSchedule,
  mode = "create",
  open,
  onClose,
  onSuccess,
}: {
  activity: ActivityDetailItem;
  mealSchedule?: MealScheduleListItem;
  mode?: "create" | "edit";
  open: boolean;
  onClose: () => void;
  onSuccess: (mealSchedule: MealScheduleListItem) => void;
}) {
  const [formValues, setFormValues] = useState(() =>
    getInitialFormValues(mealSchedule),
  );
  const [fieldErrors, setFieldErrors] = useState<MealScheduleFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  function closeDialog() {
    setFormValues(getInitialFormValues(mealSchedule));
    setFieldErrors({});
    setFormError(null);
    onClose();
  }

  function updateField(field: keyof MealScheduleFormValues, value: string) {
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
    formData.set("activityDesignId", activity.activityDesign.id);
    formData.set("activityId", activity.id);
    if (mode === "edit" && mealSchedule) {
      formData.set("mealScheduleId", mealSchedule.id);
    }

    startTransition(async () => {
      try {
        const result =
          mode === "edit"
            ? await updateMealScheduleAction(formData)
            : await createMealScheduleAction(formData);

        if (result.status === "error") {
          setFormError(result.error);
          setFieldErrors(result.fields);
          return;
        }

        onSuccess(result.mealSchedule);
      } catch {
        setFormError(
          "The Meal Schedule could not be saved. Check your connection and try again.",
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && closeDialog()}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit"
              ? `Edit Meal Schedule “${mealSchedule?.label ?? ""}”`
              : "Add Meal Schedule"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Update the saved Meal Schedule details. Its Activity context cannot be changed here."
              : `Add a Meal Schedule under “${activity.name}”. The Activity Design and Activity context are fixed for this workflow.`}
          </DialogDescription>
        </DialogHeader>
        <form
          aria-label={mode === "edit" ? "Edit Meal Schedule" : "Add Meal Schedule"}
          aria-busy={isSubmitting}
          noValidate
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col gap-5 py-2">
            {formError ? (
              <Alert variant="destructive">
                <AlertTitle>Could not save Meal Schedule</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}
            <FieldGroup>
              <Field data-invalid={Boolean(fieldErrors.label?.length)}>
                <FieldLabel htmlFor="mealScheduleLabel">
                  Meal Schedule label <span aria-hidden="true">*</span>
                </FieldLabel>
                <Input
                  id="mealScheduleLabel"
                  name="label"
                  value={formValues.label}
                  required
                  autoFocus
                  aria-invalid={Boolean(fieldErrors.label?.length)}
                  aria-describedby={
                    fieldErrors.label?.length
                      ? "mealScheduleLabel-error"
                      : undefined
                  }
                  onChange={(event) => updateField("label", event.target.value)}
                />
                <FieldError
                  id="mealScheduleLabel-error"
                  errors={fieldErrors.label?.map((message) => ({ message }))}
                />
              </Field>
              <Field data-invalid={Boolean(fieldErrors.mealTime?.length)}>
                <FieldLabel htmlFor="mealScheduleTime">
                  Meal time <span aria-hidden="true">*</span>
                </FieldLabel>
                <Input
                  id="mealScheduleTime"
                  name="mealTime"
                  type="time"
                  value={formValues.mealTime}
                  required
                  aria-invalid={Boolean(fieldErrors.mealTime?.length)}
                  aria-describedby={
                    fieldErrors.mealTime?.length
                      ? "mealScheduleTime-error"
                      : undefined
                  }
                  onChange={(event) => updateField("mealTime", event.target.value)}
                />
                <FieldError
                  id="mealScheduleTime-error"
                  errors={fieldErrors.mealTime?.map((message) => ({ message }))}
                />
              </Field>
              <Field data-invalid={Boolean(fieldErrors.plannedServings?.length)}>
                <FieldLabel htmlFor="mealScheduleServings">
                  Planned servings (optional)
                </FieldLabel>
                <Input
                  id="mealScheduleServings"
                  name="plannedServings"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={formValues.plannedServings}
                  aria-invalid={Boolean(fieldErrors.plannedServings?.length)}
                  aria-describedby={
                    fieldErrors.plannedServings?.length
                      ? "mealScheduleServings-error"
                      : undefined
                  }
                  onChange={(event) =>
                    updateField("plannedServings", event.target.value)
                  }
                />
                <FieldError
                  id="mealScheduleServings-error"
                  errors={fieldErrors.plannedServings?.map((message) => ({
                    message,
                  }))}
                />
              </Field>
            </FieldGroup>
          </div>
          <DialogFooter>
            <WorkspaceFormActionButtons
              onCancel={closeDialog}
              isPending={isSubmitting}
              pendingLabel={mode === "edit" ? "Saving…" : "Adding…"}
              submitLabel={mode === "edit" ? "Save changes" : "Add Meal Schedule"}
              submitIcon={
                mode === "edit" ? (
                  <Pencil data-icon="inline-start" />
                ) : (
                  <Plus data-icon="inline-start" />
                )
              }
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
