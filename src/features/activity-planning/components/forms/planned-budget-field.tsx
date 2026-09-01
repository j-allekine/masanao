"use client";

import {
  Field,
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
          className="font-mono tabular-nums"
          type="text"
          inputMode="decimal"
          value={value}
          aria-invalid={hasError}
          aria-describedby={hasError ? "plannedBudgetPesos-error" : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      </InputGroup>
      {hasError ? (
        <FieldError id="plannedBudgetPesos-error" errors={error?.map((message) => ({ message }))} />
      ) : null}
    </Field>
  );
}
