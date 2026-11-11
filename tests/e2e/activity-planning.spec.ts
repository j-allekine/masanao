import { createActivityOfficeFixture } from "./activity-office-fixture";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { postFixtureSignIn } from "./fixture-auth";
import { expectFullRecordHeading } from "./workspace-layout-helpers";

const staffPassword = "correct-horse-battery-staple";
const destructiveColor = "rgb(157, 65, 55)";

async function expectRequiredMarker(dialog: Locator, fieldId: string) {
  const marker = dialog.locator(`label[for="${fieldId}"] [aria-hidden="true"]`);
  await expect(marker).toHaveText("*");
  await expect(marker).toHaveCSS("color", destructiveColor);
}

async function expectHiddenFieldError(
  dialog: Locator,
  control: Locator,
  description: string | RegExp,
) {
  await expect(control).toHaveAttribute("aria-invalid", "true");
  await expect(control).toHaveAccessibleDescription(description);
  await expect(control).toHaveCSS("border-top-color", destructiveColor);
  const descriptions = await control.getAttribute("aria-describedby");
  const errorId = descriptions?.split(" ").find((id) => id.endsWith("-error"));
  const details = dialog.locator(`[id="${errorId}"]`);
  await expect(details).toHaveCSS("position", "absolute");
  await expect(details).toHaveCSS("clip-path", "inset(50%)");
}

async function expectMealScheduleValidation(
  dialog: Locator,
  submitName: string,
  correctedLabel: string,
  correctedTime: string,
) {
  await expectRequiredMarker(dialog, "mealScheduleLabel");
  await expectRequiredMarker(dialog, "mealScheduleTime");
  const label = dialog.getByRole("textbox", {
    name: "Meal Schedule label",
    exact: true,
  });
  const time = dialog.locator("#mealScheduleTime");
  await expect(time).toHaveAccessibleName("Meal time");
  await expect(label).toHaveAttribute("required", "");
  await expect(time).toHaveAttribute("required", "");
  await label.clear();
  await time.clear();
  await dialog.getByRole("button", { name: submitName, exact: true }).click();
  await expectHiddenFieldError(dialog, label, "Meal Schedule label is required");
  await expectHiddenFieldError(dialog, time, "Meal time must use HH:mm format");
  await label.fill(correctedLabel);
  await expect(label).toHaveAttribute("aria-invalid", "false");
  await expect(time).toHaveAttribute("aria-invalid", "true");
  await time.fill(correctedTime);
  await expect(time).toHaveAttribute("aria-invalid", "false");
}

