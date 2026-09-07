"use client";

import { useState } from "react";
import { Tags } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { CategoryListItem } from "../types";
import CategoryActionsMenu from "./category-actions-menu";
import DeleteCategoryDialog from "./delete-category-dialog";
import MasterDataTableFrame from "./master-data-table-frame";

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
        <TableCell className="max-w-[24rem]">
          <span className="block truncate">{category.name}</span>
        </TableCell>
        <TableCell className="max-w-[36rem]">
          <span className="block truncate text-muted-foreground">
            {category.description ?? "—"}
          </span>
        </TableCell>
        <TableCell className="text-center">
          <Badge variant={category.isActive ? "default" : "outline"}>
            {category.isActive ? "Active" : "Inactive"}
          </Badge>
        </TableCell>
        {canManage ? (
          <TableCell className="text-center">
            <CategoryActionsMenu
              categoryName={category.name}
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
  canManage,
  onNew,
  onEdit,
  onSetActive,
  onDeleted,
  actionDisabled,
}: {
  categories: CategoryListItem[];
  canManage: boolean;
  onNew: () => void;
  onEdit: (category: CategoryListItem) => void;
  onSetActive: (category: CategoryListItem, isActive: boolean) => void;
  onDeleted: (category: CategoryListItem) => void;
  actionDisabled: boolean;
}) {
  if (categories.length === 0) {
    return (
      <Empty className="min-h-60 rounded-lg border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Tags aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No Categories yet.</EmptyTitle>
          <EmptyDescription>
            {canManage
              ? "Add the first Category to begin organizing future Item records."
              : "An administrator can add the first Category to begin the catalog."}
          </EmptyDescription>
        </EmptyHeader>
        {canManage ? (
          <EmptyContent>
            <Button type="button" onClick={onNew}>
              Add Category
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    );
  }

  return (
    <MasterDataTableFrame caption="Categories" className="min-w-[38rem]">
      <TableHeader className="bg-muted/60">
        <TableRow>
          <TableHead scope="col" className="text-left">
            Name
          </TableHead>
          <TableHead scope="col" className="text-left">
            Description
          </TableHead>
          <TableHead scope="col" className="text-center">
            Status
          </TableHead>
          {canManage ? (
            <TableHead scope="col" className="text-center">
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
    </MasterDataTableFrame>
  );
}
