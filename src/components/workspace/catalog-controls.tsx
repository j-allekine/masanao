"use client";

import { forwardRef, useEffect, useRef, useState, useSyncExternalStore, type ComponentProps, type ComponentRef, type FocusEvent, type ReactNode } from "react";
import Link from "next/link";
import { ListFilter, Plus, Search, X } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

const subscribeHydration = () => () => {};
const INLINE_FILTERS_MIN_WIDTH = 760;

export function WorkspaceSearchField({
  id,
  label,
  placeholder,
  value,
  onValueChange,
  className,
  describedBy,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  describedBy?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  return (
    <Field className={cn("min-w-0 flex-1", className)}>
      <FieldLabel htmlFor={id}>
        Search
      </FieldLabel>
      <InputGroup className="h-10">
        <InputGroupAddon>
          <Search aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          ref={inputRef}
          disabled={!hydrated}
          id={id}
          aria-label={label}
          aria-describedby={describedBy}
          className="h-10 text-body-sm [&::-webkit-search-cancel-button]:appearance-none"
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
        />
        {value ? (
          <InputGroupAddon align="inline-end" className="py-0">
            <InputGroupButton
              size="icon-xs"
              className="size-10"
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
    <Field data-catalog-filter className={cn("w-full min-w-0 sm:w-44 [&_[data-slot=select-trigger]]:min-h-10", className)}>
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
      className={cn("h-auto min-h-10 w-full whitespace-normal py-2 sm:w-auto", className)}
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
        "h-auto min-h-10 whitespace-normal py-2",
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
  activeFilterCount = 0,
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
  activeFilterCount?: number;
  onClearFilters?: () => void;
  action?: {
    id: string;
    label: string;
    onClick: () => void;
    className?: string;
  };
}) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [filtersInline, setFiltersInline] = useState<boolean | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const inlineRef = useRef<boolean | null>(null);
  const focusedFilterId = useRef<string | null>(null);
  const focusFrame = useRef<number | null>(null);
  const hasAdditionalFilters = Boolean(filterContent);

  function rememberFilterFocus(event: FocusEvent<HTMLElement>) {
    const field = (event.target as HTMLElement).closest("[data-catalog-filter]");
    const control = field?.querySelector<HTMLElement>("button[id], input[id], [role=combobox][id]");
    if (control?.id) focusedFilterId.current = control.id;
  }

  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar || !hasAdditionalFilters) return;
    // Leave room for search, two selectors and Reset beside the workspace sidebar.
    const observer = new ResizeObserver(([entry]) => {
      const inline = entry.contentRect.width >= INLINE_FILTERS_MIN_WIDTH;
      if (inlineRef.current === inline) return;
      const active = document.activeElement;
      const previousControl = focusedFilterId.current ? document.getElementById(focusedFilterId.current) : null;
      const popupId = previousControl?.getAttribute("aria-controls");
      const popup = popupId ? document.getElementById(popupId) : null;
      const filterHadFocus = Boolean(previousControl?.contains(active) || popup?.contains(active));
      const focusTrigger = inlineRef.current === true && !inline && filterHadFocus;
      inlineRef.current = inline;
      if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
      setFiltersInline(inline);
      if (inline) setFiltersOpen(false);
      if (focusTrigger) focusFrame.current = requestAnimationFrame(() => {
        if (!inlineRef.current) filterTriggerRef.current?.focus();
      });
    });
    observer.observe(toolbar);
    return () => {
      observer.disconnect();
      if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    };
  }, [hasAdditionalFilters]);

  return (
    <div
      ref={toolbarRef}
      aria-label={ariaLabel}
      data-catalog-toolbar
      data-filter-layout={filterContent ? (filtersInline === null ? "pending" : filtersInline ? "inline" : "panel") : "search"}
      className="flex min-w-0 flex-wrap items-end gap-3 border-b pb-5"
      role="search"
      onFocusCapture={rememberFilterFocus}
    >
        <WorkspaceSearchField
          id={searchId}
          label={searchLabel}
          placeholder={searchPlaceholder}
          value={search}
          onValueChange={onSearchChange}
          describedBy={`${searchId}-hint`}
          className={filterContent ? "w-0 flex-1 sm:max-w-[24rem]" : "w-full sm:max-w-[27rem]"}
        />
        {filterContent ? <Sheet open={filtersOpen && !filtersInline} onOpenChange={setFiltersOpen}>
          {filtersInline ? <>
          {filterContent}
          {activeFilterCount > 0 && onClearFilters ? (
            <Button type="button" variant="ghost" className="h-auto min-h-10 whitespace-normal py-2" onClick={() => {
              onClearFilters();
              document.getElementById(searchId)?.focus();
            }}>
              <X data-icon="inline-start" aria-hidden="true" />Reset
            </Button>
          ) : null}
        </> : <SheetTrigger render={<Button ref={filterTriggerRef} type="button" variant="outline" className="h-auto min-h-10 whitespace-normal py-2" disabled={filtersInline === null} aria-label={activeFilterCount ? `Filters (${activeFilterCount} active)` : "Filters"} />}>
              <ListFilter data-icon="inline-start" aria-hidden="true" />
              Filters{activeFilterCount ? ` · ${activeFilterCount}` : ""}
            </SheetTrigger>}
            <SheetContent
              onFocusCapture={rememberFilterFocus}
              finalFocus={() => filtersInline
                ? (focusedFilterId.current ? document.getElementById(focusedFilterId.current) : null) ?? document.getElementById(searchId)
                : filterTriggerRef.current ?? document.getElementById(searchId)}
              className="data-[side=right]:w-full [&_[data-catalog-filter]]:w-full"
            >
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>Narrow the list. Changes apply immediately.</SheetDescription>
              </SheetHeader>
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4">
                {!filtersInline ? filterContent : null}
              </div>
              <SheetFooter>
                {activeFilterCount > 0 && onClearFilters ? <Button type="button" variant="outline" className="h-auto min-h-10 whitespace-normal py-2" onClick={() => {
                  onClearFilters();
                  setFiltersOpen(false);
                }}>Reset filters</Button> : null}
                <SheetClose render={<Button type="button" className="h-auto min-h-10 whitespace-normal py-2" />}>Show results</SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet> : null}
        {action ? (
          <WorkspacePrimaryAction
            id={action.id}
            className={cn("sm:ml-auto", action.className)}
            onClick={action.onClick}
          >
            {action.label}
          </WorkspacePrimaryAction>
        ) : null}
        <FieldDescription id={`${searchId}-hint`} className="w-full">Results update as you type.</FieldDescription>
    </div>
  );
}
