import { describe, expect, it } from "vitest";

import {
  filterActivityDesigns,
  getActivityDesignFilterOptions,
} from "@/features/activity-planning/components/activity-design-filters";
import type { ActivityDesignListItem } from "@/features/activity-planning/types";

const activityDesigns: ActivityDesignListItem[] = [
  {
    id: "one",
    activityDesignNo: "ad-2026-002",
    fiscalYear: 2026,
    title: "Senior Nutrition Outreach",
    aipReferenceCode: "AIP-2026-002",
    activityCount: 2,
  },
  {
    id: "two",
    activityDesignNo: "ad-2025-001",
    fiscalYear: 2025,
    title: "Barangay Feeding",
    aipReferenceCode: null,
    activityCount: 1,
  },
  {
    id: "three",
    activityDesignNo: "ad-2026-001",
    fiscalYear: 2026,
    title: "Community Feeding",
    aipReferenceCode: null,
    activityCount: 0,
  },
];

describe("Activity Designs workspace filters", () => {
  it("derives deduplicated sorted Fiscal Year choices from the complete result", () => {
    expect(getActivityDesignFilterOptions(activityDesigns)).toEqual({
      fiscalYears: [2025, 2026],
    });
  });

  it("trims case-insensitive search and combines it with Fiscal Year using AND logic", () => {
    expect(
      filterActivityDesigns(activityDesigns, {
        search: "  COMMUNITY  ",
        fiscalYear: "2026",
      }),
    ).toEqual([activityDesigns[2]]);

    expect(
      filterActivityDesigns(activityDesigns, {
        search: "AD-2026",
        fiscalYear: "2025",
      }),
    ).toEqual([]);
  });

  it("searches the supported AIP Reference Code field", () => {
    expect(
      filterActivityDesigns(activityDesigns, {
        search: "aip-2026-002",
        fiscalYear: "",
      }),
    ).toEqual([activityDesigns[0]]);
  });
});
