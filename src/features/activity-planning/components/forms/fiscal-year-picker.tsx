"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const MIN_FISCAL_YEAR = 1900;
const MAX_FISCAL_YEAR = 9999;
const DECADE_SIZE = 10;

function decadeStart(year: number) {
  return Math.floor(year / DECADE_SIZE) * DECADE_SIZE;
}

export default function FiscalYearPicker({
  id,
  value,
  onChange,
  hasError = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [viewStart, setViewStart] = useState(() =>
    decadeStart(Number(value) || new Date().getFullYear()),
  );

  function selectYear(year: number) {
    onChange(String(year));
    setOpen(false);
  }

  const years = Array.from(
    { length: DECADE_SIZE },
    (_, index) => viewStart + index,
  ).filter((year) => year >= MIN_FISCAL_YEAR && year <= MAX_FISCAL_YEAR);
  const canMovePrevious = viewStart > MIN_FISCAL_YEAR;
  const canMoveNext = viewStart < decadeStart(MAX_FISCAL_YEAR);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen && value) setViewStart(decadeStart(Number(value)));
      }}
    >
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
          {value ? `FY ${value}` : "Select fiscal year"}
        </span>
        <CalendarDays data-icon="inline-end" />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Previous decade"
            disabled={!canMovePrevious}
            onClick={() => setViewStart((current) => current - DECADE_SIZE)}
          >
            <ChevronLeft />
          </Button>
          <p className="text-sm font-medium" aria-live="polite">
            {viewStart}–{viewStart + DECADE_SIZE - 1}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Next decade"
            disabled={!canMoveNext}
            onClick={() => setViewStart((current) => current + DECADE_SIZE)}
          >
            <ChevronRight />
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1.5" role="group" aria-label="Fiscal years">
          {years.map((year) => (
            <Button
              key={year}
              type="button"
              variant={String(year) === value ? "default" : "ghost"}
              className="w-full"
              aria-pressed={String(year) === value}
              onClick={() => selectYear(year)}
            >
              {year}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