async function signIn(page: Page) {
  const response = await postFixtureSignIn(page.request, {
    data: {
      username: "kitchen.staff",
      password: staffPassword,
    },
    headers: {
      origin: process.env.BETTER_AUTH_URL ?? "http://localhost:3019",
    },
  });

  expect(response.status()).toBe(200);
  await page.clock.install({ time: new Date("2026-09-01T12:00:00") });
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
  await expect(page).toHaveURL(/\/activity-designs\/[^/?]+(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await page.goto("/activity-designs");
  await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
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
  aipReferenceCode: string | null = null,
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
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      )
      .run(
        activityDesign.id,
        activityDesign.activityDesignNo,
        fiscalYear,
        activityDesign.title,
        aipReferenceCode,
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
  const activity: ActivityFixture = {
    id: randomUUID(),
    activityDesignId,
    name,
    officeName,
    particulars: null,
    venue: null,
    plannedParticipantCount: null,
    plannedBudgetCentavos: null,
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

function deleteDesigns(designs: Pick<ActivityDesignFixture, "id">[]) {
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
  test("uses the body face for Planning numeric controls", async ({ page }) => {
    await signIn(page);

    const title = "E2E Typography Alignment";
    const activityDesign = createDesignFixture(title);

    try {
      await page.goto("/activities");
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
      await page.getByRole("button", { name: "Create Activity", exact: true }).click();

      const dialog = page.getByRole("dialog");
      const bodyFace = await dialog
        .getByRole("textbox", { name: "Activity name", exact: true })
        .evaluate((element) => getComputedStyle(element).fontFamily);

      await expect(
        dialog.getByRole("textbox", {
          name: "Planned pax",
          exact: true,
        }),
      ).toHaveCSS("font-family", bodyFace);
      await expect(
        dialog.getByRole("textbox", {
          name: "Planned budget",
          exact: true,
        }),
      ).toHaveCSS("font-family", bodyFace);

      await page.goto("/activity-designs");
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
      await page.getByRole("button", { name: "Create Activity Design", exact: true }).click();

      const designDialog = page.getByRole("dialog");
      const designBodyFace = await designDialog
        .getByRole("textbox", { name: "Title", exact: true })
        .evaluate((element) => getComputedStyle(element).fontFamily);

      const fiscalYearTrigger = designDialog.getByRole("button", {
        name: "Fiscal Year",
        exact: true,
      });
      await expect(fiscalYearTrigger).toHaveCSS("font-family", designBodyFace);
      await fiscalYearTrigger.click();

      const fiscalYearOptions = page.getByRole("group", {
        name: "Fiscal years",
      });
      await expect(fiscalYearOptions).toBeVisible();
      await expect(page.getByText("2020–2029", { exact: true })).toHaveCSS(
        "font-family",
        designBodyFace,
      );
      expect(
        await fiscalYearOptions
          .getByRole("button")
          .evaluateAll((buttons) =>
            buttons.map((button) => getComputedStyle(button).fontFamily),
          ),
      ).toEqual(Array.from({ length: 10 }, () => designBodyFace));
      await page.goto(`/activity-designs/${activityDesign.id}`);
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
      const detailBodyFace = await page
        .getByText(activityDesign.activityDesignNo, { exact: true })
        .evaluate((element) => getComputedStyle(element).fontFamily);
      await expect(page.getByText("Fiscal year: 2026", { exact: true })).toHaveCSS(
        "font-family",
        detailBodyFace,
      );
    } finally {
      deleteDesigns([activityDesign]);
    }
  });

  test("manages Activities globally with parent selection, editing, and protected deletion", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await signIn(page);
    await page.clock.install({
      time: new Date("2026-09-01T09:00:00.000Z"),
    });
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
    const office = createActivityOfficeFixture("E2E Global Office");
    const reassignmentOffice = createActivityOfficeFixture("E2E Replacement Office");
    const inactiveOffice = createActivityOfficeFixture("E2E Inactive Office");
    inactiveOffice.deactivate();

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

      const picker = creationDialog.getByRole("combobox", {
        name: "Activity Design",
        exact: true,
      });
      await expect(picker).toHaveAttribute("aria-required", "true");
      for (const id of ["activityDesignId", "name", "officeId", "scheduledDate"]) {
        await expectRequiredMarker(creationDialog, id);
      }
      await expect(creationDialog.getByText("(optional)", { exact: false })).toHaveCount(0);

      const submit = creationDialog.getByRole("button", {
        name: "Create Activity",
        exact: true,
      });
      await submit.click();
      await expectHiddenFieldError(creationDialog, picker, "Activity Design is required.");
      await expect(picker).toBeFocused();
      expect(createRequests).toHaveLength(0);
      page.off("request", requestListener);

      await picker.press("Enter");
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
      await expect(picker).toHaveAttribute("aria-invalid", "false");
      await submit.click();
      const activityNameInput = creationDialog.getByRole("textbox", {
        name: "Activity name",
        exact: true,
      });
      const officeInput = creationDialog.getByRole("combobox", { name: "Office", exact: true });
      const scheduledDate = creationDialog.getByRole("button", { name: "Scheduled date", exact: true });
      await expect(activityNameInput).toBeFocused();
      await expectHiddenFieldError(creationDialog, activityNameInput, "Activity name is required");
      await expectHiddenFieldError(creationDialog, officeInput, "Office is required");
      await expectHiddenFieldError(creationDialog, scheduledDate, /Scheduled date is required/);

      const activityName = "E2E Global Activity";
      await activityNameInput.fill(activityName);
      await expect(activityNameInput).toHaveAttribute("aria-invalid", "false");
      await expect(officeInput).toHaveAttribute("aria-invalid", "true");
      await officeInput.fill("E2E Inactive Office");
      const noOfficeMatches = page.getByText("No active Offices match your search.");
      await expect(noOfficeMatches).toBeVisible();
      await officeInput.press("Escape");
      await expect(officeInput).toHaveAttribute("aria-expanded", "false");
      await expect(noOfficeMatches).toBeHidden();
      await expect(creationDialog).toBeVisible();
      await officeInput.fill("Global Office");
      await expect(page.getByRole("option", { name: "E2E Global Office" })).toBeVisible();
      await page.screenshot({ path: test.info().outputPath("activity-office-keyboard-search.png") });
      await officeInput.press("ArrowDown");
      await officeInput.press("Enter");
      await expect(officeInput).toHaveValue("E2E Global Office");
      await expect(officeInput).toHaveAttribute("aria-invalid", "false");
      await scheduledDate.click();
      await page
        .locator('[data-slot="calendar"]')
        .locator('button[data-day="9/15/2026"]')
        .click();
      await officeInput.clear();
      await expect(officeInput).toHaveValue("");
      await submit.click();
      await expect(officeInput).toBeFocused();
      await expectHiddenFieldError(creationDialog, officeInput, "Office is required");
      await expect(activityNameInput).toHaveValue(activityName);
      await officeInput.fill("Global Office");
      await page.getByRole("option", { name: "E2E Global Office", exact: true }).click();
      await creationDialog
        .getByRole("textbox", {
          name: "Activity particulars",
          exact: true,
        })
        .fill("E2E global particulars");
      await creationDialog
        .getByRole("textbox", { name: "Venue", exact: true })
        .fill("E2E global venue");
      await creationDialog
        .getByRole("textbox", {
          name: "Planned pax",
          exact: true,
        })
        .fill("1250");
      await creationDialog
        .getByRole("textbox", { name: "Planned budget", exact: true })
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
      await expect(page).toHaveURL(/\/activities\/[^/?]+(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: activityName, exact: true })).toBeVisible();
      await page.goto(`/activities?activitiesSearch=${encodeURIComponent(activityName)}`);
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
      await expect(activitySearch).toHaveValue(activityName);
      const createdRow = page.getByRole("row").filter({ hasText: activityName });
      await expect(createdRow).toBeVisible();
      await expect(createdRow).toContainText("E2E Global Office");

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

      office.rename("E2E Renamed Global Office");
      await page.goto("/dashboard?start=2026-09-01&end=2026-09-30");
      const dashboardSearch = page.getByRole("searchbox", { name: "Search Activities by name or Office" });
      await dashboardSearch.fill("E2E Global Office");
      await dashboardSearch.press("Enter");
      await expect(page).toHaveURL((url) => url.searchParams.get("activitySearch") === "E2E Global Office");
      await expect(page.getByRole("row", { name: /E2E Global Activity/ })).toContainText("E2E Global Office");
      await page.goto(`/activities?activitiesSearch=${encodeURIComponent(activityName)}`);
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();

      await createdRow
        .getByRole("button", { name: `Actions for ${activityName}`, exact: true })
        .click();
      await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
      const editDialog = page.getByRole("dialog");
      await expect(
        editDialog.getByRole("textbox", { name: "Activity name", exact: true }),
      ).toHaveValue(activityName);
      await expect(
        editDialog.getByRole("combobox", { name: "Office", exact: true }),
      ).toHaveValue("E2E Global Office");
      await expect(editDialog.locator("#activityDesignReadonly")).toHaveAttribute(
        "readonly",
        "",
      );
      await expect(
        editDialog.getByRole("textbox", {
          name: "Planned pax",
          exact: true,
        }),
      ).toHaveValue("1,250");
      await expect(
        editDialog.getByRole("textbox", { name: "Planned budget", exact: true }),
      ).toHaveValue("1250.00");

      const updatedActivityName = "E2E Global Activity Updated";
      await editDialog
        .getByRole("textbox", { name: "Activity name", exact: true })
        .fill(updatedActivityName);
      await editDialog
        .getByRole("textbox", { name: "Activity particulars", exact: true })
        .fill("");
      await editDialog
        .getByRole("textbox", { name: "Venue", exact: true })
        .fill("");
      await editDialog
        .getByRole("textbox", {
          name: "Planned pax",
          exact: true,
        })
        .fill("");
      await editDialog
        .getByRole("textbox", { name: "Planned budget", exact: true })
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
        officeName: "E2E Global Office",
        particulars: null,
        venue: null,
        plannedParticipantCount: null,
        plannedBudgetCentavos: null,
      });

      await activitySearch.fill("Global Activity Updated");
      await expect(updatedRow).toBeVisible();
      await expect(
        page.getByRole("navigation", { name: "Planning sections" }),
      ).toHaveCount(0);

      await updatedRow.getByRole("button", { name: `Actions for ${updatedActivityName}`, exact: true }).click();
      await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
      const editOffice = editDialog.getByRole("combobox", { name: "Office", exact: true });
      await expect(editOffice).toHaveValue("E2E Global Office");
      await editOffice.fill("Replacement Office");
      await page.getByRole("option", { name: "E2E Replacement Office", exact: true }).click();
      await editDialog.getByRole("button", { name: "Save changes", exact: true }).click();
      await expect(editDialog).toHaveCount(0);
      await expect(updatedRow).toContainText("E2E Replacement Office");
      expect(readActivityFixture(design.id, updatedActivityName)).toMatchObject({
        officeName: "E2E Replacement Office",
      });

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
      office.remove();
      reassignmentOffice.remove();
      inactiveOffice.remove();
      if (mealScheduleId && activityDesign && activityId) {
        deleteMealScheduleFixture(mealScheduleId);
      }
      if (activityDesign) {
        deleteDesigns([activityDesign]);
      }
    }
  });

  test("explains where to maintain Offices when no active choices exist", async ({ page }) => {
    const design = createDesignFixture("E2E Empty Office Directory");
    const activeIds = withE2eDatabase((db) => db.transaction(() => {
      const offices = db.prepare("SELECT id FROM office WHERE isActive = 1").all() as { id: string }[];
      db.prepare("UPDATE office SET isActive = 0 WHERE isActive = 1").run();
      return offices;
    })());
    try {
      await signIn(page);
      await page.goto(`/activity-designs/${design.id}`);
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
      await page.getByRole("button", { name: "Create Activity", exact: true }).click();
      const dialog = page.getByRole("dialog");
      const office = dialog.getByRole("combobox", { name: "Office", exact: true });
      await expect(office).toHaveAccessibleDescription(/No active Offices.*Master Data/);
      await office.fill("Mayor");
      await expect(page.getByText("No active Offices available.", { exact: true })).toBeVisible();
      await expect(page.getByRole("option")).toHaveCount(0);
      await office.press("Escape");
      await expect(office).toHaveAttribute("aria-expanded", "false");
      await page.screenshot({ path: test.info().outputPath("activity-office-empty-directory.png") });
      await expect(dialog).toBeVisible();
    } finally {
      withE2eDatabase((db) => db.transaction(() => {
        const reactivate = db.prepare("UPDATE office SET isActive = 1 WHERE id = ?");
        for (const { id } of activeIds) reactivate.run(id);
      })());
      deleteDesigns([design]);
    }
  });

  test("creates an Activity, reloads it, and keeps its Office through directory changes", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    const officeName = "E2E Kitchen Office";
    const office = createActivityOfficeFixture(officeName);
    let designId: string | undefined;
    try {
      await signIn(page);
      const title = "E2E Contextual Feeding Plan";
      await createDesign(page, title);

      const designRow = page.getByRole("row").filter({ hasText: title });
      const actions = designRow.getByRole("button", {
        name: `Actions for ${title}`,
        exact: true,
      });
      designId = (await actions.getAttribute("id"))!.replace(
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
        .getByRole("combobox", { name: "Office", exact: true })
        .fill("Kitchen Office");
      await page.getByRole("option", { name: officeName, exact: true }).click();
      await sheet
        .getByRole("button", { name: "Scheduled date", exact: true })
        .click();
      const calendar = page.locator('[data-slot="calendar"]');
      await calendar.locator("button[data-day]").first().click();
      await sheet
        .getByRole("textbox", { name: "Planned budget", exact: true })
        .fill("12345.67");
      await sheet.getByRole("button", { name: "Create Activity", exact: true }).click();

      await expect(sheet).toHaveCount(0);
      await expect(page.getByText(`Activity added to “${title}”`, { exact: true })).toBeVisible();
      await expect(page).toHaveURL(/\/activities\/[^/?]+(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: "E2E Community Feeding", exact: true })).toBeVisible();
      await page.goto("/activity-designs");
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
      await expect(designRow.getByRole("cell", { name: "1 Activity", exact: true })).toBeVisible();

      await page.reload();
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
      const savedRow = page.getByRole("row").filter({ hasText: title });
      await expect(savedRow.getByRole("cell", { name: "1 Activity", exact: true })).toBeVisible();
      expect(readActivityFixture(designId, "E2E Community Feeding")).toMatchObject({
        name: "E2E Community Feeding",
        officeName,
        plannedBudgetCentavos: 1234567,
      });

      await page.goto(`/activity-designs/${designId}`);
      await expect(page).toHaveURL(new RegExp(`/activity-designs/${designId}$`));
      await expect(
        page.getByRole("heading", { name: new RegExp(title) }),
      ).toBeVisible();

      const row = page.getByRole("row").filter({ hasText: "E2E Community Feeding" });
      for (const active of [true, false]) {
        if (!active) {
          office.deactivate();
          await page.reload();
        }
        await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
        await row.getByRole("button", { name: "Actions for E2E Community Feeding" }).click();
        await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
        const edit = page.getByRole("dialog");
        const picker = edit.getByRole("combobox", { name: "Office", exact: true });
        await expect(picker).toHaveValue(officeName);
        await picker.press("ArrowDown");
        await expect(page.getByRole("option", { name: `Keep saved Office · ${officeName}` })).toBeVisible();
        const directoryOption = page.getByRole("option", { name: officeName, exact: true });
        if (active) {
          await expect(directoryOption).toBeVisible();
        } else {
          await expect(directoryOption).toHaveCount(0);
          await page.screenshot({ path: test.info().outputPath("activity-office-keep-inactive.png") });
        }
        await picker.press("Escape");
        const venue = active ? "Community Hall" : "Community Annex";
        await edit.getByRole("textbox", { name: "Venue", exact: true }).fill(venue);
        await edit.getByRole("button", { name: "Save changes", exact: true }).click();
        await expect(edit).toHaveCount(0);
        await expect(row).toContainText(officeName);
        expect(readActivityFixture(designId, "E2E Community Feeding")).toMatchObject({ officeName, venue });
      }
    } finally {
      office.remove();
      if (designId) deleteDesigns([{ id: designId }]);
    }
  });

  test("opens populated and empty Activity Design records without page overflow", async ({
    page,
  }) => {
    await signIn(page);
    const populatedDesign = createDesignFixture(
      "E2E Record Page Plan",
      2026,
      "AIP-E2E-215",
    );
    const emptyDesign = createDesignFixture("E2E Empty Record Page Plan");
    const otherDesign = createDesignFixture("E2E Other Record Page Plan");
    const plannedActivity = createActivityFixture({
      activityDesignId: populatedDesign.id,
      name: "E2E Record Page Activity",
      officeName: "E2E Record Office",
      scheduledDate: "2026-09-15T00:00:00.000Z",
    });
    const otherActivity = createActivityFixture({
      activityDesignId: otherDesign.id,
      name: "E2E Unrelated Activity",
      officeName: "E2E Other Office",
      scheduledDate: "2026-09-16T00:00:00.000Z",
    });
    const mealScheduleId = createMealScheduleFixture(plannedActivity.id);

    try {
      for (const viewport of [
        { width: 1280, height: 800 },
        { width: 320, height: 720 },
      ]) {
        await page.setViewportSize(viewport);
        await page.goto("/activity-designs");
        const listRow = page
          .getByRole("row")
          .filter({ hasText: populatedDesign.title });
        await listRow
          .getByRole("link", { name: populatedDesign.title, exact: true })
          .click();

        await expect(page).toHaveURL(
          new RegExp(`/activity-designs/${populatedDesign.id}$`),
        );
        await expect(
          page.getByRole("heading", {
            name: populatedDesign.title,
          }),
        ).toBeVisible();
        await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
        await page.getByRole("button", { name: "Additional details", exact: true }).click();
        await expect(page.getByText("AIP-E2E-215", { exact: true })).toBeVisible();
        await expect(
          page.getByRole("heading", { name: "Activities (1)", exact: true }),
        ).toBeVisible();

        const activityRow = page
          .getByRole("row")
          .filter({ hasText: "E2E Record Page Activity" });
        await expect(activityRow).toContainText("E2E Record Office");
        await expect(activityRow).toContainText("1");
        await expect(activityRow.getByRole("link", { name: "Open Activity" })).toHaveAttribute(
          "href",
          `/activity-designs/${populatedDesign.id}/activities/${plannedActivity.id}`,
        );
        await expect(
          page.getByText("E2E Unrelated Activity", { exact: true }),
        ).toHaveCount(0);
        await expect(
          page.getByRole("link", { name: "Activity Designs", exact: true }),
        ).toBeVisible();
        expect(await page.evaluate(() =>
          document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        )).toBe(true);

        await page.getByRole("button", { name: "Create Activity", exact: true }).click();
        const createDialog = page.getByRole("dialog");
        await expect(createDialog).toContainText(
          `Add Activity to “${populatedDesign.title}”`,
        );
        await expect(createDialog.getByRole("combobox", { name: "Activity Design", exact: true })).toHaveCount(0);
        await expect(createDialog.getByRole("combobox", { name: "Office", exact: true })).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(createDialog).toHaveCount(0);

        await page.goto(`/activity-designs/${emptyDesign.id}`);
        await expect(page.getByText("No Activities yet.", { exact: true })).toBeVisible();
        await expect(
          page.getByText(
            "Activities created here stay under this Activity Design.",
            { exact: true },
          ),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Create Activity", exact: true }),
        ).toHaveCount(1);
        expect(await page.evaluate(() =>
          document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        )).toBe(true);
      }

      await page.goto("/activity-designs/missing-record");
      await expect(page.getByText("404", { exact: true })).toBeVisible();
    } finally {
      deleteMealScheduleFixture(mealScheduleId);
      deleteActivityFixture(plannedActivity.id);
      deleteActivityFixture(otherActivity.id);
      deleteDesigns([populatedDesign, emptyDesign, otherDesign]);
    }
  });

  test("wraps full Planning record names and keeps actions reachable", async ({ page }, info) => {
    test.setTimeout(120_000);
    const phrase = "Municipal kitchen workshop and volunteer meal preparation ";
    const title = phrase.repeat(4).slice(0, 200);
    const design = createDesignFixture(title);
    const activity = createActivityFixture({
      activityDesignId: design.id,
      name: "Community kitchen orientation",
      officeName: "E2E Activity Office",
      scheduledDate: "2026-10-07T00:00:00.000Z",
    });
    try {
      await signIn(page);
      const designUrl = `/activity-designs/${design.id}`;
      for (const [path, headingName, actionName, record] of [
        [designUrl, title, "Create Activity", "design"],
        [`${designUrl}/activities/${activity.id}`, activity.name, "Add Meal Schedule", "activity"],
      ]) {
        await page.goto(path);
        await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
        const sidebar = page.getByRole("main").getByRole("button", { name: "Toggle Sidebar", exact: true });
        const action = page.getByRole("button", { name: actionName, exact: true });
        const back = page.getByRole("link", { name: "Activity Designs", exact: true });
        for (const viewport of [{ width: 1280, height: 800 }, { width: 320, height: 480 }, { width: 320, height: 300 }]) {
          await page.setViewportSize(viewport);
          const heading = await expectFullRecordHeading(page, headingName);
          await heading.scrollIntoViewIfNeeded();
          await expect(heading).toBeInViewport({ ratio: 1 });
          await page.screenshot({ path: info.outputPath(`${record}-heading-${viewport.width}x${viewport.height}.png`) });
          await sidebar.focus();
          await page.keyboard.press("Tab");
          await expect(action).toBeFocused();
          await expect(action).toBeInViewport({ ratio: 1 });
          await page.keyboard.press("Tab");
          await expect(back).toBeFocused();
          await expect(back).toBeInViewport({ ratio: 1 });
        }
      }
    } finally {
      deleteActivityFixture(activity.id);
      deleteDesigns([design]);
    }
  });

  test("opens Activity records with their direct Meal Schedules and contextual creation", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await signIn(page);
    const design = createDesignFixture("E2E Activity Record Plan");
    const populatedActivity = createActivityFixture({
      activityDesignId: design.id,
      name: "E2E Populated Activity",
      officeName: "E2E Activity Office",
      scheduledDate: "2026-10-07T00:00:00.000Z",
    });
    const emptyActivity = createActivityFixture({
      activityDesignId: design.id,
      name: "E2E Empty Activity",
      officeName: "E2E Empty Office",
      scheduledDate: "2026-10-08T00:00:00.000Z",
    });
    const otherDesign = createDesignFixture("E2E Other Activity Record Plan");
    const otherActivity = createActivityFixture({
      activityDesignId: otherDesign.id,
      name: "E2E Unrelated Activity Record",
      officeName: "E2E Other Office",
      scheduledDate: "2026-10-09T00:00:00.000Z",
    });
    const mealScheduleId = createMealScheduleFixture(populatedActivity.id);

    try {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(`/activity-designs/${design.id}`);
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
      const activityRowWithActions = page
        .getByRole("row")
        .filter({ hasText: populatedActivity.name });
      await activityRowWithActions
        .getByRole("button", {
          name: `Actions for ${populatedActivity.name}`,
          exact: true,
        })
        .click();
      await expect(page.getByRole("menuitem", { name: "Edit", exact: true })).toBeVisible();
      await expect(page.getByRole("menuitem", { name: "Delete", exact: true })).toBeVisible();
      await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
      const activityEditDialog = page.getByRole("dialog");
      await expect(
        activityEditDialog.getByRole("textbox", {
          name: "Activity name",
          exact: true,
        }),
      ).toHaveValue(populatedActivity.name);
      await page.keyboard.press("Escape");
      await expect(activityEditDialog).toHaveCount(0);

      await activityRowWithActions
        .getByRole("button", {
          name: `Actions for ${populatedActivity.name}`,
          exact: true,
        })
        .click();
      await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
      const blockedActivityDeleteDialog = page.getByRole("alertdialog");
      await expect(blockedActivityDeleteDialog).toContainText(
        "This Activity cannot be deleted while it has 1 Meal Schedule.",
      );
      await blockedActivityDeleteDialog
        .getByRole("button", { name: "Close", exact: true })
        .click();

      await page.goto(
        `/activity-designs/${design.id}/activities/${populatedActivity.id}`,
      );
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
      const mealScheduleRowWithActions = page
        .getByRole("row")
        .filter({ hasText: "Lunch" });
      await mealScheduleRowWithActions
        .getByRole("button", { name: "Actions for Lunch", exact: true })
        .click();
      await expect(page.getByRole("menuitem", { name: "Edit", exact: true })).toBeVisible();
      await expect(page.getByRole("menuitem", { name: "Delete", exact: true })).toBeVisible();
      await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
      const mealScheduleEditDialog = page.getByRole("dialog");
      await expect(
        mealScheduleEditDialog.getByRole("form", {
          name: "Edit Meal Schedule",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        mealScheduleEditDialog.getByRole("textbox", {
          name: "Meal Schedule label",
          exact: true,
        }),
      ).toHaveValue("Lunch");
      await expect(mealScheduleEditDialog.locator("#mealScheduleTime")).toHaveValue("12:00");
      await expect(mealScheduleEditDialog.locator("#mealScheduleServings")).toHaveCount(0);
      await expectMealScheduleValidation(mealScheduleEditDialog, "Save changes", "Lunch", "12:30");
      await mealScheduleEditDialog.getByRole("button", { name: "Save changes", exact: true }).click();
      await expect(mealScheduleEditDialog).toHaveCount(0);
      expect(withE2eDatabase((database) => database.prepare('SELECT "mealTime", "plannedServings" FROM "meal_schedule" WHERE "id" = ?').get(mealScheduleId))).toEqual({ mealTime: "12:30", plannedServings: 1250 });
      withE2eDatabase((database) => database.prepare('UPDATE "meal_schedule" SET "mealTime" = ? WHERE "id" = ?').run("12:00", mealScheduleId));
      await page.keyboard.press("Escape");
      await expect(mealScheduleEditDialog).toHaveCount(0);

      await mealScheduleRowWithActions
        .getByRole("button", { name: "Actions for Lunch", exact: true })
        .click();
      await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
      const mealScheduleDeleteDialog = page.getByRole("alertdialog");
      await expect(mealScheduleDeleteDialog).toContainText("Delete “Lunch”?");
      await mealScheduleDeleteDialog
        .getByRole("button", { name: "Cancel", exact: true })
        .click();

      for (const viewport of [
        { width: 1280, height: 800 },
        { width: 320, height: 720 },
      ]) {
        await page.setViewportSize(viewport);
        await page.goto(`/activity-designs/${design.id}`);

        const activityRow = page
          .getByRole("row")
          .filter({ hasText: populatedActivity.name });
        await activityRow.getByRole("link", { name: /^Open Activity:/ }).click();

        await expect(page).toHaveURL(
          new RegExp(
            `/activity-designs/${design.id}/activities/${populatedActivity.id}$`,
          ),
        );
        await expect(
          page.getByRole("heading", { name: populatedActivity.name, exact: true }),
        ).toBeVisible();
        await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
        await expect(
          page.getByRole("link", { name: design.activityDesignNo, exact: true }),
        ).toHaveAttribute("href", `/activity-designs/${design.id}`);
        await expect(page.getByRole("link", { name: "Back to Activity Design", exact: true })).toHaveCount(0);
        await expect(page.getByText("Lunch", { exact: true })).toBeVisible();
        await expect(page.getByText(viewport.width < 640 ? "Time: 12:00" : "12:00", { exact: true })).toBeVisible();
        await expect(page.getByText("Planned pax", { exact: true })).toBeVisible();
        await page.screenshot({ path: `test-results/planning-activity-${viewport.width}.png`, fullPage: true });
        await expect(page.getByText("Planned servings", { exact: true })).toHaveCount(0);
        await expect(page.getByText("1,250", { exact: true })).toHaveCount(0);

        const mealScheduleRow = page
          .getByRole("row")
          .filter({ hasText: "Lunch" });
        const openMealSchedule = mealScheduleRow.getByRole("link", {
          name: /^Open Meal Schedule:/,
          exact: true,
        });
        await expect(openMealSchedule).toHaveAttribute(
          "href",
          `/activity-designs/${design.id}/activities/${populatedActivity.id}/meal-schedules/${mealScheduleId}`,
        );
        await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
        await openMealSchedule.focus();
        await expect(openMealSchedule).toBeFocused();
        await page.keyboard.press("Enter");

        await expect(page).toHaveURL(
          new RegExp(
            `/activity-designs/${design.id}/activities/${populatedActivity.id}/meal-schedules/${mealScheduleId}$`,
          ),
        );
        await expect(
          page.getByRole("heading", { name: "Lunch · 12:00", exact: true }),
        ).toBeVisible();
        await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
        await expect(
          page.getByRole("link", { name: populatedActivity.name, exact: true }),
        ).toHaveAttribute(
          "href",
          `/activity-designs/${design.id}/activities/${populatedActivity.id}`,
        );
        await expect(page.getByText("Planned servings", { exact: true })).toHaveCount(0);
        await page.screenshot({ path: `test-results/planning-meal-${viewport.width}.png`, fullPage: true });
        const backToActivity = page.getByRole("link", { name: populatedActivity.name, exact: true });
        await expect(page.getByRole("button", { name: "Add Recipes", exact: true })).toBeVisible();
        await expect(page.getByRole("button", { name: "Additional details", exact: true })).toBeVisible();
        await expect(page.getByRole("link", { name: "Open issuance draft", exact: true })).toHaveCount(0);
        await expect(page.getByText("Food Supplies", { exact: true })).toHaveCount(0);
        await expect(
          page.getByText("Direct-use Stock Items", { exact: true }),
        ).toHaveCount(0);
        await expect(
          page.getByText("Stock availability", { exact: true }),
        ).toHaveCount(0);
        expect(await page.evaluate(() =>
          document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        )).toBe(true);
        await backToActivity.focus();
        await expect(backToActivity).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(
          new RegExp(`/activity-designs/${design.id}/activities/${populatedActivity.id}$`),
        );
        expect(await page.evaluate(() =>
          document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        )).toBe(true);

        await page.goto(
          `/activity-designs/${design.id}/activities/${emptyActivity.id}`,
        );
        await expect(
          page.getByText("No Meal Schedules yet.", { exact: true }),
        ).toBeVisible();
        await expect(page.getByText("Not recorded", { exact: true })).toHaveCount(1);
        await expect(page.getByRole("button", { name: "Additional details", exact: true })).toHaveCount(0);
        expect(await page.evaluate(() =>
          document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        )).toBe(true);
      }

      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/activity-designs/${design.id}/activities/${emptyActivity.id}`);
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
      await page
        .getByRole("button", { name: "Add Meal Schedule", exact: true })
        .last()
        .click();
      const createDialog = page.getByRole("dialog");
      await expect(createDialog).toContainText(
        `Under “${emptyActivity.name}”.`,
      );
      await expectMealScheduleValidation(
        createDialog,
        "Add Meal Schedule",
        "Afternoon Snack",
        "15:30",
      );
      await expect(createDialog.locator("#mealScheduleServings")).toHaveCount(0);
      await createDialog
        .getByRole("button", { name: "Add Meal Schedule", exact: true })
        .click();
      await expect(createDialog).toHaveCount(0);
      await expect(page).toHaveURL(/\/meal-schedules\/[^/?]+(?:\?.*)?$/);
      await expect(page.getByRole("heading", { name: "Afternoon Snack · 15:30", exact: true })).toBeVisible();
      await expect(page.getByText("Planned servings", { exact: true })).toHaveCount(0);

      await page.goto(`/activity-designs/${otherDesign.id}/activities/${populatedActivity.id}`);
      await expect(page.getByText("404", { exact: true })).toBeVisible();
      await page.goto(`/activity-designs/${design.id}/activities/${otherActivity.id}`);
      await expect(page.getByText("404", { exact: true })).toBeVisible();
      await page.goto(
        `/activity-designs/${design.id}/activities/${populatedActivity.id}/meal-schedules/missing-meal-schedule`,
      );
      await expect(page.getByText("404", { exact: true })).toBeVisible();
      await page.goto(
        `/activity-designs/${otherDesign.id}/activities/${populatedActivity.id}/meal-schedules/${mealScheduleId}`,
      );
      await expect(page.getByText("404", { exact: true })).toBeVisible();
      await page.goto(
        `/activity-designs/${design.id}/activities/${otherActivity.id}/meal-schedules/${mealScheduleId}`,
      );
      await expect(page.getByText("404", { exact: true })).toBeVisible();
    } finally {
      deleteDesigns([design, otherDesign]);
    }
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
