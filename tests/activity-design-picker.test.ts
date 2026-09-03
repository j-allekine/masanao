import { describe, expect, it } from "vitest";

import {
  filterActivityDesignOptions,
} from "@/features/activity-planning/components/activity-design-picker";
import type { ActivityDesignListItem } from "@/features/activity-planning/types";

const activityDesigns: ActivityDesignListItem[] = [
  {
    id: "one",
    activityDesignNo: "AD-2026-002",
    fiscalYear: 2026,
    title: "Senior Nutrition Outreach",
    aipReferenceCode: null,
    activityCount: 0,
  },
  {
    id: "two",
    activityDesignNo: "AD-2025-001",
    fiscalYear: 2025,
    title: "Barangay Feeding",
    aipReferenceCode: null,
    activityCount: 0,
  },
];

describe("Activity Design parent picker options", () => {
  it("trims and matches title or Design No. case-insensitively", () => {
    expect(filterActivityDesignOptions(activityDesigns, "  nutrition ")).toEqual([
      activityDesigns[0],
    ]);
    expect(filterActivityDesignOptions(activityDesigns, "ad-2025")).toEqual([
      activityDesigns[1],
    ]);
  });

  it("returns every option for an empty search", () => {
    expect(filterActivityDesignOptions(activityDesigns, "   ")).toEqual(
      activityDesigns,
    );
  });
});
