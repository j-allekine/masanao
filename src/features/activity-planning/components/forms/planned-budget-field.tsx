"use client";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";

export default function PlannedBudgetField({
  value,
  error,
  onChange,
}: {
  value: string;
  error?: string[];
  onChange: (value: string) => void;
}) {
  const hasError = Boolean(error?.length);

  return (
    <Field data-invalid={hasError}>
      <FieldLabel htmlFor="plannedBudgetPesos">Planned budget (optional)</FieldLabel>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>₱</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          id="plannedBudgetPesos"
          name="plannedBudgetPesos"
          type="text"
          inputMode="decimal"
          value={value}
          aria-invalid={hasError}
          onChange={(event) => onChange(event.target.value)}
        />
      </InputGroup>
      {hasError ? (
        <FieldError errors={error?.map((message) => ({ message }))} />
      ) : (
        <FieldDescription>Enter a non-negative amount in Philippine pesos.</FieldDescription>
      )}
    </Field>
  );
}
