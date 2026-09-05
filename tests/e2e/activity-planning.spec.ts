import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const staffPassword = "correct-horse-battery-staple";

async function signIn(page: Page) {
  const response = await page.request.post("/api/auth/sign-in/username", {
    data: {
      username: "kitchen.staff",
      password: staffPassword,
    },
    headers: {
      origin: process.env.BETTER_AUTH_URL ?? "http://localhost:3019",
    },
  });

  expect(response.status()).toBe(200);
  await page.goto("/activity-designs");
  await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
}

async function createDesign(page: Page, title: string) {
  await page.locator("#new-activity-design").click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "Activity Design No.", exact: true })
    .fill(`E2E-${Date.now()}`);
  await dialog.getByRole("button", { name: "Fiscal Year", exact: true }).click();
  await page.getByRole("button", { name: "2026", exact: true }).click();
  await dialog.getByRole("textbox", { name: "Title", exact: true }).fill(title);
  await dialog.getByRole("button", { name: "Create Activity Design", exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

type ActivityDesignFixture = {
  id: string;
  activityDesignNo: string;
  title: string;
};

type ActivityFixture = {
  id: string;
  activityDesignId: string;
  name: string;
  officeName: string;
  particulars: string | null;
  venue: string | null;
  plannedParticipantCount: number | null;
  plannedBudgetCentavos: number | null;
};

function withE2eDatabase<T>(callback: (database: Database.Database) => T): T {
  const databasePath = process.env.MASANAO_E2E_DATABASE_PATH;
  if (!databasePath) {
    throw new Error("MASANAO_E2E_DATABASE_PATH is not set");
  }

  const database = new Database(databasePath);
  try {
    return callback(database);
  } finally {
    database.close();
  }
}

function createDesignFixture(
  title: string,
  fiscalYear = 2026,
): ActivityDesignFixture {
  const activityDesign = {
    id: randomUUID(),
    activityDesignNo: `E2E-GLOBAL-${randomUUID()}`,
    title,
  };

  withE2eDatabase((database) => {
    database
      .prepare(
        `INSERT INTO "activity_design"
         ("id", "activityDesignNo", "fiscalYear", "title", "aipReferenceCode", "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      )
      .run(
        activityDesign.id,
        activityDesign.activityDesignNo,
        fiscalYear,
        activityDesign.title,
      );
  });

  return activityDesign;
}

function createActivityFixture({
  activityDesignId,
  name,
  officeName,
  scheduledDate,
}: {
  activityDesignId: string;
  name: string;
  officeName: string;
  scheduledDate: string;
}) {
  const activity = {
    id: randomUUID(),
    activityDesignId,
  };

  withE2eDatabase((database) => {
    database
      .prepare(
        `INSERT INTO "activity"
         ("id", "activityDesignId", "name", "officeName", "particulars", "scheduledDate", "venue", "plannedParticipantCount", "plannedBudgetCentavos", "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, NULL, ?, NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      )
      .run(activity.id, activityDesignId, name, officeName, scheduledDate);
  });

  return activity;
}

function readActivityFixture(
  activityDesignId: string,
  name: string,
): ActivityFixture | undefined {
  return withE2eDatabase((database) =>
    database
      .prepare(
        `SELECT "id", "activityDesignId", "name", "officeName", "particulars", "venue", "plannedParticipantCount", "plannedBudgetCentavos"
         FROM "activity"
         WHERE "activityDesignId" = ? AND "name" = ?`,
      )
      .get(activityDesignId, name) as ActivityFixture | undefined,
  );
}

function createMealScheduleFixture(activityId: string) {
  const mealScheduleId = randomUUID();
  withE2eDatabase((database) => {
    database
      .prepare(
        `INSERT INTO "meal_schedule"
         ("id", "activityId", "label", "mealTime", "plannedServings", "createdAt", "updatedAt")
         VALUES (?, ?, 'Lunch', '12:00', 1250, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      )
      .run(mealScheduleId, activityId);
  });

  return mealScheduleId;
}

function deleteMealScheduleFixture(mealScheduleId: string) {
  withE2eDatabase((database) => {
    database
      .prepare('DELETE FROM "meal_schedule" WHERE "id" = ?')
      .run(mealScheduleId);
  });
}

function deleteActivityFixture(activityId: string) {
  withE2eDatabase((database) => {
    database.prepare('DELETE FROM "activity" WHERE "id" = ?').run(activityId);
  });
}

function deleteDesigns(designs: ActivityDesignFixture[]) {
  withE2eDatabase((database) => {
    const remove = database.transaction(() => {
      for (const design of designs) {
        database
          .prepare(
            'DELETE FROM "meal_schedule" WHERE "activityId" IN (SELECT "id" FROM "activity" WHERE "activityDesignId" = ?)',
          )
          .run(design.id);
        database
          .prepare('DELETE FROM "activity" WHERE "activityDesignId" = ?')
          .run(design.id);
        database
          .prepare('DELETE FROM "activity_design" WHERE "id" = ?')
          .run(design.id);
      }
    });
    remove();
  });
}

test.describe("Activity planning journey", () => {
  test("manages Activities globally with parent selection, editing, and protected deletion", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await signIn(page);
    await page.goto("/activities");
    await expect(page.locator('[data-client-ready="true"]')).toBeVisible();

    await page.getByRole("button", { name: "Create Activity", exact: true }).click();
    const noDesignsDialog = page.getByRole("alertdialog");
    await expect(noDesignsDialog).toContainText("No Activity Designs yet");
    await expect(noDesignsDialog).toContainText(
      "Create an Activity Design before adding an Activity.",
    );
    await expect(noDesignsDialog.getByRole("button")).toHaveCount(1);
    await noDesignsDialog.getByRole("button", { name: "Close", exact: true }).click();

    let activityDesign: {
      id: string;
      activityDesignNo: string;
      title: string;
    } | undefined;
    let activityId: string | undefined;
    let mealScheduleId: string | undefined;

    try {
      const createdDesign = createDesignFixture("E2E Global Activity Plan");
      activityDesign = createdDesign;
      const design = createdDesign;
      await page.reload();
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();

      await page.getByRole("button", { name: "Create Activity", exact: true }).click();
      const creationDialog = page.getByRole("dialog");
      const createRequests: string[] = [];
      const requestListener = (request: import("@playwright/test").Request) => {
        if (
          request.method() === "POST" &&
          new URL(request.url()).pathname === "/activities"
        ) {
          createRequests.push(request.url());
        }
      };
      page.on("request", requestListener);

      await creationDialog.getByRole("button", { name: "Create Activity", exact: true }).click();
      await expect(
        creationDialog.getByText("Activity Design is required.", { exact: true }),
      ).toBeVisible();
      expect(createRequests).toHaveLength(0);
      page.off("request", requestListener);

      const picker = creationDialog.getByRole("combobox");
      await picker.click();
      const pickerSearch = page.getByRole("textbox", {
        name: "Search Activity Designs",
        exact: true,
      });
      await pickerSearch.fill(design.activityDesignNo);
      const option = page
        .getByRole("option")
        .filter({ hasText: design.title });
      await expect(option).toContainText(design.activityDesignNo);
      await option.click();
      await expect(picker).toContainText(design.title);
      await expect(picker).toContainText(design.activityDesignNo);

      const activityName = "E2E Global Activity";
      await creationDialog
        .getByRole("textbox", { name: "Activity name", exact: true })
        .fill(activityName);
      await creationDialog
        .getByRole("textbox", { name: "Office", exact: true })
        .fill("E2E Global Office");
      await creationDialog
        .getByRole("button", { name: "Scheduled date", exact: true })
        .click();
      await page
        .locator('[data-slot="calendar"]')
        .locator('button[data-day="9/15/2026"]')
        .click();
      await creationDialog
        .getByRole("textbox", {
          name: "Activity particulars (optional)",
          exact: true,
        })
        .fill("E2E global particulars");
      await creationDialog
        .getByRole("textbox", { name: "Venue (optional)", exact: true })
        .fill("E2E global venue");
      await creationDialog
        .getByRole("textbox", {
          name: "Planned participant count (optional)",
          exact: true,
        })
        .fill("1250");
      await creationDialog
        .getByRole("textbox", { name: "Planned budget (optional)", exact: true })
        .fill("1250.00");
      await creationDialog
        .getByRole("button", { name: "Create Activity", exact: true })
        .click();

      await expect(creationDialog).toHaveCount(0);
      await expect(
        page.getByText(`Activity added to “${design.title}”`, { exact: true }),
      ).toBeVisible();
      const activitySearch = page.getByRole("searchbox", {
        name: "Search Activities",
        exact: true,
      });
      await expect(activitySearch).toBeEmpty();
      const createdRow = page.getByRole("row").filter({ hasText: activityName });
      await expect(createdRow).toBeVisible();

      const savedActivity = readActivityFixture(design.id, activityName);
      expect(savedActivity).toBeDefined();
      expect(savedActivity).toMatchObject({
        officeName: "E2E Global Office",
        particulars: "E2E global particulars",
        venue: "E2E global venue",
        plannedParticipantCount: 1250,
        plannedBudgetCentavos: 125000,
      });
      activityId = savedActivity!.id;

      await createdRow
        .getByRole("button", { name: `Actions for ${activityName}`, exact: true })
        .click();
      await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
      const editDialog = page.getByRole("dialog");
      await expect(
        editDialog.getByRole("textbox", { name: "Activity name", exact: true }),
      ).toHaveValue(activityName);
      await expect(
        editDialog.getByRole("textbox", { name: "Office", exact: true }),
      ).toHaveValue("E2E Global Office");
      await expect(editDialog.locator("#activityDesignReadonly")).toHaveAttribute(
        "readonly",
        "",
      );
      await expect(
        editDialog.getByRole("textbox", {
          name: "Planned participant count (optional)",
          exact: true,
        }),
      ).toHaveValue("1,250");
      await expect(
        editDialog.getByRole("textbox", { name: "Planned budget (optional)", exact: true }),
      ).toHaveValue("1250.00");

      const updatedActivityName = "E2E Global Activity Updated";
      await editDialog
        .getByRole("textbox", { name: "Activity name", exact: true })
        .fill(updatedActivityName);
      await editDialog
        .getByRole("textbox", { name: "Activity particulars (optional)", exact: true })
        .fill("");
      await editDialog
        .getByRole("textbox", { name: "Venue (optional)", exact: true })
        .fill("");
      await editDialog
        .getByRole("textbox", {
          name: "Planned participant count (optional)",
          exact: true,
        })
        .fill("");
      await editDialog
        .getByRole("textbox", { name: "Planned budget (optional)", exact: true })
        .fill("");
      await editDialog.getByRole("button", { name: "Save changes", exact: true }).click();

      await expect(editDialog).toHaveCount(0);
      await expect(page.getByText("Activity updated", { exact: true })).toBeVisible();
      const updatedRow = page
        .getByRole("row")
        .filter({ hasText: updatedActivityName });
      await expect(updatedRow).toBeVisible();
      await expect(
        updatedRow.getByRole("button", {
          name: `Actions for ${updatedActivityName}`,
          exact: true,
        }),
      ).toBeFocused();

      expect(readActivityFixture(design.id, updatedActivityName)).toMatchObject({
        id: activityId,
        name: updatedActivityName,
        particulars: null,
        venue: null,
        plannedParticipantCount: null,
        plannedBudgetCentavos: null,
      });

      await activitySearch.fill("Global Activity Updated");
      await expect(updatedRow).toBeVisible();
      const planningMenu = page.getByRole("navigation", { name: "Planning sections" });
      await planningMenu
        .getByRole("link", { name: "Activity Designs", exact: true })
        .click();
      await expect(page).toHaveURL(/\/activity-designs/);
      await planningMenu.getByRole("link", { name: "Activities", exact: true }).click();
      await expect(page).toHaveURL(/\/activities/);
      await expect(
        page.getByRole("searchbox", { name: "Search Activities", exact: true }),
      ).toHaveValue("Global Activity Updated");
      await page.goBack();
      await expect(page).toHaveURL(/\/activity-designs/);
      await page.goForward();
      await expect(page).toHaveURL(/\/activities/);
      await expect(
        page.getByRole("searchbox", { name: "Search Activities", exact: true }),
      ).toHaveValue("Global Activity Updated");

      const staleRow = page
        .getByRole("row")
        .filter({ hasText: updatedActivityName });
      await staleRow
        .getByRole("button", {
          name: `Actions for ${updatedActivityName}`,
          exact: true,
        })
        .click();
      await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
      const deleteDialog = page.getByRole("alertdialog");
      await expect(deleteDialog).toContainText(`Delete “${updatedActivityName}”?`);

      mealScheduleId = createMealScheduleFixture(activityId!);

      await deleteDialog
        .getByRole("button", { name: "Delete Activity", exact: true })
        .click();
      await expect(deleteDialog).toContainText(
        "This Activity cannot be deleted while it has 1 Meal Schedule.",
      );
      await expect(
        deleteDialog.getByRole("button", { name: "Delete Activity", exact: true }),
      ).toHaveCount(0);
      await expect(deleteDialog.getByRole("button", { name: "Close", exact: true })).toHaveCount(1);
      await deleteDialog.getByRole("button", { name: "Close", exact: true }).click();

      deleteMealScheduleFixture(mealScheduleId);
      mealScheduleId = undefined;

      await staleRow
        .getByRole("button", {
          name: `Actions for ${updatedActivityName}`,
          exact: true,
        })
        .click();
      await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
      const eligibleDeleteDialog = page.getByRole("alertdialog");
      await eligibleDeleteDialog
        .getByRole("button", { name: "Delete Activity", exact: true })
        .click();
      await expect(staleRow).toHaveCount(0);
      await expect(
        page.getByRole("searchbox", { name: "Search Activities", exact: true }),
      ).toBeFocused();
    } finally {
      if (mealScheduleId && activityDesign && activityId) {
        deleteMealScheduleFixture(mealScheduleId);
      }
      if (activityDesign) {
        deleteDesigns([activityDesign]);
      }
    }
  });

  test("creates an Activity, reloads it, and redirects retired detail routes", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await signIn(page);
    const title = "E2E Contextual Feeding Plan";
    await createDesign(page, title);

    const designRow = page.getByRole("row").filter({ hasText: title });
    const actions = designRow.getByRole("button", {
      name: `Actions for ${title}`,
      exact: true,
    });
    const designId = (await actions.getAttribute("id"))!.replace(
      "activity-design-actions-",
      "",
    );

    await actions.click();
    const menuItems = page.getByRole("menuitem");
    await expect(menuItems.nth(0)).toHaveText("Add Activity");
    await expect(menuItems.nth(1)).toHaveText("Edit");
    await expect(menuItems.nth(2)).toHaveText("Delete");
    await menuItems.nth(0).click();

    const sheet = page.getByRole("dialog").filter({ hasText: `Add Activity to “${title}”` });
    await expect(sheet).toContainText("Activity Design No.");
    await expect(sheet).toContainText("FY 2026");
    await expect(
      sheet.getByRole("textbox", { name: "Activity name", exact: true }),
    ).toBeFocused();
    await sheet
      .getByRole("textbox", { name: "Activity name", exact: true })
      .fill("E2E Community Feeding");
    await sheet
      .getByRole("textbox", { name: "Office", exact: true })
      .fill("E2E Kitchen Office");
    await sheet
      .getByRole("button", { name: "Scheduled date", exact: true })
      .click();
    const calendar = page.locator('[data-slot="calendar"]');
    await calendar.locator('button[data-day="9/3/2026"]').click();
    await sheet
      .getByRole("textbox", { name: "Planned budget (optional)", exact: true })
      .fill("12345.67");
    await sheet.getByRole("button", { name: "Create Activity", exact: true }).click();

    await expect(sheet).toHaveCount(0);
    await expect(page.getByText(`Activity added to “${title}”`, { exact: true })).toBeVisible();
    await expect(designRow.getByRole("cell", { name: "1 Activity", exact: true })).toBeVisible();

    await page.reload();
    await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
    const savedRow = page.getByRole("row").filter({ hasText: title });
    await expect(savedRow.getByRole("cell", { name: "1 Activity", exact: true })).toBeVisible();
    expect(readActivityFixture(designId, "E2E Community Feeding")).toMatchObject({
      name: "E2E Community Feeding",
      officeName: "E2E Kitchen Office",
      plannedBudgetCentavos: 1234567,
    });

    await page.goto(`/activity-designs/${designId}`);
    await expect(page).toHaveURL(/\/activity-designs$/);
  });

  test("asks before discarding dirty Activity creation", async ({ page }) => {
    await signIn(page);
    const title = "E2E Dirty Activity Plan";
    await createDesign(page, title);
    const designRow = page.getByRole("row").filter({ hasText: title });
    await designRow
      .getByRole("button", { name: `Actions for ${title}`, exact: true })
      .click();
    await page.getByRole("menuitem", { name: "Add Activity", exact: true }).click();
    const sheet = page.getByRole("dialog").filter({ hasText: `Add Activity to “${title}”` });
    await sheet
      .getByRole("textbox", { name: "Activity name", exact: true })
      .fill("Unsaved activity");
    await page.keyboard.press("Escape");
    const discardDialog = page.getByRole("alertdialog");
    await expect(discardDialog).toContainText("Discard changes?");
    await discardDialog.getByRole("button", { name: "Keep editing", exact: true }).click();
    await expect(sheet).toBeVisible();
    await page.keyboard.press("Escape");
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Discard changes", exact: true })
      .click();
    await expect(sheet).toHaveCount(0);
    await expect(
      designRow.getByRole("button", {
        name: `Actions for ${title}`,
        exact: true,
      }),
    ).toBeFocused();
  });

  test("keeps table search and restrictive deletion behavior after the workflow migration", async ({
    page,
  }) => {
    await signIn(page);
    const firstDesign = createDesignFixture("E2E Regression Feeding Plan");
    const secondDesign = createDesignFixture(
      "E2E Regression Outreach Plan",
      2025,
    );
    const activity = createActivityFixture({
      activityDesignId: firstDesign.id,
      name: "Regression activity",
      officeName: "Regression Office",
      scheduledDate: "2026-09-04T00:00:00.000Z",
    });

    try {
      await page.reload();
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
      await page.waitForLoadState("networkidle");
      const search = page.getByRole("searchbox", {
        name: "Search Activity Designs",
        exact: true,
      });
      await search.fill("  outreach  ");
      await expect(
        page.getByRole("row").filter({ hasText: "E2E Regression Outreach Plan" }),
      ).toBeVisible();
      await expect(
        page.getByRole("row").filter({ hasText: "E2E Regression Feeding Plan" }),
      ).toHaveCount(0);
      await search.fill("");
      await expect(
        page.getByRole("row").filter({ hasText: "E2E Regression Feeding Plan" }),
      ).toBeVisible();
      await expect(
        page.getByRole("row").filter({ hasText: "E2E Regression Outreach Plan" }),
      ).toBeVisible();

      const row = page
        .getByRole("row")
        .filter({ hasText: "E2E Regression Feeding Plan" });
      await row
        .getByRole("button", {
          name: /Actions for E2E Regression Feeding Plan/,
        })
        .click();
      await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
      const blockedDialog = page.getByRole("alertdialog");
      await expect(blockedDialog).toContainText("contains 1 Activity");
      await blockedDialog
        .getByRole("button", { name: "Close", exact: true })
        .click();

      deleteActivityFixture(activity.id);
      deleteDesigns([secondDesign]);
      await page.reload();
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
      const refreshedRow = page
        .getByRole("row")
        .filter({ hasText: "E2E Regression Feeding Plan" });
      await refreshedRow
        .getByRole("button", {
          name: /Actions for E2E Regression Feeding Plan/,
        })
        .click();
      await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Delete Activity Design", exact: true })
        .click();
      await expect(refreshedRow).toHaveCount(0);
    } finally {
      deleteDesigns([firstDesign, secondDesign]);
    }
  });
});
