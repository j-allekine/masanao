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
const OFFICE_FILTER_PREFIX = "office:";

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
      <div className="min-w-56 flex-1 sm:max-w-md">
        <label className="sr-only" htmlFor="activity-design-search">
          Search Activity Designs
        </label>
        <Input
          id="activity-design-search"
          type="search"
          placeholder="Search Activity Designs..."
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
            className="w-full min-w-40 sm:w-44"
          >
            <SelectValue placeholder="Fiscal Year: All" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL_FILTER_VALUE}>Fiscal Year: All</SelectItem>
              {options.fiscalYears.map((fiscalYear) => (
                <SelectItem
                  key={fiscalYear}
                  value={`${FISCAL_YEAR_FILTER_PREFIX}${fiscalYear}`}
                >
                  FY {fiscalYear}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="sr-only" htmlFor="activity-design-office">
          Office
        </label>
        <Select
          value={
            filters.office
              ? `${OFFICE_FILTER_PREFIX}${filters.office}`
              : ALL_FILTER_VALUE
          }
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              office: removeFilterPrefix(value, OFFICE_FILTER_PREFIX),
            })
          }
        >
          <SelectTrigger
            id="activity-design-office"
            aria-label="Office"
            className="w-full min-w-40 sm:w-52"
          >
            <SelectValue placeholder="Office: All" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={ALL_FILTER_VALUE}>Office: All</SelectItem>
              {options.offices.map((office) => (
                <SelectItem
                  key={office}
                  value={`${OFFICE_FILTER_PREFIX}${office}`}
                >
                  {office}
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
