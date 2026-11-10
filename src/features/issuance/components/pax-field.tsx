"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field";

import { parseIssuancePax } from "../domain/pax";

/** Keep editing as text so clearing the field and exact digit entry work. */
export default function PaxField({ id, label, value, onChange, disabled, description }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  description?: string;
}) {
  const [rejected, setRejected] = useState(false);
  const invalid = value !== "" && parseIssuancePax(value) === null;
  const error = rejected ? "Use digits only (0–9)." : invalid ? "Enter a whole number from 1 to 2,147,483,647." : null;
  const helpId = description !== "" ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(" ") || undefined;

  return (
    <Field data-invalid={Boolean(error)} data-disabled={disabled}>
      <FieldLabel htmlFor={id} required>{label}</FieldLabel>
      <Input
        id={id}
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        disabled={disabled}
        required
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        onChange={(event) => {
          if (!/^\d*$/.test(event.target.value)) {
            setRejected(true);
            return;
          }
          setRejected(false);
          onChange(event.target.value);
        }}
      />
      {helpId ? (
        <FieldDescription id={helpId}>
          {description ?? "Enter a whole number greater than 0."}
        </FieldDescription>
      ) : null}
      {error ? <FieldError visuallyHidden id={errorId}>{error}</FieldError> : null}
    </Field>
  );
}
