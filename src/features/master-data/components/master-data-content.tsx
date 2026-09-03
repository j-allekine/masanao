import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

import type { UnitListItem } from "../types";
import UnitsWorkspace from "./units-workspace";

export default function MasterDataContent({
  units,
  initialQuery = "",
  canManage,
}: {
  units: UnitListItem[];
  initialQuery?: string;
  canManage: boolean;
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
        <UnitsWorkspace
          units={units}
          initialQuery={initialQuery}
          canManage={canManage}
        />
      </div>
    </div>
  );
}
