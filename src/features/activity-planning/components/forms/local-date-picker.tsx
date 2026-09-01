"use client";

import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function parseLocalDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : undefined;
}

function formatLocalDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDateLabel(value: string) {
  const date = parseLocalDate(value);
  return date
    ? new Intl.DateTimeFormat("en-PH", { dateStyle: "long" }).format(date)
    : "Select scheduled date";
}

export default function LocalDatePicker({
  id,
  value,
  error,
  required = false,
  onChange,
}: {
  id: string;
  value: string;
  error?: string[];
  required?: boolean;
  onChange: (value: string) => void;
}) {
  const selectedDate = parseLocalDate(value);
  const hasError = Boolean(error?.length);

  return (
    <Field data-invalid={hasError}>
      <FieldLabel htmlFor={id}>
        Scheduled date
        {required ? (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </FieldLabel>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              id={id}
              variant="outline"
              aria-invalid={hasError}
              className="w-full justify-between font-normal"
            />
          }
        >
          <span className={value ? "text-foreground" : "text-muted-foreground"}>
            {formatDateLabel(value)}
          </span>
          <CalendarDays data-icon="inline-end" />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            defaultMonth={selectedDate}
            onSelect={(date) => onChange(date ? formatLocalDate(date) : "")}
          />
        </PopoverContent>
      </Popover>
      <input type="hidden" name="scheduledDate" value={value} />
      {hasError ? (
        <FieldError errors={error?.map((message) => ({ message }))} />
      ) : null}
    </Field>
  );
}
