import { describe, expect, it } from "vitest";

import { getActivityDesignResultsSummary } from "@/features/activity-planning/components/activity-design-pagination";

describe("Activity Designs results summary", () => {
  it("uses zero-result copy without a stale range", () => {
    expect(
      getActivityDesignResultsSummary({ start: 0, end: 0, total: 0 }),
    ).toBe("No results");
  });

  it("uses singular copy for one filtered result", () => {
    expect(
      getActivityDesignResultsSummary({ start: 1, end: 1, total: 1 }),
    ).toBe("Showing 1 result");
  });

  it("keeps the filtered range for a multi-result final page", () => {
    expect(
      getActivityDesignResultsSummary({ start: 11, end: 11, total: 11 }),
    ).toBe("Showing 11 to 11 of 11 results");
  });

  it("formats operational counts with thousands separators", () => {
    expect(
      getActivityDesignResultsSummary({
        start: 1001,
        end: 1010,
        total: 1010,
      }),
    ).toBe("Showing 1,001 to 1,010 of 1,010 results");
  });
});
