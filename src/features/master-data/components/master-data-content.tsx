import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

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
      <header className="flex min-h-16 items-center justify-between gap-3 border-b px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-8" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-heading-3 font-semibold">Master Data</p>
            <p className="truncate text-body-sm text-muted-foreground">
              Maintain reusable municipal kitchen reference data.
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col px-4 py-6 sm:px-6">
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
