"use client";

import { WorkspaceCatalogToolbar, WorkspaceFilterField } from "@/components/workspace/catalog-controls";
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
  const categoryItems = [
    { value: "all", label: "All Categories" },
    ...categories.map((category) => ({
      value: category.id,
      label: category.name,
    })),
  ];
  const statusItems = [
    { value: "all", label: "All Statuses" },
    { value: "active", label: "Active only" },
    { value: "inactive", label: "Inactive only" },
  ];

  return (
    <WorkspaceCatalogToolbar
      ariaLabel="Item catalog search and filters"
      searchId="item-search"
      searchLabel="Search Items"
      searchPlaceholder="Search items by name..."
      search={filters.search}
      onSearchChange={onSearchChange}
      hasFilters={hasFilters && Boolean(filters.categoryId || filters.status !== "all")}
      onClearFilters={onClearFilters}
      filterContent={
        <>
          <WorkspaceFilterField id="item-category-filter" label="Category">
            <Select
              items={categoryItems}
              value={filters.categoryId || "all"}
              onValueChange={(value) =>
                onCategoryChange(value === "all" ? "" : (value ?? ""))
              }
            >
              <SelectTrigger
                id="item-category-filter"
                aria-label="Category filter"
                className="w-full"
              >
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
          </WorkspaceFilterField>

          <WorkspaceFilterField id="item-status-filter" label="Status">
            <Select
              items={statusItems}
              value={filters.status}
              onValueChange={(value) =>
                onStatusChange((value as ItemListStatus | null) ?? "all")
              }
            >
              <SelectTrigger
                id="item-status-filter"
                aria-label="Status filter"
                className="w-full"
              >
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
          </WorkspaceFilterField>
        </>
      }
    />
  );
}
