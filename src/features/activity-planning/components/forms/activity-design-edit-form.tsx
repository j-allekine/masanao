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
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SheetFooter } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";

import { updateActivityDesignAction } from "../../actions";
import type {
  ActivityDesignField,
  ActivityDesignListItem,
  FieldErrors,
} from "../../types";

type EditableActivityDesignField = Exclude<
  ActivityDesignField,
  "fiscalYear"
>;

type ActivityDesignEditFormValues = Record<
  EditableActivityDesignField,
  string
>;

function initialValues(
  activityDesign: ActivityDesignListItem,
): ActivityDesignEditFormValues {
  return {
    activityDesignNo: activityDesign.activityDesignNo,
    title: activityDesign.title,
    officeName: activityDesign.officeName,
    aipReferenceCode: activityDesign.aipReferenceCode ?? "",
  };
}

function ActivityDesignEditFieldInput({
  id,
  label,
  description,
  value,
  error,
  onChange,
}: {
  id: EditableActivityDesignField;
  label: string;
  description: string;
  value: string;
  error?: string[];
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const hasError = Boolean(error?.length);

  return (
    <Field data-invalid={hasError}>
      <FieldLabel htmlFor={`edit-${id}`}>{label}</FieldLabel>
      <Input
        id={`edit-${id}`}
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

export default function ActivityDesignEditForm({
  activityDesign,
  onCancel,
  onSuccess,
}: {
  activityDesign: ActivityDesignListItem;
  onCancel: () => void;
  onSuccess: (activityDesign: ActivityDesignListItem) => void;
}) {
  const [formValues, setFormValues] = useState(() =>
    initialValues(activityDesign),
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  function updateField(field: EditableActivityDesignField, value: string) {
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
        const result = await updateActivityDesignAction(formData);

        if (result.status === "error") {
          setFormError(result.error);
          setFieldErrors(result.fields);
          return;
        }

        onSuccess(result.activityDesign);
      } catch {
        setFormError(
          "The Activity Design could not be saved. Check your connection and try again.",
        );
      }
    });
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      aria-label="Edit Activity Design"
      onSubmit={handleSubmit}
    >
      <div className="flex-1 overflow-y-auto p-4">
        {formError ? (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Could not save Activity Design</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <FieldGroup>
          <Field>
            <FieldTitle>Fiscal year</FieldTitle>
            <p className="text-sm text-muted-foreground">
              FY {activityDesign.fiscalYear}
            </p>
            <FieldDescription>
              The fiscal year stays with this planning context after creation.
            </FieldDescription>
          </Field>
          <ActivityDesignEditFieldInput
            id="activityDesignNo"
            label="Activity Design No."
            description="Leading/trailing spaces are removed and case differences are treated as the same number."
            value={formValues.activityDesignNo}
            error={fieldErrors.activityDesignNo}
            onChange={(event) =>
              updateField("activityDesignNo", event.target.value)
            }
          />
          <ActivityDesignEditFieldInput
            id="title"
            label="Title"
            description="Use the name staff will recognize during planning."
            value={formValues.title}
            error={fieldErrors.title}
            onChange={(event) => updateField("title", event.target.value)}
          />
          <ActivityDesignEditFieldInput
            id="officeName"
            label="Office name"
            description="Enter the department or office associated with this plan."
            value={formValues.officeName}
            error={fieldErrors.officeName}
            onChange={(event) => updateField("officeName", event.target.value)}
          />
          <ActivityDesignEditFieldInput
            id="aipReferenceCode"
            label="AIP Reference Code (optional)"
            description="Keep the external LGU planning reference if one is available."
            value={formValues.aipReferenceCode}
            error={fieldErrors.aipReferenceCode}
            onChange={(event) =>
              updateField("aipReferenceCode", event.target.value)
            }
          />
        </FieldGroup>
        <input type="hidden" name="id" value={activityDesign.id} />
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
