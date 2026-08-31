"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { ActivityDesignListItem } from "../types";
import ActivityDesignDialog, {
  type ActivityDesignDialogState,
} from "./activity-design-dialog";
import ActivityDesignPagination from "./activity-design-pagination";
import {
  filterActivityDesigns,
  getActivityDesignFilterOptions,
  hasActivityDesignFilters,
  type ActivityDesignFilters,
} from "./activity-design-filters";
import ActivityDesignTable from "./activity-design-table";
import ActivityDesignToolbar from "./activity-design-toolbar";

const initialFilters: ActivityDesignFilters = {
  search: "",
  fiscalYear: "",
};

const PAGE_SIZE = 10;

export default function ActivityDesignsWorkspace({
  activityDesigns,
}: {
  activityDesigns: ActivityDesignListItem[];
}) {
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [dialogState, setDialogState] =
    useState<ActivityDesignDialogState | null>(null);
  const filterOptions = useMemo(
    () => getActivityDesignFilterOptions(activityDesigns),
    [activityDesigns],
  );
  const filteredActivityDesigns = useMemo(
    () => filterActivityDesigns(activityDesigns, filters),
    [activityDesigns, filters],
  );
  const pageCount = Math.max(
    1,
    Math.ceil(filteredActivityDesigns.length / PAGE_SIZE),
  );
  const currentPage = Math.min(page, pageCount);
  const firstItemIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedActivityDesigns = filteredActivityDesigns.slice(
    firstItemIndex,
    firstItemIndex + PAGE_SIZE,
  );

  function updateFilters(nextFilters: ActivityDesignFilters) {
    setFilters(nextFilters);
    setPage(1);
  }

  function clearFilters() {
    setFilters(initialFilters);
    setPage(1);
  }

  function openCreateDialog() {
    setDialogState({ mode: "create" });
  }

  function closeDialog() {
    const closedDialog = dialogState;
    setDialogState(null);

    window.setTimeout(() => {
      const targetId =
        closedDialog?.mode === "edit"
          ? `activity-design-actions-${closedDialog.activityDesign.id}`
          : "new-activity-design";
      document.getElementById(targetId)?.focus();
    }, 0);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3
            id="activity-designs-table-title"
            className="font-heading text-base font-semibold"
          >
            Activity Designs
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {activityDesigns.length} loaded {activityDesigns.length === 1 ? "design" : "designs"}.
          </p>
        </div>
        <Button
          id="new-activity-design"
          type="button"
          onClick={openCreateDialog}
        >
          <Plus data-icon="inline-start" />
          New Activity Design
        </Button>
      </div>
      <ActivityDesignToolbar
        filters={filters}
        options={filterOptions}
        onFiltersChange={updateFilters}
        onClear={clearFilters}
        showClear={hasActivityDesignFilters(filters)}
      />
      <ActivityDesignTable
        activityDesigns={paginatedActivityDesigns}
        filters={filters}
        onClearFilters={clearFilters}
        onNew={openCreateDialog}
        onEdit={(activityDesign) =>
          setDialogState({ mode: "edit", activityDesign })
        }
      />
      <ActivityDesignPagination
        page={currentPage}
        pageCount={pageCount}
        start={firstItemIndex + 1}
        end={Math.min(firstItemIndex + PAGE_SIZE, filteredActivityDesigns.length)}
        total={filteredActivityDesigns.length}
        onPageChange={setPage}
      />
      <ActivityDesignDialog
        dialogState={dialogState}
        onClose={closeDialog}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
