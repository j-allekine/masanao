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
import { Textarea } from "@/components/ui/textarea";

import { updateActivityAction } from "../../actions";
import { formatCentavosAsPesoInput } from "../../domain/planned-budget";
import type {
  ActivityField,
  ActivityFieldErrors,
  ActivityListItem,
} from "../../types";

type ActivityFormValues = Record<ActivityField, string>;

function initialValues(activity: ActivityListItem): ActivityFormValues {
  return {
    name: activity.name,
    officeName: activity.officeName,
    particulars: activity.particulars ?? "",
    scheduledDate: activity.scheduledDate.slice(0, 10),
    venue: activity.venue ?? "",
    plannedParticipantCount:
      activity.plannedParticipantCount?.toString() ?? "",
    plannedBudgetPesos:
      activity.plannedBudgetCentavos === null
        ? ""
        : formatCentavosAsPesoInput(activity.plannedBudgetCentavos),
  };
}

function ActivityEditTextField({
  id,
  label,
  description,
  value,
  error,
  type = "text",
  min,
  onChange,
}: {
  id: Exclude<ActivityField, "particulars">;
  label: string;
  description: string;
  value: string;
  error?: string[];
  type?: "text" | "date" | "number";
  min?: number;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const hasError = Boolean(error?.length);

  return (
    <Field data-invalid={hasError}>
      <FieldLabel htmlFor={`edit-activity-${id}`}>{label}</FieldLabel>
      <Input
        id={`edit-activity-${id}`}
        name={id}
        type={type}
        value={value}
        min={min}
        step={type === "number" ? 1 : undefined}
        inputMode={id === "plannedBudgetPesos" ? "decimal" : undefined}
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

export default function ActivityEditForm({
  activity,
  onCancel,
  onSuccess,
}: {
  activity: ActivityListItem;
  onCancel: () => void;
  onSuccess: (activity: ActivityListItem) => void;
}) {
  const [formValues, setFormValues] = useState(() => initialValues(activity));
  const [fieldErrors, setFieldErrors] = useState<ActivityFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  function updateField(field: ActivityField, value: string) {
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
        const result = await updateActivityAction(formData);

        if (result.status === "error") {
          setFormError(result.error);
          setFieldErrors(result.fields);
          return;
        }

        onSuccess(result.activity);
      } catch {
        setFormError(
          "The Activity could not be saved. Check your connection and try again.",
        );
      }
    });
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      aria-label="Edit Activity"
      onSubmit={handleSubmit}
    >
      <div className="flex-1 overflow-y-auto p-4">
        {formError ? (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Could not save Activity</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <FieldGroup>
          <ActivityEditTextField
            id="name"
            label="Activity name"
            description="Use the operational name staff will recognize."
            value={formValues.name}
            error={fieldErrors.name}
            onChange={(event) => updateField("name", event.target.value)}
          />
          <ActivityEditTextField
            id="officeName"
            label="Office"
            description="Enter the LGU department or office responsible for this Activity."
            value={formValues.officeName}
            error={fieldErrors.officeName}
            onChange={(event) => updateField("officeName", event.target.value)}
          />
          <ActivityEditTextField
            id="scheduledDate"
            label="Scheduled date"
            description="The date is saved as a municipal local date."
            value={formValues.scheduledDate}
            error={fieldErrors.scheduledDate}
            type="date"
            onChange={(event) =>
              updateField("scheduledDate", event.target.value)
            }
          />
          <Field data-invalid={Boolean(fieldErrors.particulars?.length)}>
            <FieldLabel htmlFor="edit-activity-particulars">
              Activity particulars (optional)
            </FieldLabel>
            <Textarea
              id="edit-activity-particulars"
              name="particulars"
              value={formValues.particulars}
              onChange={(event) =>
                updateField("particulars", event.target.value)
              }
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
          <ActivityEditTextField
            id="venue"
            label="Venue (optional)"
            description="Record where the Activity will take place."
            value={formValues.venue}
            error={fieldErrors.venue}
            onChange={(event) => updateField("venue", event.target.value)}
          />
          <ActivityEditTextField
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
          <ActivityEditTextField
            id="plannedBudgetPesos"
            label="Planned budget (optional)"
            description="Enter a non-negative amount in Philippine pesos."
            value={formValues.plannedBudgetPesos}
            error={fieldErrors.plannedBudgetPesos}
            type="text"
            onChange={(event) =>
              updateField("plannedBudgetPesos", event.target.value)
            }
          />
        </FieldGroup>
        <input
          type="hidden"
          name="activityDesignId"
          value={activity.activityDesignId}
        />
        <input type="hidden" name="activityId" value={activity.id} />
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
