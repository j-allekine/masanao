"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import type { ActivityWorkspaceListItem } from "../types";
import ActivitiesTable from "./activities-table";
import ActivitiesToolbar from "./activities-toolbar";
import ActivityPagination from "./activity-pagination";
import {
  filterActivities,
  type ActivityFilters,
} from "./activity-filters";
import PlanningSectionMenu from "./planning-section-menu";
import {
  getPlanningListState,
  getPlanningListUrl,
} from "./planning-list-state";

const PAGE_SIZE = 10;

export default function ActivitiesWorkspace({
  activities,
}: {
  activities: ActivityWorkspaceListItem[];
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

  return (
    <div
      className="flex flex-col gap-0"
      data-client-ready={isHydrated ? "true" : undefined}
    >
      <ActivitiesToolbar search={search} onSearchChange={updateSearch} />
      <div className="mt-6">
        <PlanningSectionMenu activeSection="activities" />
      </div>
      <ActivitiesTable
        activities={paginatedActivities}
        filters={filters}
        onClearSearch={() => updateSearch("")}
      />
      <ActivityPagination
        page={currentPage}
        pageCount={pageCount}
        start={resultStart}
        end={resultEnd}
        total={filteredActivities.length}
        onPageChange={changePage}
      />
    </div>
  );
}
