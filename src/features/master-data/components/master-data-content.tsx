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

      <div className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col px-4 py-6 sm:px-6">
        <h1 className="mb-6 break-words text-heading-1 font-semibold">Master Data</h1>
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
      </div>
    </div>
  );
}
