"use client";

import {
  useEffect,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DialogFooter } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

import { createActivityAction, updateActivityAction } from "../../actions";
import type {
  ActivityField,
  ActivityFieldErrors,
  ActivityDesignListItem,
  ActivityEditableListItem,
  ActivityListItem,
} from "../../types";
import ActivityDesignPicker from "../activity-design-picker";
import {
  formatCentavosAsPesoInput,
  normalizePesoInput,
} from "../../domain/planned-budget";
import LocalDatePicker from "./local-date-picker";
import PlannedBudgetField from "./planned-budget-field";
import {
  formatParticipantCount,
  formatParticipantCountInput,
} from "./participant-count-formatting";
import { useFormattedInputSelection } from "./use-formatted-input-selection";

type ActivityFormValues = Record<ActivityField, string>;
export type ActivityFormMode = "create" | "edit";

const emptyFormValues: ActivityFormValues = {
  activityDesignId: "",
  name: "",
  officeName: "",
  particulars: "",
  scheduledDate: "",
  venue: "",
  plannedParticipantCount: "",
  plannedBudgetPesos: "",
};

const activityValueFields: ActivityField[] = [
  "name",
  "officeName",
  "particulars",
  "scheduledDate",
  "venue",
  "plannedParticipantCount",
  "plannedBudgetPesos",
];

function comparableActivityValue(field: ActivityField, value: string) {
  if (field === "plannedBudgetPesos") return normalizePesoInput(value);
  if (field === "plannedParticipantCount") return value.replaceAll(",", "");

  return value;
}

function getInitialFormValues(
  activityDesignId: string | undefined,
  activity: ActivityEditableListItem | undefined,
): ActivityFormValues {
  if (!activity) {
    return {
      ...emptyFormValues,
      activityDesignId: activityDesignId ?? "",
    };
  }

  return {
    activityDesignId: activity.activityDesignId,
    name: activity.name,
    officeName: activity.officeName,
    particulars: activity.particulars ?? "",
    scheduledDate: activity.scheduledDate.slice(0, 10),
    venue: activity.venue ?? "",
    plannedParticipantCount:
      activity.plannedParticipantCount === null
        ? ""
        : formatParticipantCount(String(activity.plannedParticipantCount)),
    plannedBudgetPesos:
      activity.plannedBudgetCentavos === null
        ? ""
        : formatCentavosAsPesoInput(activity.plannedBudgetCentavos),
  };
}

