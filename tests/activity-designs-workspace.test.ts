import { describe, expect, it } from "vitest";

import { filterActivityDesigns } from "@/features/activity-planning/components/activity-design-filters";
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
  it("trims and matches search case-insensitively across supported fields", () => {
    expect(
      filterActivityDesigns(activityDesigns, {
        search: "  COMMUNITY  ",
      }),
    ).toEqual([activityDesigns[2]]);

    expect(
      filterActivityDesigns(activityDesigns, {
        search: "AD-2026",
      }),
    ).toEqual([activityDesigns[0], activityDesigns[2]]);
  });

  it("searches the supported AIP Reference Code field", () => {
    expect(
      filterActivityDesigns(activityDesigns, {
        search: "aip-2026-002",
      }),
    ).toEqual([activityDesigns[0]]);
  });
});
