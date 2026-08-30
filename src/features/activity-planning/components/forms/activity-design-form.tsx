"use client";

import {
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Plus } from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

import { createActivityDesignAction } from "../../actions";
import type {
  ActivityDesignField,
  FieldErrors,
} from "../../types";

type ActivityDesignFormValues = Record<ActivityDesignField, string>;

const emptyFormValues: ActivityDesignFormValues = {
  activityDesignNo: "",
  fiscalYear: "",
  title: "",
  officeName: "",
  aipReferenceCode: "",
};

function ActivityDesignFieldInput({
  id,
  label,
  description,
  value,
  error,
  type = "text",
  min,
  max,
  onChange,
}: {
  id: ActivityDesignField;
  label: string;
  description: string;
  value: string;
  error?: string[];
  type?: "text" | "number";
  min?: number;
  max?: number;
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
        max={max}
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

export default function ActivityDesignForm() {
  const [formValues, setFormValues] = useState(emptyFormValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  function updateField(field: ActivityDesignField, value: string) {
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
        const result = await createActivityDesignAction(formData);

        if (result.status === "error") {
          setFormError(result.error);
          setFieldErrors(result.fields);
          return;
        }

        setFormValues(emptyFormValues);
        setSuccessMessage("Activity Design created. It is now in your planning list.");
      } catch {
        setFormError(
          "The Activity Design could not be saved. Check your connection and try again.",
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <CardContent>
        {formError ? (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Could not save Activity Design</AlertTitle>
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
          <ActivityDesignFieldInput
            id="activityDesignNo"
            label="Activity Design No."
            description="Leading/trailing spaces are removed and case differences are treated as the same number."
            value={formValues.activityDesignNo}
            error={fieldErrors.activityDesignNo}
            onChange={(event) =>
              updateField("activityDesignNo", event.target.value)
            }
          />
          <ActivityDesignFieldInput
            id="fiscalYear"
            label="Fiscal year"
            description="Enter a four-digit fiscal year from 1900 to 9999."
            value={formValues.fiscalYear}
            error={fieldErrors.fiscalYear}
            type="number"
            min={1900}
            max={9999}
            onChange={(event) => updateField("fiscalYear", event.target.value)}
          />
          <ActivityDesignFieldInput
            id="title"
            label="Title"
            description="Use the name staff will recognize during planning."
            value={formValues.title}
            error={fieldErrors.title}
            onChange={(event) => updateField("title", event.target.value)}
          />
          <ActivityDesignFieldInput
            id="officeName"
            label="Office name"
            description="Enter the department or office associated with this plan."
            value={formValues.officeName}
            error={fieldErrors.officeName}
            onChange={(event) => updateField("officeName", event.target.value)}
          />
          <ActivityDesignFieldInput
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
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <Plus data-icon="inline-start" />
          )}
          {isSubmitting ? "Saving…" : "Create Activity Design"}
        </Button>
      </CardFooter>
    </form>
  );
}
