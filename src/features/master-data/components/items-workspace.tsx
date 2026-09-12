"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import type {
  CategoryListItem,
  ItemListItem,
  UnitListItem,
} from "../types";
import ItemCreateDialog from "./item-create-dialog";
import ItemsTable from "./items-table";

export default function ItemsWorkspace({
  items,
  categories,
  units,
  canManageItems,
}: {
  items: ItemListItem[];
  categories: CategoryListItem[];
  units: UnitListItem[];
  canManageItems: boolean;
}) {
  const router = useRouter();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  function closeCreateDialog() {
    setIsCreateDialogOpen(false);
    window.setTimeout(() => {
      document.getElementById("new-item")?.focus();
    }, 0);
  }

  return (
    <main
      className="flex min-w-0 flex-col gap-6"
      data-can-manage-items={canManageItems ? "true" : "false"}
    >
      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-heading-1 font-semibold">Items</h1>
          <p className="text-body text-muted-foreground">
            View the ingredients and supplies available to municipal kitchen operations.
          </p>
        </div>
        {canManageItems ? (
          <Button
            id="new-item"
            type="button"
            size="sm"
            className="h-9 w-full sm:w-auto sm:min-w-[8rem]"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            Add Item
          </Button>
        ) : null}
      </div>
      <ItemsTable items={items} />
      {canManageItems ? (
        <ItemCreateDialog
          open={isCreateDialogOpen}
          categories={categories}
          units={units}
          onClose={closeCreateDialog}
          onSuccess={(item) => {
            closeCreateDialog();
            router.refresh();
            toast.success(`Item “${item.name}” created`);
          }}
        />
      ) : null}
    </main>
  );
}
