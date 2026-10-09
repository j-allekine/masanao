"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  usePathname,
  useRouter,
} from "next/navigation";

import type {
  ActivityDesignListItem,
  ActivityListItem,
  ActivityWorkspaceListItem,
} from "../types";
import ActivitiesTable from "./activities-table";
import ActivitiesToolbar from "./activities-toolbar";
import CatalogPagination from "@/components/workspace/catalog-pagination";
import { WorkspacePrimaryAction } from "@/components/workspace/catalog-controls";
import ActivityCreateDialog from "./activity-create-dialog";
import {
  filterActivities,
  type ActivityFilters,
} from "./activity-filters";
import { toast } from "sonner";
import {
  getPlanningListState,
  getPlanningListQuery,
  getPlanningListUrl,
} from "./planning-list-state";

const PAGE_SIZE = 10;

export default function ActivitiesWorkspace({
  activities,
  activityDesigns,
  initialQuery = "",
}: {
  activities: ActivityWorkspaceListItem[];
  activityDesigns: ActivityDesignListItem[];
  initialQuery?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [listState, setListState] = useState(() =>
    getPlanningListState(new URLSearchParams(initialQuery), "activities"),
  );
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
  const currentQuery = getPlanningListQuery(initialQuery, "activities", {
    search,
    page: currentPage,
  });

  function updateSearch(nextSearch: string) {
    setListState({ search: nextSearch, page: 1 });
    router.replace(
      getPlanningListUrl(
        pathname,
        currentQuery,
        "activities",
        { search: nextSearch, page: 1 },
      ),
      { scroll: false },
    );
  }

  function changePage(nextPage: number) {
    const page = Math.min(Math.max(nextPage, 1), pageCount);
    setListState({ search, page });
    router.replace(
      getPlanningListUrl(
        pathname,
        currentQuery,
        "activities",
        { page },
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

  function closeEditDialog(focusActivityId?: string | null) {
    const closedActivity = activityForEdit;
    setActivityForEdit(null);

    window.setTimeout(() => {
      const targetActivityId =
        focusActivityId === undefined ? closedActivity?.id : focusActivityId;
      const target = targetActivityId
        ? document.getElementById(`activity-actions-${targetActivityId}`)
        : null;
      (target ?? document.getElementById("activity-search"))?.focus();
    }, 0);
  }

  function handleCreateSuccess(activity: {
    activityDesignId: string;
  }) {
    closeCreateDialog();
    setListState({ search: "", page: 1 });
    router.replace(
      getPlanningListUrl(
        pathname,
        currentQuery,
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

  function handleEditSuccess(activity: ActivityListItem) {
    const previousActivity = activityForEdit;
    const editedActivity = previousActivity
      ? { ...previousActivity, ...activity }
      : null;
    const staysInResults = Boolean(
      editedActivity &&
        filterActivities([editedActivity], { search }).length > 0,
    );
    const nextTotal = staysInResults
      ? filteredActivities.length
      : Math.max(0, filteredActivities.length - 1);
    const nextPageCount = Math.max(1, Math.ceil(nextTotal / PAGE_SIZE));
    const nextPage = Math.min(currentPage, nextPageCount);

    closeEditDialog(staysInResults ? activity.id : null);
    if (nextPage !== currentPage) {
      setListState({ search, page: nextPage });
      router.replace(
        getPlanningListUrl(
          pathname,
          currentQuery,
          "activities",
          { page: nextPage },
        ),
        { scroll: false },
      );
    }
    router.refresh();
    toast.success("Activity updated");
  }

  function handleActivityDeleted(activityId: string) {
    const deletedIndex = paginatedActivities.findIndex(
      (activity) => activity.id === activityId,
    );
    const nextFocusTarget =
      deletedIndex < 0
        ? null
        : paginatedActivities[deletedIndex + 1] ??
          paginatedActivities[deletedIndex - 1];
    const nextTotal = Math.max(0, filteredActivities.length - 1);
    const nextPageCount = Math.max(1, Math.ceil(nextTotal / PAGE_SIZE));
    const nextPage = Math.min(currentPage, nextPageCount);

    if (nextPage !== currentPage) {
      setListState({ search, page: nextPage });
      router.replace(
        getPlanningListUrl(
          pathname,
          currentQuery,
          "activities",
          { page: nextPage },
        ),
        { scroll: false },
      );
    }
    router.refresh();

    window.setTimeout(() => {
      const target = nextFocusTarget
        ? document.getElementById(`activity-actions-${nextFocusTarget.id}`)
        : null;
      (target ?? document.getElementById("activity-search"))?.focus();
    }, 0);
  }

  return (
    <main
      className="flex min-w-0 flex-col gap-6"
      data-client-ready={isHydrated ? "true" : undefined}
    >
      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-heading-1 font-semibold">Activities</h1>
          <p className="text-body text-muted-foreground">
            Browse municipal kitchen activities across planning contexts.
          </p>
        </div>
        <WorkspacePrimaryAction
          id="new-activity"
          className="sm:min-w-[12rem]"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          Create Activity
        </WorkspacePrimaryAction>
      </div>
      <ActivitiesToolbar
        search={search}
        onSearchChange={updateSearch}
      />
      <ActivitiesTable
        activities={paginatedActivities}
        filters={filters}
        onClearSearch={() => updateSearch("")}
        onEdit={setActivityForEdit}
        onDeleted={handleActivityDeleted}
      />
      <CatalogPagination
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
    </main>
  );
}
