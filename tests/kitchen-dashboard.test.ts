import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/prisma/client";
import { getKitchenDashboard } from "@/features/supply-operations/server";
import { dashboardBounds, dashboardPeriod } from "@/features/supply-operations/domain/dashboard";

const actor = { id: "dash-staff", name: "Staff", username: "dashstaff" };
const now = new Date("2030-10-27T01:00:00Z");
const period = { start: "2030-10-01", end: "2030-10-27" };

beforeAll(async () => {
  await prisma.user.create({ data: { ...actor, email: "dash@test.local", role: "staff" } });
});

describe("Budget accounting Dashboard", () => {
  it("validates inclusive calendar ranges and defaults to the Manila month", () => {
    expect(dashboardPeriod({}, new Date("2030-09-30T16:00:00Z"))).toEqual({ start: "2030-10-01", end: "2030-10-01" });
    for (const params of [{ start: "2030-02-30", end: "2030-03-01" }, { start: "2030-10-02", end: "2030-10-01" }, { ...period, end: "2030-10-28" }, { start: [period.start], end: period.end }]) expect(dashboardPeriod(params, now)).toBeNull();
    expect(dashboardBounds(period).issueStart.toISOString()).toBe("2030-09-30T16:00:00.000Z");
    expect(dashboardBounds(period).receiptEnd.toISOString()).toBe("2030-10-28T00:00:00.000Z");
  });
  it("returns only budget reporting, including empty periods and legacy stock parameters", async () => {
    const result = await getKitchenDashboard(actor, { ...period, view: "stock", item: "old-item", page: "9" }, now);
    expect(result).toMatchObject({ ok: true, report: { budgets: { total: 0, page: 1, summary: { comparable: 0 } } } });
    if (!result.ok) throw Error(result.error);
    expect(Object.keys(result.report).sort()).toEqual(["budgets", "generatedAt", "period", "sampleData"]);
    expect(await prisma.inventoryLedgerMovement.count()).toBe(0);
  });
  it("labels samples only when the preview environment explicitly enables them", async () => {
    const previous = process.env.MASANAO_DASHBOARD_SAMPLE_DATA;
    try {
      process.env.MASANAO_DASHBOARD_SAMPLE_DATA = "1";
      expect(await getKitchenDashboard(actor, period, now)).toMatchObject({ ok: true, report: { sampleData: true } });
      delete process.env.MASANAO_DASHBOARD_SAMPLE_DATA;
      expect(await getKitchenDashboard(actor, period, now)).toMatchObject({ ok: true, report: { sampleData: false } });
    } finally {
      if (previous === undefined) delete process.env.MASANAO_DASHBOARD_SAMPLE_DATA;
      else process.env.MASANAO_DASHBOARD_SAMPLE_DATA = previous;
    }
  });
  it("denies missing, disabled and non-staff actors before querying even malformed report URLs", async () => {
    expect(await getKitchenDashboard(null, period, now)).toMatchObject({ ok: false, kind: "forbidden" });
    expect(await getKitchenDashboard({ ...actor, id: "absent" }, { start: "bad" }, now)).toMatchObject({ ok: false, kind: "forbidden" });
    expect(await getKitchenDashboard(actor, { start: "bad" }, now)).toMatchObject({ ok: false, kind: "validation" });
    await prisma.user.update({ where: { id: actor.id }, data: { role: "viewer" } });
    expect(await getKitchenDashboard(actor, period, now)).toMatchObject({ ok: false, kind: "forbidden" });
    await prisma.user.update({ where: { id: actor.id }, data: { role: "admin", disabled: true } });
    expect(await getKitchenDashboard(actor, period, now)).toMatchObject({ ok: false, kind: "forbidden" });
  });
});
