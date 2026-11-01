import { describe, expect, it } from "vitest";
import { appendDashboardOrigin, dashboardActivityHref, getAppliedDashboardUrl, getDashboardOriginUrl, getDesignDashboardOriginUrl } from "../src/features/supply-operations/components/dashboard-origin-state";

const now = new Date("2026-11-01T00:00:00Z");
const path = "/activity-designs/design-1/activities/activity-1";
const applied = "/dashboard?start=2020-10-01&end=2020-10-31&activitySearch=Kitchen&budgetPage=2";
const params = (origin = applied, owner = path) => new URLSearchParams({ dashboardOrigin: origin, dashboardOriginOwner: owner });

describe("Dashboard applied report origin", () => {
  it("writes only applied period, search and page in a real owned Activity href", () => {
    expect(getAppliedDashboardUrl({ start:"2020-10-01",end:"2020-10-31" }, "Kitchen", 2)).toBe(applied);
    const href=dashboardActivityHref(path,applied,"activity-1",now);
    expect(href.split("?")[0]).toBe(path);
    expect(getDashboardOriginUrl(new URLSearchParams(href.split("?")[1]),"design-1","activity-1",now)).toBe(`${applied}#dashboard-activity-activity-1`);
    expect(dashboardActivityHref(path,applied,"another",now)).toBe(path);
  });
  it("accepts a Design origin only for an actual owned child and preserves other known contexts", () => {
    expect(getDesignDashboardOriginUrl(params(),"design-1",["activity-1"],now)).toBe(`${applied}#dashboard-activity-activity-1`);
    expect(getDesignDashboardOriginUrl(params(),"design-1",["other"],now)).toBeNull();
    const query=new URLSearchParams(appendDashboardOrigin("planningReturn=%2Factivities&mealSchedulesPage=2",params(),"design-1","activity-1",now));
    expect(query.get("planningReturn")).toBe("/activities");
    expect(query.get("mealSchedulesPage")).toBe("2");
    expect(query.get("dashboardOrigin")).toBe(applied);
    const invalid=new URLSearchParams(appendDashboardOrigin(query.toString(),params(applied,"/activity-designs/other/activities/activity-1"),"design-1","activity-1",now));
    expect(invalid.has("dashboardOrigin")).toBe(false);
    expect(invalid.has("dashboardOriginOwner")).toBe(false);
    expect(invalid.get("mealSchedulesPage")).toBe("2");
  });
  for(const origin of ["https://evil.test/dashboard?start=2020-10-01&end=2020-10-31","//evil.test/dashboard","/x/../dashboard?start=2020-10-01&end=2020-10-31","/dashboard/../dashboard?start=2020-10-01&end=2020-10-31","/dashboard","/dashboard?start=2020-10-01","/dashboard?start=2020-02-30&end=2020-10-31","/dashboard?start=2020-10-01&end=2999-10-31",`${applied}&start=2020-09-01`,`${applied}&view=stock`,`${applied}&budgetPage=3`,`${applied}#unsafe`,"/dashboard?start=2020-10-01&end=2020-10-31&budgetPage=01","/dashboard?start=2020-10-01&end=2020-10-31&budgetPage=9007199254740992","/dashboard?start=2020-10-01&end=2020-10-31&activitySearch=%20Kitchen",`/dashboard?start=2020-10-01&end=2020-10-31&activitySearch=${"x".repeat(101)}`]) {
    it(`omits malformed or unsupported origin ${origin.slice(0,65)}`, () => expect(getDashboardOriginUrl(params(origin),"design-1","activity-1",now)).toBeNull());
  }
  it("rejects missing, repeated and mismatched owner hints", () => {
    expect(getDashboardOriginUrl(new URLSearchParams(),"design-1","activity-1",now)).toBeNull();
    const duplicated=params();duplicated.append("dashboardOriginOwner",path);
    expect(getDashboardOriginUrl(duplicated,"design-1","activity-1",now)).toBeNull();
    expect(getDashboardOriginUrl(params(),"design-1","activity-2",now)).toBeNull();
    expect(getDashboardOriginUrl(params(),"design-2","activity-1",now)).toBeNull();
  });
});
