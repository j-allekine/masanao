import { Suspense } from "react";

import WorkspaceHeader from "@/components/workspace/workspace-header";
import { WorkspaceContent } from "@/components/workspace/workspace-content";
import WorkspaceTableSkeleton from "@/components/workspace/workspace-table-skeleton";

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
      <WorkspaceHeader title="Supply Operations" />

      <WorkspaceContent>
        <Suspense
          fallback={
            <WorkspaceTableSkeleton
              columnLabels={["Name", "Category", "Base Unit", "Status"]}
            />
          }
        >
          <ItemsWorkspace
            items={items}
            categories={categories}
            units={units}
            canManageItems={canManageItems}
          />
        </Suspense>
      </WorkspaceContent>
    </div>
  );
}
