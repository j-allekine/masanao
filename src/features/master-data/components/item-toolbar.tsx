"use client";

import { ListFilter, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { CategoryListItem } from "../types";
import type { ItemListFilters } from "./item-filters";
import type { ItemListStatus } from "./item-list-state";

export default function ItemToolbar({
  filters,
  categories,
  hasFilters,
  onSearchChange,
  onCategoryChange,
  onStatusChange,
  onClearFilters,
}: {
  filters: ItemListFilters;
  categories: CategoryListItem[];
  hasFilters: boolean;
  onSearchChange: (search: string) => void;
  onCategoryChange: (categoryId: string) => void;
  onStatusChange: (status: ItemListStatus) => void;
  onClearFilters: () => void;
}) {
  return (
    <div
      aria-label="Item catalog search and filters"
      className="flex flex-col gap-3 border-b pb-5"
      role="search"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <Field className="min-w-0 flex-1 lg:max-w-[28rem]">
          <FieldLabel className="sr-only" htmlFor="item-search">
            Search Items
          </FieldLabel>
          <InputGroup className="h-9 bg-card">
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              id="item-search"
              className="text-body-sm"
              type="search"
              placeholder="Search items by name..."
              value={filters.search}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </InputGroup>
        </Field>

        <Field className="min-w-0 lg:w-56">
          <FieldLabel className="sr-only" htmlFor="item-category-filter">
            Category filter
          </FieldLabel>
          <Select
            value={filters.categoryId || "all"}
            onValueChange={(value) =>
              onCategoryChange(value === "all" ? "" : (value ?? ""))
            }
          >
            <SelectTrigger id="item-category-filter" className="w-full bg-card">
              <ListFilter aria-hidden="true" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Category</SelectLabel>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field className="min-w-0 lg:w-48">
          <FieldLabel className="sr-only" htmlFor="item-status-filter">
            Status filter
          </FieldLabel>
          <Select
            value={filters.status}
            onValueChange={(value) =>
              onStatusChange((value as ItemListStatus | null) ?? "all")
            }
          >
            <SelectTrigger id="item-status-filter" className="w-full bg-card">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Status</SelectLabel>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active only</SelectItem>
                <SelectItem value="inactive">Inactive only</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        {hasFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 shrink-0 justify-start lg:justify-center"
            onClick={onClearFilters}
          >
            <X data-icon="inline-start" />
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
