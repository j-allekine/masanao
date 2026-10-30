import { WorkspaceContent, WorkspaceCatalogHeader } from "@/components/workspace/workspace-content";
import WorkspaceHeader from "@/components/workspace/workspace-header";

import type {
  CategoryListItem,
  OfficeListItem,
  UnitListItem,
  VendorListItem,
} from "../types";
import MasterDataWorkspace from "./master-data-workspace";

export default function MasterDataContent({
  units,
  categories,
  offices,
  vendors,
  initialQuery = "",
  canManageUnits,
  canManageOffices,
  canManageCategories,
  canManageVendors,
}: {
  units: UnitListItem[];
  categories: CategoryListItem[];
  offices: OfficeListItem[];
  vendors: VendorListItem[];
  initialQuery?: string;
  canManageUnits: boolean;
  canManageOffices: boolean;
  canManageCategories: boolean;
  canManageVendors: boolean;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-card">
      <WorkspaceHeader title="Master Data" />

      <WorkspaceContent>
        <WorkspaceCatalogHeader title="Master Data" />
        <MasterDataWorkspace
          units={units}
          categories={categories}
          offices={offices}
          vendors={vendors}
          initialQuery={initialQuery}
          canManageUnits={canManageUnits}
          canManageOffices={canManageOffices}
          canManageCategories={canManageCategories}
          canManageVendors={canManageVendors}
        />
      </WorkspaceContent>
    </div>
  );
}
