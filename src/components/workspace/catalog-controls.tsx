"use client";

import type { ComponentProps } from "react";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

export function WorkspaceSearchField({
  id,
  label,
  placeholder,
  value,
  onValueChange,
  className,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}) {
  return (
    <Field className={cn("min-w-0 flex-1", className)}>
      <FieldLabel className="sr-only" htmlFor={id}>
        {label}
      </FieldLabel>
      <InputGroup className="h-9 bg-card">
        <InputGroupAddon>
          <Search aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          id={id}
          className="text-body-sm"
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
        />
      </InputGroup>
    </Field>
  );
}

export function WorkspacePrimaryAction({
  className,
  children,
  type = "button",
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      type={type}
      size="sm"
      className={cn("h-9 w-full sm:w-auto", className)}
      {...props}
    >
      <Plus data-icon="inline-start" />
      {children}
    </Button>
  );
}

export function WorkspaceCatalogToolbar({
  ariaLabel,
  searchId,
  searchLabel,
  searchPlaceholder,
  search,
  onSearchChange,
  action,
}: {
  ariaLabel: string;
  searchId: string;
  searchLabel: string;
  searchPlaceholder: string;
  search: string;
  onSearchChange: (search: string) => void;
  action?: {
    id: string;
    label: string;
    onClick: () => void;
    className?: string;
  };
}) {
  return (
    <div
      aria-label={ariaLabel}
      className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between"
      role="search"
    >
      <WorkspaceSearchField
        id={searchId}
        label={searchLabel}
        placeholder={searchPlaceholder}
        value={search}
        onValueChange={onSearchChange}
        className="sm:max-w-[27rem]"
      />
      {action ? (
        <WorkspacePrimaryAction
          id={action.id}
          className={action.className}
          onClick={action.onClick}
        >
          {action.label}
        </WorkspacePrimaryAction>
      ) : null}
    </div>
  );
}
