"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import type {
  ActivityDesignListItem,
  ActivityWorkspaceListItem,
} from "../types";
import ActivitiesTable from "./activities-table";
import ActivitiesToolbar from "./activities-toolbar";
import ActivityPagination from "./activity-pagination";
import ActivityCreateDialog from "./activity-create-dialog";
import {
  filterActivities,
  type ActivityFilters,
} from "./activity-filters";
import PlanningSectionMenu from "./planning-section-menu";
import { toast } from "sonner";
import {
  getPlanningListState,
  getPlanningListUrl,
} from "./planning-list-state";

const PAGE_SIZE = 10;

export default function ActivitiesWorkspace({
  activities,
  activityDesigns,
}: {
  activities: ActivityWorkspaceListItem[];
  activityDesigns: ActivityDesignListItem[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const listState = getPlanningListState(searchParams, "activities");
  const search = listState.search;
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activityForEdit, setActivityForEdit] =
    useState<ActivityWorkspaceListItem | null>(null);

  const filters: ActivityFilters = { search };
  const filteredActivities = useMemo(
    () => filterActivities(activities, { search }),
    [activities, search],
  );
  const pageCount = Math.max(
    1,
    Math.ceil(filteredActivities.length / PAGE_SIZE),
  );
  const currentPage = Math.min(listState.page, pageCount);
  const firstItemIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedActivities = useMemo(
    () => filteredActivities.slice(firstItemIndex, firstItemIndex + PAGE_SIZE),
    [filteredActivities, firstItemIndex],
  );
  const resultStart =
    paginatedActivities.length === 0 ? 0 : firstItemIndex + 1;
  const resultEnd = firstItemIndex + paginatedActivities.length;

  function updateSearch(nextSearch: string) {
    router.replace(
      getPlanningListUrl(
        pathname,
        searchParams.toString(),
        "activities",
        { search: nextSearch, page: 1 },
      ),
      { scroll: false },
    );
  }

  function changePage(nextPage: number) {
    router.replace(
      getPlanningListUrl(
        pathname,
        searchParams.toString(),
        "activities",
        { page: Math.min(Math.max(nextPage, 1), pageCount) },
      ),
      { scroll: false },
    );
  }

  function closeCreateDialog() {
    setIsCreateDialogOpen(false);

    window.setTimeout(() => {
      document.getElementById("new-activity")?.focus();
    }, 0);
  }

  function closeEditDialog() {
    const closedActivity = activityForEdit;
    setActivityForEdit(null);

    window.setTimeout(() => {
      if (closedActivity) {
        document
          .getElementById(`activity-actions-${closedActivity.id}`)
          ?.focus();
      }
    }, 0);
  }

  function handleCreateSuccess(activity: {
    activityDesignId: string;
  }) {
    closeCreateDialog();
    router.replace(
      getPlanningListUrl(
        pathname,
        searchParams.toString(),
        "activities",
        { search: "", page: 1 },
      ),
      { scroll: false },
    );
    router.refresh();
    const activityDesign = activityDesigns.find(
      (design) => design.id === activity.activityDesignId,
    );
    toast.success(
      activityDesign
        ? `Activity added to “${activityDesign.title}”`
        : "Activity created",
    );
  }

  function handleEditSuccess() {
    closeEditDialog();
    router.refresh();
    toast.success("Activity updated");
  }

  function handleActivityDeleted(activityId: string) {
    const deletedIndex = filteredActivities.findIndex(
      (activity) => activity.id === activityId,
    );
    const nextFocusTarget =
      filteredActivities[deletedIndex + 1] ??
      filteredActivities[deletedIndex - 1];

    router.refresh();

    window.setTimeout(() => {
      const targetId = nextFocusTarget
        ? `activity-actions-${nextFocusTarget.id}`
        : "new-activity";
      document.getElementById(targetId)?.focus();
    }, 0);
  }

  return (
    <div
      className="flex flex-col gap-0"
      data-client-ready={isHydrated ? "true" : undefined}
    >
      <ActivitiesToolbar
        search={search}
        onSearchChange={updateSearch}
        onCreate={() => setIsCreateDialogOpen(true)}
      />
      <div className="mt-6">
        <PlanningSectionMenu activeSection="activities" />
      </div>
      <ActivitiesTable
        activities={paginatedActivities}
        filters={filters}
        onClearSearch={() => updateSearch("")}
        onEdit={setActivityForEdit}
        onDeleted={handleActivityDeleted}
      />
      <ActivityPagination
        page={currentPage}
        pageCount={pageCount}
        start={resultStart}
        end={resultEnd}
        total={filteredActivities.length}
        onPageChange={changePage}
      />
      <ActivityCreateDialog
        activityDesign={null}
        activityDesigns={activityDesigns}
        open={isCreateDialogOpen}
        onClose={closeCreateDialog}
        onSuccess={handleCreateSuccess}
      />
      <ActivityCreateDialog
        activityDesign={
          activityForEdit
            ? activityDesigns.find(
                (design) => design.id === activityForEdit.activityDesignId,
              ) ?? null
            : null
        }
        activity={activityForEdit ?? undefined}
        mode="edit"
        open={activityForEdit !== null}
        onClose={closeEditDialog}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
