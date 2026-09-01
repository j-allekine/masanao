"use client";

import { Filter, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  ALL_FILTER_VALUE,
  type ActivityDesignFilterOptions,
  type ActivityDesignFilters,
} from "./activity-design-filters";

const FISCAL_YEAR_FILTER_PREFIX = "fiscal-year:";

function removeFilterPrefix(value: string | null, prefix: string) {
  if (!value || !value.startsWith(prefix)) return "";

  return value.slice(prefix.length);
}

export default function ActivityDesignToolbar({
  filters,
  options,
  onFiltersChange,
  onClear,
  showClear,
}: {
  filters: ActivityDesignFilters;
  options: ActivityDesignFilterOptions;
  onFiltersChange: (filters: ActivityDesignFilters) => void;
  onClear: () => void;
  showClear: boolean;
}) {
  return (
    <div
      aria-label="Activity Design filters"
      className="flex flex-wrap items-end justify-between gap-3"
      role="search"
    >
      <div className="flex min-w-0 flex-1 items-end gap-2">
        <Field className="w-full min-w-52 max-w-[27rem]">
          <FieldLabel className="sr-only" htmlFor="activity-design-search">
            Search Activity Designs
          </FieldLabel>
          <InputGroup className="h-9 bg-card">
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              id="activity-design-search"
              className="text-body-sm"
              type="search"
              placeholder="Search activity designs..."
              value={filters.search}
              onChange={(event) =>
                onFiltersChange({ ...filters, search: event.target.value })
              }
            />
          </InputGroup>
        </Field>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0"
          onClick={() => document.getElementById("activity-design-fiscal-year")?.focus()}
        >
          <Filter data-icon="inline-start" />
          Filters
        </Button>
      </div>

      <div className="flex items-end gap-2">
        <Field orientation="horizontal" className="w-auto items-center gap-2">
          <FieldLabel className="text-label font-semibold" htmlFor="activity-design-fiscal-year">
            Fiscal Year
          </FieldLabel>
          <Select
            value={
              filters.fiscalYear
                ? `${FISCAL_YEAR_FILTER_PREFIX}${filters.fiscalYear}`
                : ALL_FILTER_VALUE
            }
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                fiscalYear: removeFilterPrefix(value, FISCAL_YEAR_FILTER_PREFIX),
              })
            }
          >
            <SelectTrigger
              id="activity-design-fiscal-year"
              aria-label="Fiscal Year"
              className="h-9 w-28 bg-card text-body-sm"
            >
              <SelectValue placeholder="All years" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={ALL_FILTER_VALUE}>All years</SelectItem>
                {options.fiscalYears.map((fiscalYear) => (
                  <SelectItem
                    key={fiscalYear}
                    value={`${FISCAL_YEAR_FILTER_PREFIX}${fiscalYear}`}
                  >
                    {fiscalYear}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={showClear ? "h-9" : "h-9 text-muted-foreground"}
          onClick={onClear}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
