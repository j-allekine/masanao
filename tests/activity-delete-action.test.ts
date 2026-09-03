import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteActivity: vi.fn(),
  getSession: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("@/server/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

vi.mock("@/features/activity-planning/server", () => ({
  deleteActivity: mocks.deleteActivity,
}));

import { executeDeleteActivity } from "@/features/activity-planning/server/actions/delete-activity";

describe("Activity deletion server action", () => {
  it("preserves the authoritative Meal Schedule conflict details", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "staff-user" } });
    mocks.deleteActivity.mockResolvedValue({
      ok: false,
      kind: "has-meal-schedules",
      error:
        "This Activity cannot be deleted while it has Meal Schedules. Remove its Meal Schedules first.",
      mealScheduleCount: 2,
    });

    await expect(
      executeDeleteActivity("design-1", "activity-1"),
    ).resolves.toEqual({
      status: "error",
      kind: "has-meal-schedules",
      error:
        "This Activity cannot be deleted while it has Meal Schedules. Remove its Meal Schedules first.",
      mealScheduleCount: 2,
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("revalidates the Activities workspace after a successful delete", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "staff-user" } });
    mocks.deleteActivity.mockResolvedValue({ ok: true });

    await expect(
      executeDeleteActivity("design-1", "activity-1"),
    ).resolves.toEqual({ status: "success" });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/activities");
  });
});
