"use client";

import { useEffect, useRef, type ChangeEvent } from "react";

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

import {
  formatPesoInputChange,
  formatPesoInputOnBlur,
} from "../../domain/planned-budget";

export default function PlannedBudgetField({
  value,
  error,
  onChange,
}: {
  value: string;
  error?: string[];
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingSelection = useRef<{
    start: number;
    end: number;
  } | null>(null);
  const hasError = Boolean(error?.length);

  useEffect(() => {
    const input = inputRef.current;
    const selection = pendingSelection.current;

    if (!input || !selection || document.activeElement !== input) return;

    input.setSelectionRange(selection.start, selection.end);
    pendingSelection.current = null;
  }, [value]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const formatted = formatPesoInputChange(
      event.currentTarget.value,
      event.currentTarget.selectionStart,
      event.currentTarget.selectionEnd,
    );

    if (formatted.selectionStart !== null && formatted.selectionEnd !== null) {
      pendingSelection.current = {
        start: formatted.selectionStart,
        end: formatted.selectionEnd,
      };
    } else {
      pendingSelection.current = null;
    }

    onChange(formatted.value);
  }

  function handleBlur() {
    const formatted = formatPesoInputOnBlur(value);

    if (formatted !== value) onChange(formatted);
  }

  return (
    <Field data-invalid={hasError}>
      <FieldLabel htmlFor="plannedBudgetPesos">Planned budget (optional)</FieldLabel>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>₱</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          ref={inputRef}
          id="plannedBudgetPesos"
          name="plannedBudgetPesos"
          className="font-mono tabular-nums"
          type="text"
          inputMode="decimal"
          value={value}
          aria-invalid={hasError}
          aria-describedby={hasError ? "plannedBudgetPesos-error" : undefined}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      </InputGroup>
      {hasError ? (
        <FieldError id="plannedBudgetPesos-error" errors={error?.map((message) => ({ message }))} />
      ) : null}
    </Field>
  );
}
