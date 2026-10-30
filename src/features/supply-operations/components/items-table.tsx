import { useState } from "react";
import { PackageOpen } from "lucide-react";

import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ListEmptyState from "@/components/workspace/list-empty-state";
import WorkspaceLifecycleBadge from "@/components/workspace/lifecycle-badge";
import WorkspaceTableFrame from "@/components/workspace/table-frame";

import type { ItemListItem } from "../types";
import ItemActionsMenu from "./item-actions-menu";
import DeleteItemDialog from "./delete-item-dialog";

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
        <TableCell data-primary data-label="Name" className="w-[25%]">
          <span className="block break-words">{item.name}</span>
        </TableCell>
        <TableCell data-label="Category" className="w-[17%]">
          <span className="block break-words">{item.category.name}</span>
        </TableCell>
        <TableCell data-label="Base Unit" className="w-[15%]">
          <span className="block break-words">{item.baseUnit.name}</span>
        </TableCell>
        <TableCell data-label="Reorder level" className="w-[19%] text-right tabular-nums">
          <span className="block break-words">{item.reorderLevel} {item.baseUnit.abbreviation}</span>
        </TableCell>
        <TableCell data-label="Status" className="w-[14%]">
          <WorkspaceLifecycleBadge isActive={item.isActive} />
        </TableCell>
        <TableCell data-actions className="w-[10%] text-right">
          <div className="flex justify-end">
            <ItemActionsMenu
              itemId={item.id}
              itemName={item.name}
              isActive={item.isActive}
              actionButtonId={`item-actions-${item.id}`}
              onEdit={onEdit}
              onSetActive={onSetActive}
              onDelete={() => setIsDeleteDialogOpen(true)}
              onUnits={onUnits}
              canManage={canManage}
              isDeactivationLocked={item.hasPostedDeliveryReceiptLines}
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
          description: canManage
            ? "Use Create Item to begin the supply catalog."
            : "Items added to the supply catalog will appear here.",
        }}
      />
    );
  }

  return (
        <WorkspaceTableFrame caption="Items" responsive>
          <TableHeader className="bg-muted/60">
            <TableRow>
              <TableHead scope="col" className="w-[25%] text-left">
                Name
              </TableHead>
              <TableHead scope="col" className="w-[17%] text-left">
                Category
              </TableHead>
              <TableHead scope="col" className="w-[15%] text-left">
                Base Unit
              </TableHead>
              <TableHead scope="col" className="w-[19%] text-right">Reorder level</TableHead>
              <TableHead scope="col" className="w-[14%]">
                Status
              </TableHead>
              <TableHead scope="col" className="w-[10%] text-right">Actions</TableHead>
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
  );
}
