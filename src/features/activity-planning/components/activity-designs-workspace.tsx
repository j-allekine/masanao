"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import type { ActivityDesignListItem } from "../types";
import ActivityCreateSheet from "./activity-create-sheet";
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
  const [activityDesignForCreate, setActivityDesignForCreate] =
    useState<ActivityDesignListItem | null>(null);
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

  function closeActivityCreateDialog() {
    const closedActivityDesign = activityDesignForCreate;
    setActivityDesignForCreate(null);

    window.setTimeout(() => {
      if (closedActivityDesign) {
        document
          .getElementById(`activity-design-actions-${closedActivityDesign.id}`)
          ?.focus();
      }
    }, 0);
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="activity-designs-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2
              id="activity-designs-title"
              className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            >
              Activity Designs
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Find a planning context and review how many Activities belong to it.
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
      </section>
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
        onAddActivity={setActivityDesignForCreate}
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
      <ActivityCreateSheet
        activityDesign={activityDesignForCreate}
        open={activityDesignForCreate !== null}
        onClose={closeActivityCreateDialog}
        onSuccess={(activity) => {
          closeActivityCreateDialog();
          router.refresh();
          const activityDesign = activityDesigns.find(
            (design) => design.id === activity.activityDesignId,
          );
          if (activityDesign) {
            toast.success(`Activity added to “${activityDesign.title}”`);
          }
        }}
      />
    </div>
  );
}
