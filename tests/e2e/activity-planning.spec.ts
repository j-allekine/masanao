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

    await page
      .getByLabel("Activity Design No.", { exact: true })
      .fill("E2E-2026-019");
    await page.getByLabel("Fiscal year", { exact: true }).fill("2026");
    await page.getByLabel("Title", { exact: true }).fill("E2E Feeding Plan");
    await page
      .getByLabel("Office name", { exact: true })
      .fill("E2E Kitchen Office");
    await page
      .getByRole("button", { name: "Create Activity Design", exact: true })
      .click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Saved" }),
    ).toContainText("Saved");

    await page.reload();
    await page.waitForLoadState("networkidle");
    const designRow = page
      .getByRole("row")
      .filter({ hasText: "E2E Feeding Plan" });
    await expect(designRow).toContainText("e2e-2026-019");
    await designRow.getByRole("button", { name: "Open", exact: true }).click();
    await page.waitForLoadState("networkidle");

    await page
      .getByLabel("Activity name", { exact: true })
      .fill("E2E Community Feeding");
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
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    const designDeleteDialog = page.getByRole("alertdialog");
    await expect(designDeleteDialog).toContainText("Remove it before deleting");
    await designDeleteDialog
      .getByRole("button", { name: "Delete Activity Design", exact: true })
      .click();
    await expect(designDeleteDialog).toContainText("Deletion blocked");
    await designDeleteDialog
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    await savedDesignRow
      .getByRole("button", { name: "Open", exact: true })
      .click();
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
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete Activity Design", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "E2E Feeding Plan" }),
    ).toHaveCount(0);
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
        officeName: "GAD",
      },
      {
        activityDesignNo: "E2E-SEARCH-2025-001",
        fiscalYear: 2025,
        title: "Senior Outreach",
        officeName: "CSWD",
      },
      {
        activityDesignNo: "E2E-SEARCH-2026-002",
        fiscalYear: 2026,
        title: "Community Nutrition",
        officeName: "CSWD",
      },
    ]) {
      const response = await page.request.post("/api/activity-designs", {
        data: activityDesign,
      });
      expect(response.status()).toBe(201);
      createdDesigns.push((await response.json()).activityDesign);
    }

    for (const [index, activity] of [
      { name: "Annual feeding activity", scheduledDate: "2026-09-01" },
      { name: "Community nutrition activity one", scheduledDate: "2026-09-02" },
      { name: "Community nutrition activity two", scheduledDate: "2026-09-03" },
    ].entries()) {
      const design = createdDesigns[index === 0 ? 0 : 2];
      const response = await page.request.post(
        `/api/activity-designs/${design.id}/activities`,
        { data: activity },
      );
      expect(response.status()).toBe(201);
    }

    await page.reload();
    await page.waitForLoadState("networkidle");

    const table = page.getByRole("table", { name: "Activity Designs" });
    const bodyRows = table.locator("tbody tr");
    await expect(bodyRows).toHaveCount(3);
    await expect(table).toContainText("1 Activity");
    await expect(table).toContainText("2 Activities");
    await expect(table).toContainText(
      "Activity view coming in a future update.",
    );

    await page
      .getByLabel("Search Activity Designs", { exact: true })
      .fill("  SENIOR  ");
    await expect(bodyRows).toHaveCount(1);
    await expect(bodyRows.first()).toContainText("Senior Outreach");

    await page
      .getByLabel("Search Activity Designs", { exact: true })
      .fill("");
    await page.getByRole("combobox", { name: "Fiscal Year" }).click();
    await page.getByRole("option", { name: "FY 2026" }).click();
    await page.getByRole("combobox", { name: "Office" }).click();
    await page.getByRole("option", { name: "CSWD" }).click();
    await expect(bodyRows).toHaveCount(1);
    await expect(bodyRows.first()).toContainText("Community Nutrition");

    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(bodyRows).toHaveCount(3);
  });
});
