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
    officeName: "CSWD",
    aipReferenceCode: null,
    activityCount: 2,
  },
  {
    id: "two",
    activityDesignNo: "ad-2025-001",
    fiscalYear: 2025,
    title: "Barangay Feeding",
    officeName: "GAD",
    aipReferenceCode: null,
    activityCount: 1,
  },
  {
    id: "three",
    activityDesignNo: "ad-2026-001",
    fiscalYear: 2026,
    title: "Community Feeding",
    officeName: "CSWD",
    aipReferenceCode: null,
    activityCount: 0,
  },
];

describe("Activity Designs workspace filters", () => {
  it("derives deduplicated sorted Fiscal Year and Office choices from the complete result", () => {
    expect(getActivityDesignFilterOptions(activityDesigns)).toEqual({
      fiscalYears: [2025, 2026],
      offices: ["CSWD", "GAD"],
    });
  });

  it("trims case-insensitive search and combines it with Fiscal Year and Office using AND logic", () => {
    expect(
      filterActivityDesigns(activityDesigns, {
        search: "  COMMUNITY  ",
        fiscalYear: "2026",
        office: "CSWD",
      }),
    ).toEqual([activityDesigns[2]]);

    expect(
      filterActivityDesigns(activityDesigns, {
        search: "AD-2026",
        fiscalYear: "2025",
        office: "CSWD",
      }),
    ).toEqual([]);
  });
});
