"use client";

import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

export default function MasterDataCatalogToolbar({
  resourceKey,
  resourceLabels,
  search,
  onSearchChange,
  canCreate,
  onCreate,
}: {
  resourceKey: string;
  resourceLabels: { singular: string; plural: string };
  search: string;
  onSearchChange: (search: string) => void;
  canCreate: boolean;
  onCreate: () => void;
}) {
  const searchInputId = `${resourceKey}-search`;
  const createButtonId = `new-${resourceKey}`;

  return (
    <div
      aria-label={`${resourceLabels.singular} search`}
      className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between"
      role="search"
    >
      <Field className="min-w-0 flex-1 sm:max-w-[27rem]">
        <FieldLabel className="sr-only" htmlFor={searchInputId}>
          Search {resourceLabels.plural}
        </FieldLabel>
        <InputGroup className="h-9 bg-card">
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            id={searchInputId}
            className="text-body-sm"
            type="search"
            placeholder={`Search ${resourceLabels.plural.toLowerCase()}...`}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </InputGroup>
      </Field>
      {canCreate ? (
        <Button
          id={createButtonId}
          type="button"
          size="sm"
          className="h-9 w-full sm:w-auto sm:min-w-[9rem]"
          onClick={onCreate}
        >
          <Plus data-icon="inline-start" />
          Create {resourceLabels.singular}
        </Button>
      ) : null}
    </div>
  );
}
