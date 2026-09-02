"use client";

import { Search } from "lucide-react";

import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

export default function ActivitiesToolbar({
  search,
  onSearchChange,
}: {
  search: string;
  onSearchChange: (search: string) => void;
}) {
  return (
    <div
      aria-label="Activity search"
      className="flex flex-col gap-3 border-b pb-5"
      role="search"
    >
      <Field className="min-w-0 flex-1 sm:max-w-[27rem]">
        <FieldLabel className="sr-only" htmlFor="activity-search">
          Search Activities
        </FieldLabel>
        <InputGroup className="h-9 bg-card">
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            id="activity-search"
            className="text-body-sm"
            type="search"
            placeholder="Search activities..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </InputGroup>
      </Field>
    </div>
  );
}
