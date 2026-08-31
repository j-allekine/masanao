"use client";

import { useMemo, useState } from "react";

import type { ActivityDesignListItem } from "../types";
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
  office: "",
};

export default function ActivityDesignsWorkspace({
  activityDesigns,
}: {
  activityDesigns: ActivityDesignListItem[];
}) {
  const [filters, setFilters] = useState(initialFilters);
  const filterOptions = useMemo(
    () => getActivityDesignFilterOptions(activityDesigns),
    [activityDesigns],
  );
  const filteredActivityDesigns = useMemo(
    () => filterActivityDesigns(activityDesigns, filters),
    [activityDesigns, filters],
  );

  return (
    <div className="flex flex-col gap-4">
      <ActivityDesignToolbar
        filters={filters}
        options={filterOptions}
        onFiltersChange={setFilters}
        onClear={() => setFilters(initialFilters)}
        showClear={hasActivityDesignFilters(filters)}
      />
      <ActivityDesignTable
        activityDesigns={filteredActivityDesigns}
        filters={filters}
        onClearFilters={() => setFilters(initialFilters)}
      />
    </div>
  );
}
