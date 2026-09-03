"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  usePathname,
  useRouter,
} from "next/navigation";
import { toast } from "sonner";

import type { ActivityDesignListItem } from "../types";
import ActivityCreateDialog from "./activity-create-dialog";
import ActivityDesignDialog, {
  type ActivityDesignDialogState,
} from "./activity-design-dialog";
import ActivityDesignPagination from "./activity-design-pagination";
import {
  filterActivityDesigns,
  type ActivityDesignFilters,
} from "./activity-design-filters";
import ActivityDesignTable from "./activity-design-table";
import ActivityDesignToolbar from "./activity-design-toolbar";
import PlanningSectionMenu from "./planning-section-menu";
import {
  getPlanningListState,
  getPlanningListQuery,
  getPlanningListUrl,
} from "./planning-list-state";

const PAGE_SIZE = 10;

export default function ActivityDesignsWorkspace({
  activityDesigns,
  initialQuery = "",
}: {
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
    getPlanningListState(new URLSearchParams(initialQuery), "activity-designs"),
  );
  const search = listState.search;
  const [dialogState, setDialogState] = useState<ActivityDesignDialogState | null>(
    null,
  );
  const [activityDesignForCreate, setActivityDesignForCreate] =
    useState<ActivityDesignListItem | null>(null);

  const filters: ActivityDesignFilters = { search };
  const filteredActivityDesigns = useMemo(
    () => filterActivityDesigns(activityDesigns, { search }),
    [activityDesigns, search],
  );
  const pageCount = Math.max(
    1,
    Math.ceil(filteredActivityDesigns.length / PAGE_SIZE),
  );
  const currentPage = Math.min(listState.page, pageCount);
  const firstItemIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedActivityDesigns = useMemo(
    () =>
      filteredActivityDesigns.slice(firstItemIndex, firstItemIndex + PAGE_SIZE),
    [filteredActivityDesigns, firstItemIndex],
  );
  const resultStart =
    paginatedActivityDesigns.length === 0 ? 0 : firstItemIndex + 1;
  const resultEnd = firstItemIndex + paginatedActivityDesigns.length;
  const currentQuery = getPlanningListQuery(
    initialQuery,
    "activity-designs",
    { search, page: currentPage },
  );

  function updateSearch(nextSearch: string) {
    setListState({ search: nextSearch, page: 1 });
    router.replace(
      getPlanningListUrl(
        pathname,
        currentQuery,
        "activity-designs",
        { search: nextSearch, page: 1 },
      ),
      { scroll: false },
    );
  }

  function clearFilters() {
    updateSearch("");
  }

  function changePage(nextPage: number) {
    const page = Math.min(Math.max(nextPage, 1), pageCount);
    setListState({ search, page });
    router.replace(
      getPlanningListUrl(
        pathname,
        currentQuery,
        "activity-designs",
        { page },
      ),
      { scroll: false },
    );
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
    <div
      className="flex flex-col gap-0"
      data-client-ready={isHydrated ? "true" : undefined}
    >
      <ActivityDesignToolbar
        search={filters.search}
        onSearchChange={updateSearch}
        onCreate={openCreateDialog}
      />
      <div className="mt-6">
        <PlanningSectionMenu
          activeSection="activity-designs"
          query={currentQuery}
        />
      </div>
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
        start={resultStart}
        end={resultEnd}
        total={filteredActivityDesigns.length}
        onPageChange={changePage}
      />
      <ActivityDesignDialog
        dialogState={dialogState}
        onClose={closeDialog}
        onSuccess={() => router.refresh()}
      />
      <ActivityCreateDialog
        activityDesign={activityDesignForCreate}
        activityDesigns={activityDesigns}
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
