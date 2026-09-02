import { expect, test, type Page } from "@playwright/test";

const staffPassword = "correct-horse-battery-staple";

type ActivityDesign = {
  id: string;
  title: string;
};

async function authenticate(page: Page) {
  const response = await page.request.post("/api/auth/sign-in/username", {
    data: {
      username: "kitchen.staff",
      password: staffPassword,
    },
    headers: { origin: "http://localhost:3019" },
  });

  expect(response.status()).toBe(200);
}

async function createDesign(page: Page, title: string) {
  const response = await page.request.post("/api/activity-designs", {
    data: {
      activityDesignNo: `E2E-80-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      fiscalYear: 2026,
      title,
    },
  });

  expect(response.status()).toBe(201);
  return (await response.json()).activityDesign as ActivityDesign;
}

async function deleteDesigns(page: Page, designs: ActivityDesign[]) {
  for (const design of designs) {
    const detailResponse = await page.request.get(
      `/api/activity-designs/${design.id}`,
    );
    expect(detailResponse.status()).toBe(200);
    const detail = await detailResponse.json();

    for (const activity of detail.activityDesign.activities) {
      const activityResponse = await page.request.delete(
        `/api/activity-designs/${design.id}/activities/${activity.id}`,
      );
      expect(activityResponse.status()).toBe(204);
    }

    const designResponse = await page.request.delete(
      `/api/activity-designs/${design.id}`,
    );
    expect(designResponse.status()).toBe(204);
  }
}

async function openActivityDialog(page: Page, title: string) {
  const row = page.getByRole("row").filter({ hasText: title });
  await row
    .getByRole("button", { name: `Actions for ${title}`, exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Add Activity", exact: true }).click();

  return page.getByRole("dialog").filter({ hasText: `Add Activity to “${title}”` });
}

test.describe("issue 80 Activity Designs cleanup", () => {
  test("keeps notifications out and keeps result summaries truthful", async ({
    page,
  }) => {
    const prefix = `E2E Issue 80 ${Date.now()}`;
    const designs: ActivityDesign[] = [];

    await authenticate(page);
    try {
      for (let index = 1; index <= 11; index += 1) {
        designs.push(await createDesign(page, `${prefix} ${index}`));
      }

      await page.goto("/activity-designs");
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Notifications", exact: true }),
      ).toHaveCount(0);
      await expect(page.getByLabel("Unread notifications", { exact: true })).toHaveCount(0);

      const search = page.getByRole("searchbox", {
        name: "Search Activity Designs",
        exact: true,
      });
      await search.fill(prefix);
      await expect(
        page.getByText("Showing 1 to 10 of 11 results", { exact: true }),
      ).toBeVisible();

      await search.fill(`${prefix} 2`);
      await expect(page.getByText("Showing 1 result", { exact: true })).toBeVisible();
      await search.fill(prefix);

      await page.getByRole("button", { name: "Next page", exact: true }).click();
      await expect(
        page.getByText("Showing 11 to 11 of 11 results", { exact: true }),
      ).toBeVisible();

      await search.fill(`${prefix} missing`);
      await expect(page.getByText("No results", { exact: true })).toBeVisible();
      await expect(
        page.getByText("No Activity Designs match your current filters.", {
          exact: true,
        }),
      ).toBeVisible();
    } finally {
      await deleteDesigns(page, designs);
    }
  });

  test("uses a centered responsive Activity dialog and preserves exact values", async ({
    page,
  }) => {
    const title = `E2E Issue 80 Activity ${Date.now()}`;
    const designs: ActivityDesign[] = [];

    await authenticate(page);
    try {
      designs.push(await createDesign(page, title));

      await page.setViewportSize({ width: 1458, height: 986 });
      await page.goto("/activity-designs");
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
      const desktopDialog = await openActivityDialog(page, title);
      const desktopBox = await desktopDialog.boundingBox();
      expect(desktopBox).not.toBeNull();
      expect(desktopBox!.x).toBeGreaterThan(0);
      expect(desktopBox!.y).toBeGreaterThan(0);
      expect(desktopBox!.x + desktopBox!.width).toBeLessThanOrEqual(1458);
      expect(Math.abs(desktopBox!.x + desktopBox!.width / 2 - 1458 / 2)).toBeLessThanOrEqual(1);
      expect(Math.abs(desktopBox!.y + desktopBox!.height / 2 - 986 / 2)).toBeLessThanOrEqual(1);
      await desktopDialog.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect(desktopDialog).toHaveCount(0);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/activity-designs");
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();

      const dialog = await openActivityDialog(page, title);
      await expect(dialog).toHaveAccessibleName(`Add Activity to “${title}”`);
      await expect(dialog).toContainText(
        "The Activity Design context is fixed for this workflow.",
      );
      await expect(
        dialog.getByRole("textbox", { name: "Activity name", exact: true }),
      ).toBeFocused();

      const box = await dialog.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThan(0);
      expect(box!.y).toBeGreaterThan(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
      expect(Math.abs(box!.x + box!.width / 2 - 390 / 2)).toBeLessThanOrEqual(1);
      expect(Math.abs(box!.y + box!.height / 2 - 844 / 2)).toBeLessThanOrEqual(1);

      const activityName = dialog.getByRole("textbox", {
        name: "Activity name",
        exact: true,
      });
      const office = dialog.getByRole("textbox", { name: "Office", exact: true });
      const participantCount = dialog.getByRole("textbox", {
        name: "Planned participant count (optional)",
        exact: true,
      });
      const plannedBudget = dialog.getByRole("textbox", {
        name: "Planned budget (optional)",
        exact: true,
      });

      await activityName.fill("E2E exact Activity");
      await office.fill("E2E exact Office");
      await participantCount.fill("1221121");
      await expect(participantCount).toHaveValue("1,221,121");
      await dialog.getByRole("button", { name: "Scheduled date", exact: true }).click();
      await page.locator('[data-slot="calendar"] button[data-day="9/3/2026"]').click();

      await plannedBudget.fill("1234.567");
      await dialog.getByRole("button", { name: "Create Activity", exact: true }).click();
      await expect(dialog).toBeVisible();
      await expect(plannedBudget).toHaveAttribute("aria-invalid", "true");
      await expect(dialog).toContainText("up to two decimal places");

      await plannedBudget.fill("1212121");
      await expect(plannedBudget).toHaveValue("1,212,121");
      await plannedBudget.blur();
      await expect(plannedBudget).toHaveValue("1,212,121.00");
      await dialog.getByRole("button", { name: "Create Activity", exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await expect(
        page.getByText(`Activity added to “${title}”`, { exact: true }),
      ).toBeVisible();

      const detailResponse = await page.request.get(
        `/api/activity-designs/${designs[0]!.id}`,
      );
      expect(detailResponse.status()).toBe(200);
      expect(await detailResponse.json()).toMatchObject({
        activityDesign: {
          activities: [
            expect.objectContaining({
              name: "E2E exact Activity",
              plannedParticipantCount: 1_221_121,
              plannedBudgetCentavos: "121212100",
            }),
          ],
        },
      });
    } finally {
      await deleteDesigns(page, designs);
    }
  });
});
