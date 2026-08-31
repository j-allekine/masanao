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
import { CardContent, CardFooter } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

import { createActivityAction } from "../../actions";
import type { ActivityField, ActivityFieldErrors } from "../../types";

type ActivityFormValues = Record<ActivityField, string>;

const emptyFormValues: ActivityFormValues = {
  name: "",
  officeName: "",
  particulars: "",
  scheduledDate: "",
  venue: "",
  plannedParticipantCount: "",
  plannedBudgetCentavos: "",
};

function ActivityTextField({
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
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        name={id}
        type={type}
        value={value}
        min={min}
        step={type === "number" ? 1 : undefined}
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

export default function ActivityForm({
  activityDesignId,
}: {
  activityDesignId: string;
}) {
  const router = useRouter();
  const [formValues, setFormValues] = useState(emptyFormValues);
  const [fieldErrors, setFieldErrors] = useState<ActivityFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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

  return (
    <form onSubmit={handleSubmit}>
      <CardContent>
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

        <FieldGroup>
          <ActivityTextField
            id="name"
            label="Activity name"
            description="Use the operational name staff will recognize."
            value={formValues.name}
            error={fieldErrors.name}
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
          <ActivityTextField
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
            <FieldLabel htmlFor="particulars">
              Activity particulars (optional)
            </FieldLabel>
            <Textarea
              id="particulars"
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
          <ActivityTextField
            id="plannedBudgetCentavos"
            label="Planned budget in centavos (optional)"
            description="Use exact Philippine peso centavos; no decimal values."
            value={formValues.plannedBudgetCentavos}
            error={fieldErrors.plannedBudgetCentavos}
            type="number"
            min={0}
            onChange={(event) =>
              updateField("plannedBudgetCentavos", event.target.value)
            }
          />
        </FieldGroup>
        <input type="hidden" name="activityDesignId" value={activityDesignId} />
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <Plus data-icon="inline-start" />
          )}
          {isSubmitting ? "Saving…" : "Create Activity"}
        </Button>
      </CardFooter>
    </form>
  );
}
