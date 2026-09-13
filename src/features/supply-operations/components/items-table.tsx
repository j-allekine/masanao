import { useState } from "react";
import { PackageOpen } from "lucide-react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
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

import type { ItemListItem } from "../types";
import ItemActionsMenu from "./item-actions-menu";
import DeleteItemDialog from "./delete-item-dialog";
import WorkspaceTableFrame from "@/components/workspace/table-frame";

function ItemStatus({ isActive }: { isActive: boolean }) {
  return <Badge variant={isActive ? "default" : "outline"}>{isActive ? "Active" : "Inactive"}</Badge>;
}

function ItemMobileCard({
  item,
  canManage,
  onEdit,
  onSetActive,
  onDeleted,
  actionDisabled,
}: {
  item: ItemListItem;
  canManage: boolean;
  onEdit: () => void;
  onSetActive: (isActive: boolean) => void;
  onDeleted: () => void;
  actionDisabled: boolean;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <>
      <Card size="sm" data-item-id={item.id}>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <CardTitle className="break-words">{item.name}</CardTitle>
          {canManage ? (
            <ItemActionsMenu
              itemId={item.id}
              itemName={item.name}
              isActive={item.isActive}
              actionButtonId={`item-actions-mobile-${item.id}`}
              onEdit={onEdit}
              onSetActive={onSetActive}
              onDelete={() => setIsDeleteDialogOpen(true)}
              disabled={actionDisabled}
            />
          ) : null}
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
      <DeleteItemDialog
        key={`${item.id}-${isDeleteDialogOpen ? "open" : "closed"}`}
        item={item}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onDeleted={onDeleted}
      />
    </>
  );
}

function ItemRow({
  item,
  canManage,
  onEdit,
  onSetActive,
  onDeleted,
  actionDisabled,
}: {
  item: ItemListItem;
  canManage: boolean;
  onEdit: () => void;
  onSetActive: (isActive: boolean) => void;
  onDeleted: () => void;
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
        {canManage ? (
          <TableCell className="text-center">
            <ItemActionsMenu
              itemId={item.id}
              itemName={item.name}
              isActive={item.isActive}
              actionButtonId={`item-actions-desktop-${item.id}`}
              onEdit={onEdit}
              onSetActive={onSetActive}
              onDelete={() => setIsDeleteDialogOpen(true)}
              disabled={actionDisabled}
            />
          </TableCell>
        ) : null}
      </TableRow>
      <DeleteItemDialog
        key={`${item.id}-${isDeleteDialogOpen ? "open" : "closed"}`}
        item={item}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onDeleted={onDeleted}
      />
    </>
  );
}

export default function ItemsTable({
  items,
  hasFilters,
  onClearFilters,
  canManage,
  onEdit,
  onSetActive,
  onDeleted,
  actionDisabled,
}: {
  items: ItemListItem[];
  hasFilters: boolean;
  onClearFilters: () => void;
  canManage: boolean;
  onEdit: (item: ItemListItem) => void;
  onSetActive: (item: ItemListItem, isActive: boolean) => void;
  onDeleted: (item: ItemListItem) => void;
  actionDisabled: boolean;
}) {
  if (items.length === 0) {
    return (
      <Empty className="min-h-60 rounded-lg border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PackageOpen aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>
            {hasFilters ? "No Items match your current filters." : "No Items yet."}
          </EmptyTitle>
          <EmptyDescription>
            {hasFilters
              ? "Clear filters to see the complete Items list."
              : "Items will appear here once the supply catalog is configured."}
          </EmptyDescription>
        </EmptyHeader>
        {hasFilters ? (
          <EmptyContent>
            <Button type="button" variant="outline" onClick={onClearFilters}>
              Clear filters
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
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
              {canManage ? (
                <TableHead scope="col" className="text-center">
                  Actions
                </TableHead>
              ) : null}
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
                actionDisabled={actionDisabled}
              />
            ))}
          </TableBody>
        </WorkspaceTableFrame>
      </div>
    </>
  );
}
