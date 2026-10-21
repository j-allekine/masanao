"use client";

import { forwardRef, useRef, useSyncExternalStore, type ComponentProps, type ComponentRef, type ReactNode } from "react";
import Link from "next/link";
import { Plus, Search, X } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

const subscribeHydration = () => () => {};

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
  const inputRef = useRef<HTMLInputElement>(null);
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  return (
    <Field className={cn("min-w-0 flex-1", className)}>
      <FieldLabel htmlFor={id}>
        {label}
      </FieldLabel>
      <InputGroup>
        <InputGroupAddon>
          <Search aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          ref={inputRef}
          disabled={!hydrated}
          id={id}
          className="text-body-sm"
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
        />
        {value ? (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-xs"
              disabled={!hydrated}
              aria-label="Clear search"
              onClick={() => {
                onValueChange("");
                inputRef.current?.focus();
              }}
            >
              <X aria-hidden="true" />
            </InputGroupButton>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
    </Field>
  );
}

export function WorkspaceFilterField({ id, label, children, className }: {
  id: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Field data-catalog-filter className={cn("w-full min-w-0 sm:w-56", className)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
    </Field>
  );
}

export const WorkspacePrimaryAction = forwardRef<
  ComponentRef<typeof Button>,
  ComponentProps<typeof Button> & { icon?: ReactNode }
>(function WorkspacePrimaryAction(
  {
    className,
    children,
    icon = <Plus data-icon="inline-start" />,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <Button
      ref={ref}
      type={type}
      size="lg"
      className={cn("w-full sm:w-auto", className)}
      {...props}
    >
      {icon}
      {children}
    </Button>
  );
});

export function WorkspacePrimaryLink({
  className,
  fullWidth = false,
  icon,
  children,
  ...props
}: ComponentProps<typeof Link> & { fullWidth?: boolean; icon?: ReactNode }) {
  return (
    <Link
      className={cn(
        buttonVariants({ size: "lg" }),
        fullWidth && "w-full sm:w-auto",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </Link>
  );
}

export function WorkspaceCatalogToolbar({
  ariaLabel,
  searchId,
  searchLabel,
  searchPlaceholder,
  search,
  onSearchChange,
  filterContent,
  hasFilters = false,
  onClearFilters,
  action,
}: {
  ariaLabel: string;
  searchId: string;
  searchLabel: string;
  searchPlaceholder: string;
  search: string;
  onSearchChange: (search: string) => void;
  filterContent?: ReactNode;
  hasFilters?: boolean;
  onClearFilters?: () => void;
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
      data-catalog-toolbar
      className="flex min-w-0 flex-col gap-4 border-b pb-5"
      role="search"
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <WorkspaceSearchField
          id={searchId}
          label={searchLabel}
          placeholder={searchPlaceholder}
          value={search}
          onValueChange={onSearchChange}
          className="w-full sm:max-w-[27rem]"
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
      {filterContent ? (
        <div data-catalog-filters className="flex min-w-0 flex-wrap items-end gap-3">
          {filterContent}
          {hasFilters && onClearFilters ? (
            <Button
              type="button"
              variant="ghost"
              className="shrink-0"
              onClick={() => {
                onClearFilters();
                document.getElementById(searchId)?.focus();
              }}
            >
              <X data-icon="inline-start" aria-hidden="true" />
              Clear filters
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
