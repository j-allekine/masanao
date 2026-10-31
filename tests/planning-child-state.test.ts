import { describe, expect, it } from "vitest";
import { filterDesignActivities, getDesignActivitiesQuery, getDesignActivitiesState, getPlanningRecordUrl } from "@/features/activity-planning/components/planning-child-state";

describe("Design child collection state", () => {
  it("filters the complete ordered collection by name or Office before slicing", () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({ name: `Activity ${i}`, officeName: i === 24 ? "Later Office" : "Kitchen" }));
    expect(filterDesignActivities(rows, " later ")).toEqual([rows[24]]);
    expect(filterDesignActivities(rows, "Activity 2")).toEqual(rows.filter(row => row.name.startsWith("Activity 2")));
  });
  it.each(["0", "-1", "1.5", "1e2", "Infinity", "9007199254740992"])("rejects malformed page %s", page => {
    expect(getDesignActivitiesState(new URLSearchParams({ designActivitiesPage: page }), "design").page).toBe(1);
  });
  it("rejects foreign ownership and duplicate namespace values", () => {
    for (const query of ["designActivitiesOwner=foreign&designActivitiesSearch=Kitchen&designActivitiesPage=2", "designActivitiesSearch=one&designActivitiesSearch=two&designActivitiesPage=2"]) {
      expect(getDesignActivitiesState(new URLSearchParams(query), "design")).toEqual({ search: "", page: 1, created: null });
    }
  });
  it("changes only the owned namespace and carries catalog through a known nested chain", () => {
    const catalog = "/activities?activitiesSearch=Office&activitiesPage=3";
    const query = getDesignActivitiesQuery(new URLSearchParams({ planningReturn: catalog, independent: "retained" }).toString(), "design", { search: "Kitchen", page: 2 });
    const params = new URLSearchParams(query);
    expect(params.get("independent")).toBe("retained");
    const url = new URL(getPlanningRecordUrl("/activity-designs/design/activities/child", params, "design", "child"), "https://test.invalid");
    expect(url.searchParams.get("designActivitiesPage")).toBe("2");
    expect(url.searchParams.get("planningReturn")).toBe(catalog);
    expect(url.searchParams.has("independent")).toBe(false);
    expect(getPlanningRecordUrl("//foreign.invalid", params, "design", "child")).toMatch(/^\/activity-designs\/design\?/);
    expect(getPlanningRecordUrl("/activity-designs/design/activities/foreign", params, "design", "child")).not.toContain("/foreign");
  });
});
