"use client";

import { forwardRef, type ComponentProps, type ComponentRef, type ReactNode } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
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
  action,
}: {
  ariaLabel: string;
  searchId: string;
  searchLabel: string;
  searchPlaceholder: string;
  search: string;
  onSearchChange: (search: string) => void;
  filterContent?: ReactNode;
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
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-3",
          filterContent
            ? "lg:flex-row lg:items-end"
            : "sm:flex-row sm:items-end",
        )}
      >
        <WorkspaceSearchField
          id={searchId}
          label={searchLabel}
          placeholder={searchPlaceholder}
          value={search}
          onValueChange={onSearchChange}
          className={cn(
            filterContent ? "lg:max-w-[28rem]" : "sm:max-w-[27rem]",
          )}
        />
        {filterContent}
      </div>
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
