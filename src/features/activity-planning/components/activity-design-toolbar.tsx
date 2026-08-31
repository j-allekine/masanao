"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      className="flex flex-wrap items-end gap-2"
      role="search"
    >
      <div className="min-w-56 flex-1">
        <label className="sr-only" htmlFor="activity-design-search">
          Search Activity Designs
        </label>
        <Input
          id="activity-design-search"
          type="search"
          placeholder="Search by design no. or title"
          value={filters.search}
          onChange={(event) =>
            onFiltersChange({ ...filters, search: event.target.value })
          }
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="sr-only" htmlFor="activity-design-fiscal-year">
          Fiscal Year
        </label>
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
            className="w-full min-w-32 sm:w-36"
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
      </div>

      {showClear ? (
        <Button type="button" variant="ghost" onClick={onClear}>
          <RotateCcw data-icon="inline-start" />
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}
