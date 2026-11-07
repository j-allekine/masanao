import { Suspense } from "react";

import WorkspaceLayout, { WorkspaceTaskHeader } from "@/components/workspace/workspace-layout";
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
    <Suspense
      fallback={
        <WorkspaceLayout
          workspaceTitle="Supply Operations"
          task={<WorkspaceTaskHeader><h1 className="text-heading-3 font-semibold">Items</h1></WorkspaceTaskHeader>}
        >
          <div className="mx-auto w-full max-w-content px-4 py-6 sm:px-6">
            <WorkspaceTableSkeleton columnLabels={["Name", "Category", "Base Unit", "Status"]} />
          </div>
        </WorkspaceLayout>
      }
    >
      <ItemsWorkspace
        items={items}
        categories={categories}
        units={units}
        canManageItems={canManageItems}
      />
    </Suspense>
  );
}
