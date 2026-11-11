"use client";

import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function parseLocalDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : undefined;
}

export function formatLocalDate(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function formatDateLabel(value: string, emptyLabel: string) {
  const date = parseLocalDate(value);
  return date ? new Intl.DateTimeFormat("en-PH", { dateStyle: "long" }).format(date) : emptyLabel;
}

export default function LocalDatePicker({ id, name, label, emptyLabel, value, error, required = false, onChange }: { id: string; name: string; label: string; emptyLabel: string; value: string; error?: string[]; required?: boolean; onChange: (value: string) => void }) {
  const selectedDate = parseLocalDate(value);
  const hasError = Boolean(error?.length);
  const describedBy = [required && `${id}-required`, hasError && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return <Field data-invalid={hasError}>
    <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel>
    <Popover>
      <PopoverTrigger render={<Button type="button" id={id} variant="outline" aria-invalid={hasError} aria-describedby={describedBy} className="w-full justify-between font-normal" />}>
        <span className={value ? "text-foreground" : "text-muted-foreground"}>{formatDateLabel(value, emptyLabel)}</span>
        <CalendarDays data-icon="inline-end" />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={selectedDate} defaultMonth={selectedDate} onSelect={(date) => onChange(date ? formatLocalDate(date) : "")} /></PopoverContent>
    </Popover>
    {required && <span id={`${id}-required`} className="sr-only">Required</span>}
    {/* Native hidden input carries the selected date in standard form submission. */}
    <input type="hidden" name={name} value={value} />
    {hasError ? <FieldError visuallyHidden id={`${id}-error`} errors={error?.map((message) => ({ message }))} /> : null}
  </Field>;
}
