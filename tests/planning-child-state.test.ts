import { getPlanningCatalogReturnUrl } from "@/features/activity-planning/components/planning-return-state";
import { describe, expect, it } from "vitest";
import { filterMealSchedules, getMealSchedulesState, getMealSchedulesQuery, filterDesignActivities, getDesignActivitiesQuery, getDesignActivitiesState, getPlanningRecordUrl } from "@/features/activity-planning/components/planning-child-state";

it("carries validated Dashboard origin independently through real parents and drops foreign owners", () => {
  const params = new URLSearchParams({ dashboardOrigin: "/dashboard?start=2020-10-01&end=2020-10-31&activitySearch=Kitchen&budgetPage=2", dashboardOriginOwner: "/activity-designs/design/activities/child", planningReturn: "/activities?activitiesPage=2", designActivitiesOwner: "design", designActivitiesPage: "2", mealSchedulesOwner: "child", mealSchedulesPage: "3" });
  for (const path of ["/activity-designs/design", "/activity-designs/design/activities/child", "/activity-designs/design/activities/child/meal-schedules/meal"]) {
    const url = new URL(getPlanningRecordUrl(path, params, "design", "child", "meal"), "https://test.invalid");
    expect(url.searchParams.get("dashboardOrigin")).toBe(params.get("dashboardOrigin"));
    expect(url.searchParams.get("planningReturn")).toBe("/activities?activitiesPage=2");
    expect(url.searchParams.get("designActivitiesPage")).toBe("2");
    expect(url.searchParams.get("mealSchedulesPage")).toBe("3");
  }
  const other = new URL(getPlanningRecordUrl("/activity-designs/design/activities/other", params, "design", "other"), "https://test.invalid");
  expect(other.searchParams.has("dashboardOrigin")).toBe(false);
});

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

describe("Meal child namespace and authoritative parent row targets", () => {
  it("preserves primary order and filters the whole collection by label or time", () => {
    const rows = [{ id: "first", label: "Custom midnight", mealTime: "23:45" }, { id: "second", label: "Any user meal", mealTime: "12:00" }];
    expect(filterMealSchedules(rows, "23:45")).toEqual([rows[0]]);
    expect(filterMealSchedules(rows, "USER")).toEqual([rows[1]]);
    expect(filterMealSchedules(rows, "")).toEqual(rows);
  });
  it("keeps both owned child states separate from catalog and unknown state", () => {
    const query = getMealSchedulesQuery("designActivitiesOwner=design&designActivitiesPage=2&planningReturn=%2Factivities%3FactivitiesPage%3D4&unknown=retained", "activity", { search: "custom", page: 3 });
    const params = new URLSearchParams(query);
    expect(params.get("unknown")).toBe("retained");
    const target = new URL(getPlanningRecordUrl("/activity-designs/design/activities/activity/meal-schedules/meal", params, "design", "activity"), "https://test.invalid");
    expect(target.searchParams.get("mealSchedulesPage")).toBe("3");
    expect(target.searchParams.get("designActivitiesPage")).toBe("2");
    expect(target.searchParams.has("unknown")).toBe(false);
    expect(getPlanningRecordUrl("/activity-designs/design", params, "design", "activity")).toContain("#open-child-activity-activity");
    expect(getPlanningRecordUrl("/activity-designs/design/activities/activity", params, "design", "activity", "meal")).toContain("#open-child-meal-meal");
    const foreign = new URL(getPlanningRecordUrl("/activity-designs/design/activities/other", params, "design", "other"), "https://test.invalid");
    expect(foreign.searchParams.has("mealSchedulesSearch")).toBe(false);
  });
  it.each(["mealSchedulesOwner=foreign&mealSchedulesSearch=x&mealSchedulesPage=2", "mealSchedulesPage=2&mealSchedulesPage=3", "mealSchedulesSearch=x&mealSchedulesSearch=y"])("rejects ambiguous or foreign context %s", query => {
    expect(getMealSchedulesState(new URLSearchParams(query), "activity")).toEqual({ search: "", page: 1, created: null });
  });
  it.each(["0", "-1", "NaN", "2.5", "9007199254740992"])("does not accept invalid Meal page %s", page => {
    expect(getMealSchedulesState(new URLSearchParams({ mealSchedulesPage: page }), "activity").page).toBe(1);
  });
});


it("uses authoritative record IDs for explicit catalog returns without accepting arbitrary row hints", () => {
  expect(getPlanningCatalogReturnUrl("/activities?activitiesPage=2#foreign", "design", "activity")).toBe("/activities?activitiesPage=2#activity-actions-activity");
  expect(getPlanningCatalogReturnUrl("/activity-designs?activityDesignsSearch=Kitchen", "design")).toBe("/activity-designs?activityDesignsSearch=Kitchen#activity-design-actions-design");
  expect(getPlanningCatalogReturnUrl("//foreign.invalid", "design")).toBe("/activity-designs#activity-design-actions-design");
  expect(getPlanningCatalogReturnUrl("/activities", "design")).toBe("/activities#activity-search");
});

it("rejects malformed nested leaf paths instead of treating them as an authoritative Meal", () => {
  for (const tail of ["", "meal/extra", "meal?foreign=1", "meal#foreign"]) {
    expect(getPlanningRecordUrl(`/activity-designs/design/activities/activity/meal-schedules/${tail}`, new URLSearchParams(), "design", "activity")).toBe("/activity-designs/design");
  }
});

it("keeps a validated collection notice only until another list choice and omits it from record links", () => {
  const query = getMealSchedulesQuery("designActivitiesOwner=design&designActivitiesPage=2", "activity", { search: "", page: 2, created: null, notice: "search-cleared" });
  expect(getMealSchedulesState(new URLSearchParams(query), "activity").notice).toBe("search-cleared");
  expect(getMealSchedulesState(new URLSearchParams(query), "foreign").notice).toBeUndefined();
  expect(getMealSchedulesQuery(query, "activity", { page: 1 })).not.toContain("Notice");
  expect(getPlanningRecordUrl("/activity-designs/design/activities/activity/meal-schedules/meal", new URLSearchParams(query), "design", "activity")).not.toContain("Notice");
});
