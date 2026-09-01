"use client";

import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

export default function ActivityDesignToolbar({
  search,
  onSearchChange,
  onCreate,
}: {
  search: string;
  onSearchChange: (search: string) => void;
  onCreate: () => void;
}) {
  return (
    <div
      aria-label="Activity Design search"
      className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between"
      role="search"
    >
      <Field className="min-w-0 flex-1 sm:max-w-[27rem]">
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
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </InputGroup>
      </Field>
      <Button
        id="new-activity-design"
        type="button"
        size="sm"
        className="h-9 w-full sm:w-auto sm:min-w-[12rem]"
        onClick={onCreate}
      >
        <Plus data-icon="inline-start" />
        Create Activity Design
      </Button>
    </div>
  );
}
