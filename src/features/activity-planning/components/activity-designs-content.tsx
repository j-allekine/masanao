"use client";

import {
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  ClipboardList,
  Plus,
} from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";

import { createActivityDesignAction } from "../actions";
import type {
  ActivityDesignField,
  ActivityDesignListItem,
  FieldErrors,
} from "../types";

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

function ActivityDesignList({
  activityDesigns,
}: {
  activityDesigns: ActivityDesignListItem[];
}) {
  if (activityDesigns.length === 0) {
    return (
      <Empty className="min-h-72">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ClipboardList aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No Activity Designs yet</EmptyTitle>
          <EmptyDescription>
            Create the first planning context with its LGU reference number, fiscal year, and office.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            nativeButton={false}
            render={<a href="#create-activity-design-title" />}
          >
            Create the first Activity Design
            <Plus data-icon="inline-end" />
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <ul aria-label="Activity Designs" className="flex flex-col gap-3">
      {activityDesigns.map((activityDesign) => (
        <li
          key={activityDesign.id}
          className="rounded-lg border bg-background p-4 transition-colors hover:bg-muted/40"
        >
          <article className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="font-mono text-xs font-medium tracking-wide text-primary uppercase">
                {activityDesign.activityDesignNo}
              </p>
              <h3 className="mt-2 truncate text-base font-semibold">
                {activityDesign.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {activityDesign.officeName}
              </p>
            </div>
            <div className="flex shrink-0 flex-row gap-4 text-sm sm:flex-col sm:items-end sm:gap-1">
              <span className="font-medium">FY {activityDesign.fiscalYear}</span>
              <span className="text-muted-foreground">
                {activityDesign.activityCount === 1
                  ? "1 Activity"
                  : `${activityDesign.activityCount} Activities`}
              </span>
            </div>
          </article>
          {activityDesign.aipReferenceCode ? (
            <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
              AIP Reference Code: {activityDesign.aipReferenceCode}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default function ActivityDesignsContent({
  initialActivityDesigns,
}: {
  initialActivityDesigns: ActivityDesignListItem[];
}) {
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
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex min-h-16 items-center justify-between gap-4 border-b px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger />
          <div className="min-w-0 border-l pl-3">
            <p className="truncate text-xs text-muted-foreground">Plan</p>
            <p className="truncate text-sm font-medium">Activity designs</p>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">Planning workspace</div>
      </header>

      <main className="mx-auto flex w-full max-w-masanao-content flex-1 flex-col gap-8 px-6 py-8 sm:py-10">
        <section aria-labelledby="activity-designs-title" className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
            Plan · Municipal operations
          </p>
          <h1
            id="activity-designs-title"
            className="mt-3 font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            Activity Designs
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Set the planning context first. Activities and meal schedules can be added as the details become known.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)] lg:items-start">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>Activity Designs</CardTitle>
              <CardDescription>
                {initialActivityDesigns.length === 0
                  ? "Your saved planning contexts will appear here."
                  : `${initialActivityDesigns.length} saved planning ${initialActivityDesigns.length === 1 ? "context" : "contexts"}.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ActivityDesignList activityDesigns={initialActivityDesigns} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle id="create-activity-design-title">
                Create an Activity Design
              </CardTitle>
              <CardDescription>
                Start with the identifier your office already uses. The number is stored consistently for future lookups.
              </CardDescription>
            </CardHeader>
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
          </Card>
        </div>
      </main>
    </div>
  );
}
