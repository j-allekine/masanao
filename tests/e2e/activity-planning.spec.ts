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

async function createDesignViaApi(page: Page, title: string) {
  const response = await page.request.post("/api/activity-designs", {
    data: {
      activityDesignNo: `E2E-GLOBAL-${Date.now()}`,
      fiscalYear: 2026,
      title,
    },
  });

  expect(response.status()).toBe(201);
  return (await response.json()).activityDesign;
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
      const createdDesign = await createDesignViaApi(page, "E2E Global Activity Plan");
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

      const detailResponse = await page.request.get(
        `/api/activity-designs/${design.id}`,
      );
      expect(detailResponse.status()).toBe(200);
      const detail = await detailResponse.json();
      const savedActivity = detail.activityDesign.activities.find(
        (activity: { name: string }) => activity.name === activityName,
      );
      expect(savedActivity).toMatchObject({
        officeName: "E2E Global Office",
        particulars: "E2E global particulars",
        venue: "E2E global venue",
        plannedParticipantCount: 1250,
        plannedBudgetCentavos: "125000",
      });
      activityId = savedActivity.id;

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

      const updatedDetailResponse = await page.request.get(
        `/api/activity-designs/${design.id}`,
      );
      const updatedDetail = await updatedDetailResponse.json();
      expect(updatedDetail.activityDesign.activities).toContainEqual(
        expect.objectContaining({
          id: activityId,
          name: updatedActivityName,
          particulars: null,
          venue: null,
          plannedParticipantCount: null,
          plannedBudgetCentavos: null,
        }),
      );

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

      const scheduleResponse = await page.request.post(
        `/api/activity-designs/${design.id}/activities/${activityId}/meal-schedules`,
        {
          data: {
            label: "Lunch",
            mealTime: "12:00",
            plannedServings: 1250,
          },
        },
      );
      expect(scheduleResponse.status()).toBe(201);
      mealScheduleId = (await scheduleResponse.json()).mealSchedule.id;

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

      const scheduleDeleteResponse = await page.request.delete(
        `/api/activity-designs/${design.id}/activities/${activityId}/meal-schedules/${mealScheduleId}`,
      );
      expect(scheduleDeleteResponse.status()).toBe(204);
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
        await page.request.delete(
          `/api/activity-designs/${activityDesign.id}/activities/${activityId}/meal-schedules/${mealScheduleId}`,
        );
      }
      if (activityDesign && activityId) {
        await page.request.delete(
          `/api/activity-designs/${activityDesign.id}/activities/${activityId}`,
        );
      }
      if (activityDesign) {
        await page.request.delete(`/api/activity-designs/${activityDesign.id}`);
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
    const savedResponse = await page.request.get(`/api/activity-designs/${designId}`);
    expect(savedResponse.status()).toBe(200);
    expect(await savedResponse.json()).toMatchObject({
      activityDesign: {
        activities: [
          expect.objectContaining({
            name: "E2E Community Feeding",
            officeName: "E2E Kitchen Office",
            scheduledDate: expect.stringContaining("2026-09-03"),
            plannedBudgetCentavos: "1234567",
          }),
        ],
      },
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
    const firstResponse = await page.request.post("/api/activity-designs", {
      data: {
        activityDesignNo: `E2E-REG-${Date.now()}`,
        fiscalYear: 2026,
        title: "E2E Regression Feeding Plan",
      },
    });
    const secondResponse = await page.request.post("/api/activity-designs", {
      data: {
        activityDesignNo: `E2E-REG-${Date.now()}-2`,
        fiscalYear: 2025,
        title: "E2E Regression Outreach Plan",
      },
    });
    expect(firstResponse.status()).toBe(201);
    expect(secondResponse.status()).toBe(201);
    const firstDesign = (await firstResponse.json()).activityDesign;
    const secondDesign = (await secondResponse.json()).activityDesign;
    const activityResponse = await page.request.post(
      `/api/activity-designs/${firstDesign.id}/activities`,
      {
        data: {
          name: "Regression activity",
          officeName: "Regression Office",
          scheduledDate: "2026-09-04",
        },
      },
    );
    expect(activityResponse.status()).toBe(201);
    const activity = (await activityResponse.json()).activity;

    await page.reload();
    await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
    await page.waitForLoadState("networkidle");
    const search = page.getByRole("searchbox", {
      name: "Search Activity Designs",
      exact: true,
    });
    await search.fill("  outreach  ");
    await expect(page.getByRole("row").filter({ hasText: "E2E Regression Outreach Plan" })).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "E2E Regression Feeding Plan" })).toHaveCount(0);
    await search.fill("");
    await expect(page.getByRole("row").filter({ hasText: "E2E Regression Feeding Plan" })).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "E2E Regression Outreach Plan" })).toBeVisible();

    const row = page.getByRole("row").filter({ hasText: "E2E Regression Feeding Plan" });
    await row.getByRole("button", { name: /Actions for E2E Regression Feeding Plan/ }).click();
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
    const blockedDialog = page.getByRole("alertdialog");
    await expect(blockedDialog).toContainText("contains 1 Activity");
    await blockedDialog.getByRole("button", { name: "Close", exact: true }).click();

    await page.request.delete(
      `/api/activity-designs/${firstDesign.id}/activities/${activity.id}`,
    );
    await page.request.delete(`/api/activity-designs/${secondDesign.id}`);
    await page.reload();
    await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
    const refreshedRow = page.getByRole("row").filter({ hasText: "E2E Regression Feeding Plan" });
    await refreshedRow.getByRole("button", { name: /Actions for E2E Regression Feeding Plan/ }).click();
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete Activity Design", exact: true })
      .click();
    await expect(refreshedRow).toHaveCount(0);
  });

  test("preserves Activity and Meal Schedule API contracts after retiring detail UI", async ({
    page,
  }) => {
    await signIn(page);
    const designResponse = await page.request.post("/api/activity-designs", {
      data: {
        activityDesignNo: `E2E-API-${Date.now()}`,
        fiscalYear: 2026,
        title: "E2E API Contract Plan",
      },
    });
    expect(designResponse.status()).toBe(201);
    const design = (await designResponse.json()).activityDesign;

    const activityResponse = await page.request.post(
      `/api/activity-designs/${design.id}/activities`,
      {
        data: {
          name: "API contract activity",
          officeName: "Municipal Health Office",
          scheduledDate: "2026-09-05",
        },
      },
    );
    expect(activityResponse.status()).toBe(201);
    const activity = (await activityResponse.json()).activity;

    const scheduleResponse = await page.request.post(
      `/api/activity-designs/${design.id}/activities/${activity.id}/meal-schedules`,
      {
        data: {
          label: "Lunch",
          mealTime: "12:00",
          plannedServings: 120,
        },
      },
    );
    expect(scheduleResponse.status()).toBe(201);
    const schedule = (await scheduleResponse.json()).mealSchedule;
    expect(schedule).toMatchObject({
      label: "Lunch",
      mealTime: "12:00",
      plannedServings: 120,
    });

    const updateResponse = await page.request.patch(
      `/api/activity-designs/${design.id}/activities/${activity.id}/meal-schedules/${schedule.id}`,
      {
        data: {
          label: "Dinner",
          mealTime: "18:45",
          plannedServings: 240,
        },
      },
    );
    expect(updateResponse.status()).toBe(200);
    expect((await updateResponse.json()).mealSchedule).toMatchObject({
      label: "Dinner",
      mealTime: "18:45",
      plannedServings: 240,
    });

    const scheduleDeleteResponse = await page.request.delete(
      `/api/activity-designs/${design.id}/activities/${activity.id}/meal-schedules/${schedule.id}`,
    );
    expect(scheduleDeleteResponse.status()).toBe(204);

    const activityDeleteResponse = await page.request.delete(
      `/api/activity-designs/${design.id}/activities/${activity.id}`,
    );
    expect(activityDeleteResponse.status()).toBe(204);
    const designDeleteResponse = await page.request.delete(
      `/api/activity-designs/${design.id}`,
    );
    expect(designDeleteResponse.status()).toBe(204);
  });
});
