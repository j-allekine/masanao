"use client";

import { useState, type FormEvent } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DashboardPeriod } from "../dashboard-types";

const label = (day: string) => new Intl.DateTimeFormat("en-PH", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(day));
const dateFields = [
  { name: "start", label: "From" },
  { name: "end", label: "To" },
] as const;

export default function DashboardPeriodPicker({ period, disabled, onApply }: {
  period: DashboardPeriod; disabled: boolean; onApply: (period: DashboardPeriod) => void;
}) {
  const [open, setOpen] = useState(false);
  const [missingDates, setMissingDates] = useState<Partial<Record<keyof DashboardPeriod, boolean>>>({});

  function handleApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;

    const values = new FormData(event.currentTarget);
    const start = String(values.get("start") ?? "");
    const end = String(values.get("end") ?? "");
    if (!start || !end) {
      setMissingDates({ start: !start, end: !end });
      const firstMissing = event.currentTarget.elements.namedItem(!start ? "start" : "end");
      if (firstMissing instanceof HTMLInputElement) {
        requestAnimationFrame(() => firstMissing.focus());
      }
      return;
    }

    onApply({ start, end });
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setMissingDates({});
      }}
    >
      <PopoverTrigger render={<Button variant="outline" className="h-auto min-h-8 max-w-full py-1.5" disabled={disabled} aria-label="Reporting period" />}>
        <CalendarDays data-icon="inline-start" aria-hidden="true" />
        <span className="min-w-0 whitespace-normal">{label(period.start)} – {label(period.end)}</span>
        <ChevronDown data-icon="inline-end" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] gap-4 p-4">
        <PopoverHeader>
          <PopoverTitle>Reporting period</PopoverTitle>
          <PopoverDescription>Both dates are included.</PopoverDescription>
        </PopoverHeader>
        <form key={`${period.start}/${period.end}`} noValidate onSubmit={handleApply}>
          <FieldGroup className="grid min-w-0 grid-cols-2 gap-3">
            {dateFields.map(({ name, label }) => {
              const id = `dashboard-${name}`;
              const errorId = `${id}-error`;
              const isMissing = Boolean(missingDates[name]);
              return (
                <Field key={name} className="min-w-0" data-invalid={isMissing}>
                  <FieldLabel htmlFor={id} required>{label}</FieldLabel>
                  <Input
                    id={id}
                    name={name}
                    type="date"
                    required
                    defaultValue={period[name]}
                    disabled={disabled}
                    aria-invalid={isMissing}
                    aria-describedby={isMissing ? errorId : undefined}
                    onChange={(event) => {
                      if (isMissing && event.target.value) {
                        setMissingDates((current) => ({ ...current, [name]: false }));
                      }
                    }}
                  />
                  {isMissing && <FieldError id={errorId} visuallyHidden>{label} date is required</FieldError>}
                </Field>
              );
            })}
            <Button type="submit" className="col-span-2" disabled={disabled}>Apply period</Button>
          </FieldGroup>
        </form>
      </PopoverContent>
    </Popover>
  );
}
