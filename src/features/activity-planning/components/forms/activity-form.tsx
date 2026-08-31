"use client";

import {
  useEffect,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";

import { createActivityAction } from "../../actions";
import type {
  ActivityField,
  ActivityFieldErrors,
  ActivityListItem,
} from "../../types";
import LocalDatePicker from "./local-date-picker";
import PlannedBudgetField from "./planned-budget-field";

type ActivityFormValues = Record<ActivityField, string>;

const emptyFormValues: ActivityFormValues = {
  name: "",
  officeName: "",
  particulars: "",
  scheduledDate: "",
  venue: "",
  plannedParticipantCount: "",
  plannedBudgetPesos: "",
};

function ActivityTextField({
  id,
  label,
  description,
  value,
  error,
  type = "text",
  min,
  autoFocus = false,
  onChange,
}: {
  id: Exclude<
    ActivityField,
    "particulars" | "scheduledDate" | "plannedBudgetPesos"
  >;
  label: string;
  description: string;
  value: string;
  error?: string[];
  type?: "text" | "number";
  min?: number;
  autoFocus?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const hasError = Boolean(error?.length);

  return (
    <Field data-invalid={hasError}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        name={id}
        type={type}
        value={value}
        min={min}
        step={type === "number" ? 1 : undefined}
        autoFocus={autoFocus}
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

function ActivityFormFields({
  formValues,
  fieldErrors,
  layout,
  updateField,
}: {
  formValues: ActivityFormValues;
  fieldErrors: ActivityFieldErrors;
  layout: "card" | "sheet";
  updateField: (field: ActivityField, value: string) => void;
}) {
  return (
    <FieldGroup>
      <ActivityTextField
        id="name"
        label="Activity name"
        description="Use the operational name staff will recognize."
        value={formValues.name}
        error={fieldErrors.name}
        autoFocus={layout === "sheet"}
        onChange={(event) => updateField("name", event.target.value)}
      />
      <ActivityTextField
        id="officeName"
        label="Office"
        description="Enter the LGU department or office responsible for this Activity."
        value={formValues.officeName}
        error={fieldErrors.officeName}
        onChange={(event) => updateField("officeName", event.target.value)}
      />
      <LocalDatePicker
        id="scheduledDate"
        value={formValues.scheduledDate}
        error={fieldErrors.scheduledDate}
        onChange={(value) => updateField("scheduledDate", value)}
      />
      <Field data-invalid={Boolean(fieldErrors.particulars?.length)}>
        <FieldLabel htmlFor="particulars">Activity particulars (optional)</FieldLabel>
        <Textarea
          id="particulars"
          name="particulars"
          value={formValues.particulars}
          onChange={(event) => updateField("particulars", event.target.value)}
          aria-invalid={Boolean(fieldErrors.particulars?.length)}
        />
        {fieldErrors.particulars?.length ? (
          <FieldError
            errors={fieldErrors.particulars.map((message) => ({ message }))}
          />
        ) : (
          <FieldDescription>
            Add context that helps the kitchen understand the undertaking.
          </FieldDescription>
        )}
      </Field>
      <ActivityTextField
        id="venue"
        label="Venue (optional)"
        description="Record where the Activity will take place."
        value={formValues.venue}
        error={fieldErrors.venue}
        onChange={(event) => updateField("venue", event.target.value)}
      />
      <ActivityTextField
        id="plannedParticipantCount"
        label="Planned participant count (optional)"
        description="Enter zero or a whole-number estimate."
        value={formValues.plannedParticipantCount}
        error={fieldErrors.plannedParticipantCount}
        type="number"
        min={0}
        onChange={(event) =>
          updateField("plannedParticipantCount", event.target.value)
        }
      />
      <PlannedBudgetField
        value={formValues.plannedBudgetPesos}
        error={fieldErrors.plannedBudgetPesos}
        onChange={(value) => updateField("plannedBudgetPesos", value)}
      />
    </FieldGroup>
  );
}

export default function ActivityForm({
  activityDesignId,
  layout = "card",
  onCancel,
  onSuccess,
  onDirtyChange,
}: {
  activityDesignId: string;
  layout?: "card" | "sheet";
  onCancel?: () => void;
  onSuccess?: (activity: ActivityListItem) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}) {
  const router = useRouter();
  const [formValues, setFormValues] = useState(emptyFormValues);
  const [fieldErrors, setFieldErrors] = useState<ActivityFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();
  const isDirty = Object.keys(emptyFormValues).some(
    (field) => formValues[field as ActivityField] !== "",
  );

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  function updateField(field: ActivityField, value: string) {
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
        const result = await createActivityAction(formData);

        if (result.status === "error") {
          setFormError(result.error);
          setFieldErrors(result.fields);
          return;
        }

        if (onSuccess) {
          onSuccess(result.activity);
          return;
        }

        setFormValues(emptyFormValues);
        setSuccessMessage(
          "Activity created. Add Meal Schedules when the details are ready.",
        );
        router.refresh();
      } catch {
        setFormError(
          "The Activity could not be saved. Check your connection and try again.",
        );
      }
    });
  }

  const feedback = (
    <>
      {formError ? (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Could not save Activity</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
      {successMessage ? (
        <Alert className="mb-6">
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      ) : null}
    </>
  );

  const submitButton = (
    <Button type="submit" disabled={isSubmitting}>
      {isSubmitting ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <Plus data-icon="inline-start" />
      )}
      {isSubmitting ? "Creating…" : "Create Activity"}
    </Button>
  );

  return (
    <form
      className={layout === "sheet" ? "flex min-h-0 flex-1 flex-col" : undefined}
      aria-label="Create Activity"
      onSubmit={handleSubmit}
    >
      {layout === "sheet" ? (
        <div className="flex-1 overflow-y-auto p-4">
          {feedback}
          <ActivityFormFields
            formValues={formValues}
            fieldErrors={fieldErrors}
            layout={layout}
            updateField={updateField}
          />
          <input type="hidden" name="activityDesignId" value={activityDesignId} />
        </div>
      ) : (
        <CardContent>
          {feedback}
          <ActivityFormFields
            formValues={formValues}
            fieldErrors={fieldErrors}
            layout={layout}
            updateField={updateField}
          />
          <input type="hidden" name="activityDesignId" value={activityDesignId} />
        </CardContent>
      )}
      {layout === "sheet" ? (
        <SheetFooter className="border-t sm:flex-row sm:justify-end">
          {onCancel ? (
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={onCancel}
            >
              Cancel
            </Button>
          ) : null}
          {submitButton}
        </SheetFooter>
      ) : (
        <CardFooter className="justify-end gap-2">{submitButton}</CardFooter>
      )}
    </form>
  );
}
