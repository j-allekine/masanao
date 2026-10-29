"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverDescription, PopoverTrigger } from "@/components/ui/popover";
import type { DashboardPeriod } from "../dashboard-types";

const label = (day: string) => new Intl.DateTimeFormat("en-PH", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(day));

export default function DashboardPeriodPicker({ period, disabled, onApply }: {
  period: DashboardPeriod; disabled: boolean; onApply: (period: DashboardPeriod) => void;
}) {
  const [open, setOpen] = useState(false);
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger render={<Button variant="outline" className="h-auto min-h-8 max-w-full py-1.5" disabled={disabled} aria-label="Reporting period" />}>
      <CalendarDays data-icon="inline-start" aria-hidden="true" />
      <span className="min-w-0 whitespace-normal">{label(period.start)} – {label(period.end)}</span>
      <ChevronDown data-icon="inline-end" aria-hidden="true" />
    </PopoverTrigger>
    <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] gap-4 p-4">
      <PopoverHeader><PopoverTitle>Reporting period</PopoverTitle><PopoverDescription>Both dates are included.</PopoverDescription></PopoverHeader>
      <form key={`${period.start}/${period.end}`} onSubmit={(event) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        onApply({ start: String(values.get("start")), end: String(values.get("end")) });
        setOpen(false);
      }}>
        <FieldGroup className="grid min-w-0 grid-cols-2 gap-3">
          <Field className="min-w-0"><FieldLabel htmlFor="dashboard-start">From</FieldLabel><Input id="dashboard-start" name="start" type="date" required defaultValue={period.start} disabled={disabled} /></Field>
          <Field className="min-w-0"><FieldLabel htmlFor="dashboard-end">To</FieldLabel><Input id="dashboard-end" name="end" type="date" required defaultValue={period.end} disabled={disabled} /></Field>
          <Button type="submit" className="col-span-2" disabled={disabled}>Apply period</Button>
        </FieldGroup>
      </form>
    </PopoverContent>
  </Popover>;
}
