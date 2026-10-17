import { describe, expect, it } from "vitest";
import { getPlanningReturnUrl, withPlanningReturn } from "@/features/activity-planning/components/planning-return-state";

describe("Planning catalog return state", () => {
  it("retains only catalog-owned search/page state", () => {
    expect(getPlanningReturnUrl("/activity-designs?activityDesignsSearch=rice&activityDesignsPage=2&next=https://example.com")).toBe("/activity-designs?activityDesignsSearch=rice&activityDesignsPage=2");
    expect(getPlanningReturnUrl("/activities?activitiesSearch=staff&activitiesPage=-1")).toBe("/activities?activitiesSearch=staff");
  });
  it.each([null, "https://example.com/activities", "//example.com/activities", "/recipes", "/activity-designs/unknown", "javascript:alert(1)"])("rejects unsafe or unrelated target %s", (value) => {
    expect(getPlanningReturnUrl(value)).toBe("/activity-designs");
  });
  it("keeps direct-entry links clean and carries only a safe return target", () => {
    expect(withPlanningReturn("/activity-designs/one", "/activity-designs")).toBe("/activity-designs/one");
    expect(withPlanningReturn("/activity-designs/one", "/activity-designs?activityDesignsPage=2")).toContain("planningReturn=%2Factivity-designs%3FactivityDesignsPage%3D2");
  });
});
