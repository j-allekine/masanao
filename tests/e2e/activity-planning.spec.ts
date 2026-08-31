import { expect, test, type Page } from "@playwright/test";

const staffPassword = "correct-horse-battery-staple";

async function signIn(page: Page) {
  const response = await page.request.post("/api/auth/sign-in/username", {
    data: {
      username: "kitchen.staff",
      password: staffPassword,
    },
    headers: { origin: "http://localhost:3019" },
  });

  expect(response.status()).toBe(200);
  await page.goto("/overview");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/\/overview$/);
}

test.describe("Activity planning journey", () => {
  test("creates, reloads, edits, and deletes planning records in child-first order", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await signIn(page);
    await page.goto("/activity-designs");
    await page.waitForLoadState("networkidle");

    await page.locator("#new-activity-design").click();
    const createDesignDialog = page.getByRole("dialog");
    await createDesignDialog
      .getByLabel("Activity Design No.", { exact: true })
      .fill("E2E-2026-019");
    await createDesignDialog
      .getByLabel("Fiscal Year", { exact: true })
      .click();
    await page.getByRole("button", { name: "2026", exact: true }).click();
    await createDesignDialog
      .getByLabel("Title", { exact: true })
      .fill("E2E Feeding Plan");
    await page
      .getByRole("button", { name: "Create Activity Design", exact: true })
      .click();
    await expect(createDesignDialog).toHaveCount(0);

    await page.reload();
    await page.waitForLoadState("networkidle");
    const designRow = page
      .getByRole("row")
      .filter({ hasText: "E2E Feeding Plan" });
    await expect(designRow).toContainText("e2e-2026-019");
    const designActionButton = designRow.getByRole("button", {
      name: "Actions for E2E Feeding Plan",
      exact: true,
    });
    const designId = (await designActionButton.getAttribute("id"))!.replace(
      "activity-design-actions-",
      "",
    );
    await page.goto(`/activity-designs/${designId}`);
    await page.waitForLoadState("networkidle");

    await page
      .getByLabel("Activity name", { exact: true })
      .fill("E2E Community Feeding");
    await page
      .getByLabel("Office", { exact: true })
      .fill("E2E Kitchen Office");
    await page.getByLabel("Scheduled date", { exact: true }).fill("2026-09-03");
    await page
      .getByRole("button", { name: "Create Activity", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "E2E Community Feeding" }),
    ).toBeVisible();

    const createScheduleForm = page.getByRole("form", {
      name: "Create Meal Schedule",
    });
    await createScheduleForm
      .getByLabel("Meal label", { exact: true })
      .fill("Lunch");
    await createScheduleForm
      .getByLabel("Meal time", { exact: true })
      .fill("12:00");
    await createScheduleForm
      .getByLabel("Planned servings (optional)", { exact: true })
      .fill("120");
    await createScheduleForm
      .getByRole("button", { name: "Add Meal Schedule", exact: true })
      .click();
    await expect(createScheduleForm.getByRole("alert")).toContainText(
      "Meal Schedule created.",
    );

    await page.reload();
    await page.waitForLoadState("networkidle");
    const scheduleList = page.getByRole("list", { name: "Meal Schedules" });
    await expect(scheduleList).toContainText("Lunch");
    await expect(scheduleList).toContainText("12:00");
    await expect(scheduleList).toContainText("120 planned servings");

    await page
      .getByRole("button", { name: "Back to Activity Designs", exact: true })
      .click();
    await page.waitForLoadState("networkidle");
    const savedDesignRow = page
      .getByRole("row")
      .filter({ hasText: "E2E Feeding Plan" });
    await savedDesignRow
      .getByRole("button", {
        name: "Actions for E2E Feeding Plan",
        exact: true,
      })
      .click();
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
    const designDeleteDialog = page.getByRole("alertdialog");
    await expect(designDeleteDialog).toContainText(
      "This Activity Design cannot be deleted because it contains 1 Activity.",
    );
    await designDeleteDialog
      .getByRole("button", { name: "Close", exact: true })
      .click();
    await page.goto(`/activity-designs/${designId}`);
    await page.waitForLoadState("networkidle");

    await scheduleList
      .getByRole("button", { name: "Edit Lunch Meal Schedule", exact: true })
      .click();
    const editScheduleForm = page.getByRole("form", {
      name: "Edit Meal Schedule",
    });
    await editScheduleForm
      .getByLabel("Meal label", { exact: true })
      .fill("Dinner");
    await editScheduleForm
      .getByLabel("Meal time", { exact: true })
      .fill("18:45");
    await editScheduleForm
      .getByLabel("Planned servings (optional)", { exact: true })
      .fill("240");
    await editScheduleForm
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(editScheduleForm).toHaveCount(0);

    await page.reload();
    await page.waitForLoadState("networkidle");
    const activityCard = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: "E2E Community Feeding" }) });
    const editedScheduleList = activityCard.getByRole("list", {
      name: "Meal Schedules",
    });
    await expect(editedScheduleList).toContainText("Dinner");
    await expect(editedScheduleList).toContainText("18:45");
    await expect(editedScheduleList).toContainText("240 planned servings");

    await activityCard
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    const activityDeleteDialog = page.getByRole("alertdialog");
    await expect(activityDeleteDialog).toContainText("Remove it before deleting");
    await activityDeleteDialog
      .getByRole("button", { name: "Delete Activity", exact: true })
      .click();
    await expect(activityDeleteDialog).toContainText("Deletion blocked");
    await activityDeleteDialog
      .getByRole("button", { name: "Cancel", exact: true })
      .click();

    await editedScheduleList
      .getByRole("button", { name: "Delete Dinner Meal Schedule", exact: true })
      .click();
    const scheduleDeleteDialog = page.getByRole("alertdialog");
    await scheduleDeleteDialog
      .getByRole("button", { name: "Delete Meal Schedule", exact: true })
      .click();
    await expect(activityCard).toContainText("No Meal Schedules yet");

    await activityCard
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete Activity", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "E2E Community Feeding" }),
    ).toHaveCount(0);

    await page
      .getByRole("button", { name: "Back to Activity Designs", exact: true })
      .click();
    const emptyDesignRow = page
      .getByRole("row")
      .filter({ hasText: "E2E Feeding Plan" });
    await emptyDesignRow
      .getByRole("button", {
        name: "Actions for E2E Feeding Plan",
        exact: true,
      })
      .click();
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete Activity Design", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "E2E Feeding Plan" }),
    ).toHaveCount(0);
  });

  test("edits Activity Designs in a shared dialog and blocks a stale delete", async ({
    page,
  }) => {
    await signIn(page);
    const createResponse = await page.request.post("/api/activity-designs", {
      data: {
        activityDesignNo: "E2E-DIALOG-001",
        fiscalYear: 2026,
        title: "Dialog Planning Context",
      },
    });
    expect(createResponse.status()).toBe(201);
    const created = await createResponse.json();
    const designId = created.activityDesign.id as string;

    await page.goto("/activity-designs");
    await page.waitForLoadState("networkidle");
    let designRow = page.getByRole("row").filter({
      hasText: "Dialog Planning Context",
    });
    await designRow
      .getByRole("button", {
        name: "Actions for Dialog Planning Context",
        exact: true,
      })
      .click();
    await page.getByRole("menuitem", { name: "Edit", exact: true }).click();

    const editDialog = page.getByRole("dialog");
    await expect(editDialog.getByLabel("Fiscal Year", { exact: true })).toHaveText(
      "FY 2026",
    );
    await editDialog
      .getByLabel("Title", { exact: true })
      .fill("Updated Dialog Planning Context");
    await editDialog
      .getByLabel("Fiscal Year", { exact: true })
      .click();
    await expect(page.getByText("2020–2029", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Next decade", exact: true }).click();
    await expect(page.getByText("2030–2039", { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: "Previous decade", exact: true })
      .click();
    await page.getByRole("button", { name: "2027", exact: true }).click();
    await editDialog
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(editDialog).toHaveCount(0);

    await page.reload();
    await page.waitForLoadState("networkidle");
    designRow = page.getByRole("row").filter({
      hasText: "Updated Dialog Planning Context",
    });
    await expect(designRow).toContainText("2027");

    await designRow
      .getByRole("button", {
        name: "Actions for Updated Dialog Planning Context",
        exact: true,
      })
      .click();
    await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
    const dirtyEditDialog = page.getByRole("dialog");
    await dirtyEditDialog
      .getByLabel("Title", { exact: true })
      .fill("Unsaved title");
    await page.keyboard.press("Escape");
    const discardDialog = page.getByRole("alertdialog");
    await expect(discardDialog).toContainText("Discard changes?");
    await discardDialog
      .getByRole("button", { name: "Keep editing", exact: true })
      .click();
    await expect(dirtyEditDialog).toBeVisible();
    await page.keyboard.press("Escape");
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Discard changes", exact: true })
      .click();
    await expect(dirtyEditDialog).toHaveCount(0);

    await designRow
      .getByRole("button", {
        name: "Actions for Updated Dialog Planning Context",
        exact: true,
      })
      .click();
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
    const deleteDialog = page.getByRole("alertdialog");
    const activityResponse = await page.request.post(
      `/api/activity-designs/${designId}/activities`,
      {
        data: {
          name: "Created after table load",
          officeName: "Municipal Health Office",
          scheduledDate: "2026-09-03",
        },
      },
    );
    expect(activityResponse.status()).toBe(201);
    const secondActivityResponse = await page.request.post(
      `/api/activity-designs/${designId}/activities`,
      {
        data: {
          name: "Second activity after table load",
          officeName: "Municipal Health Office",
          scheduledDate: "2026-09-04",
        },
      },
    );
    expect(secondActivityResponse.status()).toBe(201);
    await deleteDialog
      .getByRole("button", { name: "Delete Activity Design", exact: true })
      .click();
    await expect(deleteDialog).toContainText(
      "This Activity Design cannot be deleted because it contains 2 Activities.",
    );
    await expect(
      deleteDialog.getByRole("button", { name: "Delete Activity Design", exact: true }),
    ).toHaveCount(0);
    await deleteDialog.getByRole("button", { name: "Close", exact: true }).click();

    const activity = await activityResponse.json();
    const cleanupResponse = await page.request.delete(
      `/api/activity-designs/${designId}/activities/${activity.activity.id}`,
    );
    expect(cleanupResponse.status()).toBe(204);
    const secondActivity = await secondActivityResponse.json();
    const secondCleanupResponse = await page.request.delete(
      `/api/activity-designs/${designId}/activities/${secondActivity.activity.id}`,
    );
    expect(secondCleanupResponse.status()).toBe(204);
    await page.reload();
    await page.waitForLoadState("networkidle");
    designRow = page.getByRole("row").filter({
      hasText: "Updated Dialog Planning Context",
    });
    await designRow
      .getByRole("button", {
        name: "Actions for Updated Dialog Planning Context",
        exact: true,
      })
      .click();
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete Activity Design", exact: true })
      .click();
    await expect(designRow).toHaveCount(0);
  });

  test("searches and filters the complete Activity Designs table", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/activity-designs");
    await page.waitForLoadState("networkidle");

    const createdDesigns: Array<{ id: string }> = [];
    for (const activityDesign of [
      {
        activityDesignNo: "E2E-SEARCH-2026-001",
        fiscalYear: 2026,
        title: "Annual Feeding Program",
      },
      {
        activityDesignNo: "E2E-SEARCH-2025-001",
        fiscalYear: 2025,
        title: "Senior Outreach",
      },
      {
        activityDesignNo: "E2E-SEARCH-2026-002",
        fiscalYear: 2026,
        title: "Community Nutrition",
      },
    ]) {
      const response = await page.request.post("/api/activity-designs", {
        data: activityDesign,
      });
      expect(response.status()).toBe(201);
      createdDesigns.push((await response.json()).activityDesign);
    }

    for (const [index, activity] of [
      { name: "Annual feeding activity", officeName: "GAD", scheduledDate: "2026-09-01" },
      { name: "Community nutrition activity one", officeName: "CSWD", scheduledDate: "2026-09-02" },
      { name: "Community nutrition activity two", officeName: "CSWD", scheduledDate: "2026-09-03" },
    ].entries()) {
      const design = createdDesigns[index === 0 ? 0 : 2];
      const response = await page.request.post(
        `/api/activity-designs/${design.id}/activities`,
        { data: activity },
      );
      expect(response.status()).toBe(201);
    }

    for (let index = 1; index <= 8; index += 1) {
      const response = await page.request.post("/api/activity-designs", {
        data: {
          activityDesignNo: `E2E-PAGE-${String(index).padStart(2, "0")}`,
          fiscalYear: 2024,
          title: `Pagination design ${index}`,
        },
      });
      expect(response.status()).toBe(201);
    }

    await page.reload();
    await page.waitForLoadState("networkidle");

    const table = page.getByRole("table", { name: "Activity Designs" });
    const bodyRows = table.locator("tbody tr");
    await expect(bodyRows).toHaveCount(10);
    await expect(table.getByRole("cell", { name: "1 Activity" })).toBeVisible();
    await expect(table.getByRole("cell", { name: "2 Activities" })).toBeVisible();
    await expect(page.getByText("Page 1 of 2", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(bodyRows).toHaveCount(1);
    await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();

    await page
      .getByLabel("Search Activity Designs", { exact: true })
      .fill("  SENIOR  ");
    await expect(bodyRows).toHaveCount(1);
    await expect(bodyRows.first()).toContainText("Senior Outreach");

    await page
      .getByLabel("Search Activity Designs", { exact: true })
      .fill("");
    await page.getByRole("combobox", { name: "Fiscal Year" }).click();
    await page.getByRole("option", { name: "2026" }).click();
    await expect(bodyRows).toHaveCount(2);
    await expect(table).toContainText("Annual Feeding Program");
    await expect(table).toContainText("Community Nutrition");

    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(bodyRows).toHaveCount(10);
  });
});