function ActivityTextField({
  id,
  label,
  required = false,
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
  required?: boolean;
  value: string;
  error?: string[];
  type?: "text" | "number";
  min?: number;
  autoFocus?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const hasError = Boolean(error?.length);
  const errorId = `${id}-error`;

  return (
    <Field data-invalid={hasError}>
      <FieldLabel htmlFor={id}>
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </FieldLabel>
      <Input
        id={id}
        name={id}
        className={type === "number" ? "font-mono tabular-nums" : undefined}
        type={type}
        value={value}
        min={min}
        step={type === "number" ? 1 : undefined}
        autoFocus={autoFocus}
        onChange={onChange}
        required={required}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
      />
      {hasError ? (
        <FieldError id={errorId} errors={error?.map((message) => ({ message }))} />
      ) : null}
    </Field>
  );
}

function ActivityParticipantCountField({
  value,
  error,
  onChange,
}: {
  value: string;
  error?: string[];
  onChange: (value: string) => void;
}) {
  const { inputRef, queueSelection } = useFormattedInputSelection(value);
  const hasError = Boolean(error?.length);
  const errorId = "plannedParticipantCount-error";

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const formatted = formatParticipantCountInput(
      event.currentTarget.value,
      event.currentTarget.selectionStart,
      event.currentTarget.selectionEnd,
    );

    queueSelection(formatted.selectionStart, formatted.selectionEnd);

    onChange(formatted.value);
  }

  return (
    <Field data-invalid={hasError}>
      <FieldLabel htmlFor="plannedParticipantCount">
        Planned participant count (optional)
      </FieldLabel>
      <Input
        ref={inputRef}
        id="plannedParticipantCount"
        name="plannedParticipantCount"
        className="font-mono tabular-nums"
        type="text"
        inputMode="numeric"
        value={value}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        onChange={handleChange}
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

function ActivityFormFields({
  formValues,
  fieldErrors,
  layout,
  updateField,
  activityDesigns,
  activityDesignId,
  mode,
  activityDesign,
}: {
  formValues: ActivityFormValues;
  fieldErrors: ActivityFieldErrors;
  layout: "card" | "dialog";
  updateField: (field: ActivityField, value: string) => void;
  activityDesigns: ActivityDesignListItem[];
  activityDesignId?: string;
  mode: ActivityFormMode;
  activityDesign?: ActivityDesignListItem;
}) {
  return (
    <FieldGroup>
      {mode === "edit" ? (
        <Field>
          <FieldLabel htmlFor="activityDesignReadonly">
            Activity Design
          </FieldLabel>
          <Input
            id="activityDesignReadonly"
            value={
              activityDesign
                ? `${activityDesign.title} · ${activityDesign.activityDesignNo}`
                : "Activity Design"
            }
            readOnly
            aria-readonly="true"
          />
        </Field>
      ) : activityDesignId === undefined ? (
        <ActivityDesignPicker
          activityDesigns={activityDesigns}
          value={formValues.activityDesignId}
          error={fieldErrors.activityDesignId}
          onChange={(value) => updateField("activityDesignId", value)}
        />
      ) : null}
      <ActivityTextField
        id="name"
        label="Activity name"
        required
        value={formValues.name}
        error={fieldErrors.name}
        autoFocus={layout === "dialog"}
        onChange={(event) => updateField("name", event.target.value)}
      />
      <ActivityTextField
        id="officeName"
        label="Office"
        required
        value={formValues.officeName}
        error={fieldErrors.officeName}
        onChange={(event) => updateField("officeName", event.target.value)}
      />
      <LocalDatePicker
        id="scheduledDate"
        value={formValues.scheduledDate}
        error={fieldErrors.scheduledDate}
        required
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
          aria-describedby={
            fieldErrors.particulars?.length ? "particulars-error" : undefined
          }
        />
        {fieldErrors.particulars?.length ? (
          <FieldError
            id="particulars-error"
            errors={fieldErrors.particulars.map((message) => ({ message }))}
          />
        ) : null}
      </Field>
      <ActivityTextField
        id="venue"
        label="Venue (optional)"
        value={formValues.venue}
        error={fieldErrors.venue}
        onChange={(event) => updateField("venue", event.target.value)}
      />
      <ActivityParticipantCountField
        value={formValues.plannedParticipantCount}
        error={fieldErrors.plannedParticipantCount}
        onChange={(value) => updateField("plannedParticipantCount", value)}
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
  activityDesigns = [],
  activity,
  activityDesign,
  mode = "create",
  layout = "card",
  onCancel,
  onSuccess,
  onDirtyChange,
}: {
  activityDesignId?: string;
  activityDesigns?: ActivityDesignListItem[];
  activity?: ActivityEditableListItem;
  activityDesign?: ActivityDesignListItem;
  mode?: ActivityFormMode;
  layout?: "card" | "dialog";
  onCancel?: () => void;
  onSuccess?: (activity: ActivityListItem) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}) {
  const router = useRouter();
  const initialFormValues = getInitialFormValues(activityDesignId, activity);
  const [formValues, setFormValues] = useState<ActivityFormValues>(
    initialFormValues,
  );
  const [fieldErrors, setFieldErrors] = useState<ActivityFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();
  const isDirty =
    mode === "edit"
      ? activityValueFields.some(
          (field) =>
            comparableActivityValue(field, formValues[field]) !==
            comparableActivityValue(field, initialFormValues[field]),
        )
      : activityValueFields.some((field) => formValues[field] !== "") ||
        (activityDesignId === undefined && formValues.activityDesignId !== "");

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    const firstInvalidField = (
      [
        "activityDesignId",
        "name",
        "officeName",
        "scheduledDate",
        "particulars",
        "venue",
        "plannedParticipantCount",
      "plannedBudgetPesos",
      ] as ActivityField[]
    ).find((field) => fieldErrors[field]?.length);

    if (!firstInvalidField) return;

    const timeoutId = window.setTimeout(() => {
      document.getElementById(firstInvalidField)?.focus();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fieldErrors]);

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

    if (
      mode === "create" &&
      activityDesignId === undefined &&
      formValues.activityDesignId.trim() === ""
    ) {
      setFieldErrors({
        activityDesignId: ["Activity Design is required."],
      });
      return;
    }

    startTransition(async () => {
      try {
        if (mode === "edit" && activity) {
          formData.set("activityId", activity.id);
        }

        const result =
          mode === "edit"
            ? await updateActivityAction(formData)
            : await createActivityAction(formData);

        if (result.status === "error") {
          setFormError(result.error);
          setFieldErrors(result.fields);
          return;
        }

        if (onSuccess) {
          onSuccess(result.activity);
          return;
        }

        if (mode === "create") {
          setFormValues(emptyFormValues);
          setSuccessMessage(
            "Activity created. Add Meal Schedules when the details are ready.",
          );
        } else {
          setSuccessMessage("Activity updated.");
        }
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
      ) : mode === "edit" ? (
        <Pencil data-icon="inline-start" />
      ) : (
        <Plus data-icon="inline-start" />
      )}
      {isSubmitting
        ? mode === "edit"
          ? "Saving…"
          : "Creating…"
        : mode === "edit"
          ? "Save changes"
          : "Create Activity"}
    </Button>
  );

  return (
    <form
      className={
        layout === "dialog"
          ? "flex min-h-0 flex-1 flex-col overflow-hidden"
          : undefined
      }
      aria-label={mode === "edit" ? "Edit Activity" : "Create Activity"}
      aria-busy={isSubmitting}
      noValidate
      onSubmit={handleSubmit}
    >
      {layout === "dialog" ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-1 py-2">
          {feedback}
          <ActivityFormFields
            formValues={formValues}
            fieldErrors={fieldErrors}
            layout={layout}
            updateField={updateField}
            activityDesigns={activityDesigns}
            activityDesignId={activityDesignId}
            mode={mode}
            activityDesign={activityDesign}
          />
          <input
            type="hidden"
            name="activityDesignId"
            value={formValues.activityDesignId}
          />
          {mode === "edit" && activity ? (
            <input type="hidden" name="activityId" value={activity.id} />
          ) : null}
        </div>
      ) : (
        <CardContent>
          {feedback}
          <ActivityFormFields
            formValues={formValues}
            fieldErrors={fieldErrors}
            layout={layout}
            updateField={updateField}
            activityDesigns={activityDesigns}
            activityDesignId={activityDesignId}
            mode={mode}
            activityDesign={activityDesign}
          />
          <input
            type="hidden"
            name="activityDesignId"
            value={formValues.activityDesignId}
          />
          {mode === "edit" && activity ? (
            <input type="hidden" name="activityId" value={activity.id} />
          ) : null}
        </CardContent>
      )}
      {layout === "dialog" ? (
        <DialogFooter className="shrink-0">
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
        </DialogFooter>
      ) : (
        <CardFooter className="justify-end gap-2">{submitButton}</CardFooter>
      )}
    </form>
  );
}
