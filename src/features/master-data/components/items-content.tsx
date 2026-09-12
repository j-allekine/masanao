import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

import type {
  CategoryListItem,
  ItemListItem,
  UnitListItem,
} from "../types";
import ItemsWorkspace from "./items-workspace";

export default function ItemsContent({
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
  return (
    <div className="flex min-h-svh flex-col bg-card">
      <header className="flex min-h-16 items-center justify-between gap-3 border-b px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-8" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-heading-3 font-semibold">Supply Operations</p>
            <p className="truncate text-body-sm text-muted-foreground">
              Browse the municipal kitchen supply catalog.
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col px-4 py-6 sm:px-6">
        <ItemsWorkspace
          items={items}
          categories={categories}
          units={units}
          canManageItems={canManageItems}
        />
      </div>
    </div>
  );
}
