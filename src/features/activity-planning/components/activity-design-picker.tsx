"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import type { ActivityDesignListItem } from "../types";

export function filterActivityDesignOptions(
  activityDesigns: ActivityDesignListItem[],
  search: string,
) {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) return activityDesigns;

  return activityDesigns.filter(
    (activityDesign) =>
      activityDesign.title.toLowerCase().includes(normalizedSearch) ||
      activityDesign.activityDesignNo.toLowerCase().includes(normalizedSearch),
  );
}

function ActivityDesignOptionText({
  activityDesign,
  selected = false,
}: {
  activityDesign: ActivityDesignListItem;
  selected?: boolean;
}) {
  return (
    <span className="flex min-w-0 flex-1 flex-col text-left">
      <span className={cn("truncate", selected && "font-medium")}>
        {activityDesign.title}
      </span>
      <span className="truncate font-mono text-label text-muted-foreground tabular-nums">
        {activityDesign.activityDesignNo}
      </span>
    </span>
  );
}

export default function ActivityDesignPicker({
  id = "activityDesignId",
  activityDesigns,
  value,
  error,
  onChange,
}: {
  id?: string;
  activityDesigns: ActivityDesignListItem[];
  value: string;
  error?: string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedActivityDesign = activityDesigns.find(
    (activityDesign) => activityDesign.id === value,
  );
  const filteredActivityDesigns = useMemo(
    () => filterActivityDesignOptions(activityDesigns, search),
    [activityDesigns, search],
  );
  const hasError = Boolean(error?.length);
  const errorId = `${id}-error`;

  function closePicker() {
    setOpen(false);
    setSearch("");
  }

  return (
    <Field data-invalid={hasError}>
      <FieldLabel htmlFor={id}>
        Activity Design
        <span className="text-destructive" aria-hidden="true">
          *
        </span>
      </FieldLabel>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setSearch("");
        }}
      >
        <PopoverTrigger
          render={
            <Button
              type="button"
              id={id}
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-controls={`${id}-options`}
              aria-invalid={hasError}
              aria-describedby={hasError ? errorId : undefined}
              className="h-auto min-h-8 w-full justify-between gap-3 py-1.5 text-left font-normal"
            />
          }
        >
          {selectedActivityDesign ? (
            <ActivityDesignOptionText
              activityDesign={selectedActivityDesign}
              selected
            />
          ) : (
            <span className="text-muted-foreground">
              Select an Activity Design
            </span>
          )}
          <ChevronsUpDown
            data-icon="inline-end"
            aria-hidden="true"
            className="shrink-0 text-muted-foreground"
          />
        </PopoverTrigger>
        <PopoverContent className="w-(--anchor-width) min-w-72 p-2" align="start">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              autoFocus
              aria-label="Search Activity Designs"
              className="h-8 pl-8"
              placeholder="Search Activity Designs..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div
            id={`${id}-options`}
            className="max-h-60 overflow-y-auto"
            role="listbox"
            aria-label="Activity Designs"
          >
            {filteredActivityDesigns.length ? (
              filteredActivityDesigns.map((activityDesign) => (
                <Button
                  key={activityDesign.id}
                  type="button"
                  variant="ghost"
                  role="option"
                  aria-selected={activityDesign.id === value}
                  className="h-auto min-h-10 w-full justify-start gap-2 py-1.5 pr-2"
                  onClick={() => {
                    onChange(activityDesign.id);
                    closePicker();
                  }}
                >
                  <Check
                    data-icon="inline-start"
                    aria-hidden="true"
                    className={cn(
                      "shrink-0",
                      activityDesign.id === value
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  <ActivityDesignOptionText activityDesign={activityDesign} />
                </Button>
              ))
            ) : (
              <p className="px-2 py-3 text-label text-muted-foreground">
                No Activity Designs match your search.
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {hasError ? (
        <FieldError id={errorId} errors={error?.map((message) => ({ message }))} />
      ) : null}
    </Field>
  );
}
