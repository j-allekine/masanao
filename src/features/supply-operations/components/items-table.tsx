import { useState } from "react";
import { PackageOpen } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ListEmptyState from "@/components/workspace/list-empty-state";
import WorkspaceTableFrame from "@/components/workspace/table-frame";

import type { ItemListItem } from "../types";
import ItemActionsMenu from "./item-actions-menu";
import DeleteItemDialog from "./delete-item-dialog";

function ItemStatus({ isActive }: { isActive: boolean }) {
  return <Badge variant={isActive ? "default" : "outline"}>{isActive ? "Active" : "Inactive"}</Badge>;
}

function ItemMobileCard({
  item,
  canManage,
  onEdit,
  onSetActive,
  onDeleted,
  onUnits,
  actionDisabled,
}: {
  item: ItemListItem;
  canManage: boolean;
  onEdit: () => void;
  onSetActive: (isActive: boolean) => void;
  onDeleted: () => void;
  onUnits: () => void;
  actionDisabled: boolean;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <>
      <Card size="sm" data-item-id={item.id}>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <CardTitle className="break-words">{item.name}</CardTitle>
          <ItemActionsMenu
              itemId={item.id}
              itemName={item.name}
              isActive={item.isActive}
              actionButtonId={`item-actions-mobile-${item.id}`}
              onEdit={onEdit}
              onSetActive={onSetActive}
              onDelete={() => setIsDeleteDialogOpen(true)}
              onUnits={onUnits}
              canManage={canManage}
              disabled={actionDisabled}
            />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <span className="text-label font-semibold text-muted-foreground">
              Category
            </span>
            <span className="min-w-0 break-words text-right">{item.category.name}</span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="text-label font-semibold text-muted-foreground">
              Base Unit
            </span>
            <span className="min-w-0 break-words text-right">{item.baseUnit.name}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-label font-semibold text-muted-foreground">
              Status
            </span>
            <ItemStatus isActive={item.isActive} />
          </div>
        </CardContent>
      </Card>
      {canManage ? <DeleteItemDialog
        key={`${item.id}-${isDeleteDialogOpen ? "open" : "closed"}`}
        item={item}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onDeleted={onDeleted}
      /> : null}
    </>
  );
}

function ItemRow({
  item,
  canManage,
  onEdit,
  onSetActive,
  onDeleted,
  onUnits,
  actionDisabled,
}: {
  item: ItemListItem;
  canManage: boolean;
  onEdit: () => void;
  onSetActive: (isActive: boolean) => void;
  onDeleted: () => void;
  onUnits: () => void;
  actionDisabled: boolean;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <>
      <TableRow className="hover:bg-muted/35" data-item-id={item.id}>
        <TableCell className="max-w-[22rem] whitespace-normal align-top">
          <span className="block break-words">{item.name}</span>
        </TableCell>
        <TableCell className="max-w-[18rem] whitespace-normal align-top">
          <span className="block break-words">{item.category.name}</span>
        </TableCell>
        <TableCell className="max-w-[18rem] whitespace-normal align-top">
          <span className="block break-words">{item.baseUnit.name}</span>
        </TableCell>
        <TableCell className="text-center">
          <ItemStatus isActive={item.isActive} />
        </TableCell>
        <TableCell className="w-24 text-right">
          <div className="flex justify-end">
            <ItemActionsMenu
              itemId={item.id}
              itemName={item.name}
              isActive={item.isActive}
              actionButtonId={`item-actions-desktop-${item.id}`}
              onEdit={onEdit}
              onSetActive={onSetActive}
              onDelete={() => setIsDeleteDialogOpen(true)}
              onUnits={onUnits}
              canManage={canManage}
              disabled={actionDisabled}
            />
          </div>
        </TableCell>
      </TableRow>
      {canManage ? <DeleteItemDialog
        key={`${item.id}-${isDeleteDialogOpen ? "open" : "closed"}`}
        item={item}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onDeleted={onDeleted}
      /> : null}
    </>
  );
}

export default function ItemsTable({
  items,
  hasFilters,
  onClearFilters,
  onCreate,
  canManage,
  onEdit,
  onSetActive,
  onDeleted,
  onUnits,
  actionDisabled,
}: {
  items: ItemListItem[];
  hasFilters: boolean;
  onClearFilters: () => void;
  onCreate: () => void;
  canManage: boolean;
  onEdit: (item: ItemListItem) => void;
  onSetActive: (item: ItemListItem, isActive: boolean) => void;
  onDeleted: (item: ItemListItem) => void;
  onUnits: (item: ItemListItem) => void;
  actionDisabled: boolean;
}) {
  if (items.length === 0) {
    return (
      <ListEmptyState
        icon={<PackageOpen aria-hidden="true" />}
        hasFilters={hasFilters}
        filteredState={{
          title: "No Items match your current filters.",
          description: "Clear filters to see the complete Items list.",
          action: {
            label: "Clear filters",
            variant: "outline",
            onClick: onClearFilters,
          },
        }}
        emptyState={{
          title: "No Items yet.",
          description:
            "Items will appear here once the supply catalog is configured.",
          action: canManage
            ? { label: "Add Item", onClick: onCreate }
            : undefined,
        }}
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:hidden" data-items-mobile>
        {items.map((item) => (
          <ItemMobileCard
            key={item.id}
            item={item}
            canManage={canManage}
            onEdit={() => onEdit(item)}
            onSetActive={(isActive) => onSetActive(item, isActive)}
            onDeleted={() => onDeleted(item)}
            onUnits={() => onUnits(item)}
            actionDisabled={actionDisabled}
          />
        ))}
      </div>
      <div className="hidden sm:block" data-items-table-desktop>
        <WorkspaceTableFrame caption="Items" className="min-w-[40rem]">
          <TableHeader className="bg-muted/60">
            <TableRow>
              <TableHead scope="col" className="text-left">
                Name
              </TableHead>
              <TableHead scope="col" className="text-left">
                Category
              </TableHead>
              <TableHead scope="col" className="text-left">
                Base Unit
              </TableHead>
              <TableHead scope="col" className="text-center">
                Status
              </TableHead>
              <TableHead scope="col" className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                canManage={canManage}
                onEdit={() => onEdit(item)}
                onSetActive={(isActive) => onSetActive(item, isActive)}
                onDeleted={() => onDeleted(item)}
                onUnits={() => onUnits(item)}
                actionDisabled={actionDisabled}
              />
            ))}
          </TableBody>
        </WorkspaceTableFrame>
      </div>
    </>
  );
}
