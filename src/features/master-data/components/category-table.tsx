"use client";

import { useState } from "react";
import { Tags } from "lucide-react";

import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import WorkspaceLifecycleBadge from "@/components/workspace/lifecycle-badge";
import WorkspaceTableFrame from "@/components/workspace/table-frame";

import type { CategoryListItem } from "../types";
import { hasCategoryFilters } from "./category-filters";
import MasterDataActionsMenu from "./master-data-actions-menu";
import DeleteCategoryDialog from "./delete-category-dialog";
import ListEmptyState from "@/components/workspace/list-empty-state";

function CategoryRow({
  category,
  onEdit,
  onSetActive,
  onDeleted,
  actionDisabled,
  canManage,
}: {
  category: CategoryListItem;
  onEdit: () => void;
  onSetActive: (isActive: boolean) => void;
  onDeleted: () => void;
  actionDisabled: boolean;
  canManage: boolean;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <>
      <TableRow className="hover:bg-muted/35">
        <TableCell data-primary>
          <span tabIndex={-1} data-master-data-record-id={category.id} className="block [overflow-wrap:anywhere]">{category.name}</span>
        </TableCell>
        <TableCell data-label="Description">
          <span className="block text-muted-foreground [overflow-wrap:anywhere]">
            {category.description ?? "—"}
          </span>
        </TableCell>
        <TableCell data-label="Status" className="text-center">
          <WorkspaceLifecycleBadge isActive={category.isActive} />
        </TableCell>
        {canManage ? (
          <TableCell data-actions className="text-center">
            <MasterDataActionsMenu
              recordName={category.name}
              isActive={category.isActive}
              actionButtonId={`category-actions-${category.id}`}
              disabled={actionDisabled}
              onEdit={onEdit}
              onSetActive={onSetActive}
              onDelete={() => setIsDeleteDialogOpen(true)}
            />
          </TableCell>
        ) : null}
      </TableRow>
      <DeleteCategoryDialog
        key={`${category.id}-${isDeleteDialogOpen ? "open" : "closed"}`}
        category={category}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onDeleted={onDeleted}
      />
    </>
  );
}

export default function CategoryTable({
  categories,
  search,
  onClearFilters,
  canManage,
  onEdit,
  onSetActive,
  onDeleted,
  actionDisabled,
}: {
  categories: CategoryListItem[];
  search: string;
  onClearFilters: () => void;
  canManage: boolean;
  onEdit: (category: CategoryListItem) => void;
  onSetActive: (category: CategoryListItem, isActive: boolean) => void;
  onDeleted: (category: CategoryListItem) => void;
  actionDisabled: boolean;
}) {
  const hasFilters = hasCategoryFilters({ search });

  if (categories.length === 0) {
    return (
      <ListEmptyState
        icon={<Tags aria-hidden="true" />}
        hasFilters={hasFilters}
        filteredState={{
          title: "No Categories match your search.",
          description: "Clear the search to see the complete Category catalog.",
          action: {
            label: "Clear search",
            variant: "outline",
            onClick: onClearFilters,
          },
        }}
        emptyState={{
          title: "No Categories yet.",
          description:
            "An administrator can add the first Category to begin the catalog.",
        }}
      />
    );
  }

  return (
    <WorkspaceTableFrame caption="Categories" responsive>
      <TableHeader className="bg-muted/60">
        <TableRow>
          <TableHead scope="col" className="text-left">
            Name
          </TableHead>
          <TableHead scope="col" className="text-left">
            Description
          </TableHead>
          <TableHead scope="col" className="w-24 text-center">
            Status
          </TableHead>
          {canManage ? (
            <TableHead scope="col" className="w-20 text-center">
              Actions
            </TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {categories.map((category) => (
          <CategoryRow
            key={category.id}
            category={category}
            onEdit={() => onEdit(category)}
            onSetActive={(isActive) => onSetActive(category, isActive)}
            onDeleted={() => onDeleted(category)}
            actionDisabled={actionDisabled}
            canManage={canManage}
          />
        ))}
      </TableBody>
    </WorkspaceTableFrame>
  );
}
