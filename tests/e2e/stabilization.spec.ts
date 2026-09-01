import { expect, test, type Page } from "@playwright/test";

const staffPassword = "correct-horse-battery-staple";
const signInEndpoint = "**/api/auth/sign-in/username";

type ActivityDesign = {
  id: string;
  activityDesignNo: string;
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

async function openActivityDesigns(page: Page) {
  await page.goto("/activity-designs");
  await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
}

async function createDesign(
  page: Page,
  activityDesignNo: string,
  title: string,
  aipReferenceCode?: string,
) {
  const response = await page.request.post("/api/activity-designs", {
    data: {
      activityDesignNo,
      fiscalYear: 2026,
      title,
      aipReferenceCode,
    },
  });

  expect(response.status()).toBe(201);
  return (await response.json()).activityDesign as ActivityDesign;
}

async function deleteDesigns(page: Page, designs: ActivityDesign[]) {
  for (const design of designs) {
    await page.request.delete(`/api/activity-designs/${design.id}`);
  }
}

test.describe("frontend stabilization regression seam", () => {
  test("keeps Overview truthful and mobile navigation stateful", async ({
    page,
  }) => {
    const title = `E2E Mobile Navigation ${Date.now()}`;
    let design: ActivityDesign | undefined;

    await authenticate(page);
    try {
      await page.goto("/overview");
      await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Welcome, Kitchen Staff", exact: true }),
      ).toBeVisible();
      await expect(page.getByText("Workspace placeholder", { exact: true })).toHaveCount(0);
      await expect(page.getByText("Summary value", { exact: true })).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Open Activity Designs", exact: true }),
      ).toBeVisible();

      design = await createDesign(
        page,
        `E2E-MOBILE-${Date.now()}`,
        title,
        `AIP-${Date.now()}`,
      );
      await page.setViewportSize({ width: 390, height: 844 });
      await openActivityDesigns(page);

      const search = page.getByLabel("Search Activity Designs", { exact: true });
      await search.fill(title);
      const row = page.getByRole("row").filter({ hasText: title });
      await row.getByRole("checkbox", { name: `Select ${title}` }).click();
      await expect(page.getByText("1 selected", { exact: true })).toBeVisible();

      const trigger = page.locator('[data-slot="sidebar-trigger"]');
      await expect(trigger).toBeVisible();
      await trigger.focus();
      await page.keyboard.press("Enter");

      const mobileSidebar = page.locator(
        '[data-sidebar="sidebar"][data-mobile="true"]',
      );
      await expect(mobileSidebar).toBeVisible();
      await expect(
        mobileSidebar.getByRole("link", {
          name: "Activity Designs",
          exact: true,
        }),
      ).toBeVisible();
      await mobileSidebar.getByRole("button", { name: "Close", exact: true }).focus();
      await page.keyboard.press("Enter");
      await expect(mobileSidebar).toBeHidden();

      await expect(search).toHaveValue(title);
      await expect(page.getByText("1 selected", { exact: true })).toBeVisible();

      await trigger.click();
      await expect(mobileSidebar).toBeVisible();
      await mobileSidebar.getByRole("button", { name: "Close", exact: true }).click();
      await expect(mobileSidebar).toBeHidden();
    } finally {
      if (design) await deleteDesigns(page, [design]);
    }
  });

  test("keeps table results, selection, pagination, and supported actions synchronized", async ({
    page,
  }) => {
    const prefix = `E2E TABLE ${Date.now()}`;
    const designs: ActivityDesign[] = [];

    await authenticate(page);
    try {
      for (let index = 1; index <= 11; index += 1) {
        designs.push(
          await createDesign(
            page,
            `${prefix}-${index}`,
            `${prefix} ${String(index).padStart(2, "0")}`,
          ),
        );
      }

      await openActivityDesigns(page);
      const search = page.getByLabel("Search Activity Designs", { exact: true });
      await search.fill(prefix);
      await expect(
        page.getByText("Showing 1 to 10 of 11 results", { exact: true }),
      ).toBeVisible();

      await expect(
        page.getByRole("button", {
          name: "Configure Activity Designs columns",
        }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("menuitem", { name: "Duplicate", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("menuitem", { name: "Archive", exact: true }),
      ).toHaveCount(0);
      await expect(page.getByText("Coming later", { exact: true })).toHaveCount(2);

      const firstTitle = `${prefix} 01`;
      const firstRow = page.getByRole("row").filter({ hasText: firstTitle });
      await firstRow.getByRole("checkbox", { name: `Select ${firstTitle}` }).click();
      await expect(page.getByText("1 selected", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Edit", exact: true })).toBeEnabled();

      await page
        .getByRole("checkbox", {
          name: "Select all Activity Designs on this page",
        })
        .click();
      await expect(page.getByText("10 selected", { exact: true })).toBeVisible();
      const clearSelection = page.getByRole("button", {
        name: "Clear Activity Designs selection",
        exact: true,
      });
      await clearSelection.click();
      await expect(page.getByText(/selected$/, { exact: false })).toHaveCount(0);
      await expect(clearSelection).toBeDisabled();

      await firstRow.getByRole("checkbox", { name: `Select ${firstTitle}` }).click();
      await search.fill(`${prefix} 11`);
      const secondPageRow = page.getByRole("row").nth(1);
      await expect(secondPageRow).toBeVisible();
      await expect(secondPageRow).not.toContainText(firstTitle);
      await expect(page.getByText(/selected$/, { exact: false })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Edit", exact: true })).toBeDisabled();

      await search.fill(prefix);
      await page.getByRole("button", { name: "Next page", exact: true }).click();
      await expect(page.getByText("Showing 11 to 11 of 11 results", { exact: true })).toBeVisible();
      await expect(page.getByRole("row").nth(1)).toBeVisible();
      await expect(page.getByText(/selected$/, { exact: false })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Next page", exact: true })).toBeDisabled();

      await search.fill("no matching Activity Design");
      await expect(
        page.getByText("No Activity Designs match your current filters.", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Clear filters", exact: true })).toBeVisible();
    } finally {
      await deleteDesigns(page, designs);
    }
  });

  test("preserves form values and focus across validation and server errors", async ({
    page,
  }) => {
    await authenticate(page);
    const design = await createDesign(
      page,
      `E2E-FORM-${Date.now()}`,
      `E2E Form Target ${Date.now()}`,
    );
    try {
      await openActivityDesigns(page);
      await page.getByRole("button", { name: "Create Activity Design", exact: true }).click();
      const dialog = page.getByRole("dialog");
      const designNo = dialog.getByRole("textbox", {
        name: "Activity Design No.",
        exact: true,
      });
      const fiscalYear = dialog.getByRole("button", {
        name: "Fiscal Year",
        exact: true,
      });
      const title = dialog.getByRole("textbox", { name: "Title", exact: true });
      const submit = dialog.getByRole("button", {
        name: "Create Activity Design",
        exact: true,
      });

      await expect(designNo).toHaveAttribute("required", "");
      await expect(fiscalYear).toHaveAttribute("aria-required", "true");
      await expect(title).toHaveAttribute("required", "");
      await title.fill("E2E retained after validation");
      await submit.click();
      await expect(designNo).toBeFocused();
      await expect(designNo).toHaveAttribute("aria-invalid", "true");
      const designNoErrorId = await designNo.getAttribute("aria-describedby");
      expect(designNoErrorId).toBeTruthy();
      await expect(dialog.locator(`#${designNoErrorId}`)).toBeVisible();
      await expect(title).toHaveValue("E2E retained after validation");

      await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Discard changes", exact: true })
        .click();

      const targetRow = page.getByRole("row").filter({ hasText: design.title });
      await targetRow
        .getByRole("button", { name: `Actions for ${design.title}`, exact: true })
        .click();
      await page.getByRole("menuitem", { name: "Add Activity", exact: true }).click();
      const sheet = page.getByRole("dialog").filter({ hasText: `Add Activity to “${design.title}”` });
      const activityName = sheet.getByRole("textbox", {
        name: "Activity name",
        exact: true,
      });
      const office = sheet.getByRole("textbox", { name: "Office", exact: true });
      await expect(activityName).toHaveAttribute("required", "");
      await expect(
        sheet.getByRole("button", { name: "Scheduled date", exact: true }),
      ).toHaveAttribute("aria-required", "true");
      await sheet.getByRole("button", { name: "Create Activity", exact: true }).click();
      await expect(activityName).toBeFocused();
      await expect(activityName).toHaveAttribute("aria-invalid", "true");
      await activityName.fill("E2E preserved Activity");
      await sheet.getByRole("button", { name: "Create Activity", exact: true }).click();
      await expect(office).toBeFocused();
      await expect(activityName).toHaveValue("E2E preserved Activity");

      await sheet.getByRole("button", { name: "Cancel", exact: true }).click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Discard changes", exact: true })
        .click();

      await page.getByRole("button", { name: "Create Activity Design", exact: true }).click();
      const duplicateDialog = page.getByRole("dialog");
      await duplicateDialog
        .getByRole("textbox", { name: "Activity Design No.", exact: true })
        .fill(design.activityDesignNo);
      await duplicateDialog
        .getByRole("button", { name: "Fiscal Year", exact: true })
        .click();
      await page.getByRole("button", { name: "2026", exact: true }).click();
      await duplicateDialog
        .getByRole("textbox", { name: "Title", exact: true })
        .fill("E2E duplicate submission");
      await duplicateDialog
        .getByRole("button", { name: "Create Activity Design", exact: true })
        .click();
      await expect(
        duplicateDialog.getByText(
          "An Activity Design with that number already exists.",
          { exact: true },
        ).first(),
      ).toBeVisible();
      await expect(
        duplicateDialog.getByRole("textbox", { name: "Title", exact: true }),
      ).toHaveValue("E2E duplicate submission");
    } finally {
      await deleteDesigns(page, [design]);
    }
  });

  test("communicates pending login and prevents duplicate submissions", async ({
    page,
  }) => {
    let releaseResponse = () => {};
    let resolveRequestStarted = () => {};
    const requestStarted = new Promise<void>((resolve) => {
      resolveRequestStarted = resolve;
    });
    const responseReleased = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });

    await page.route(signInEndpoint, async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      resolveRequestStarted();
      await responseReleased;
      await route.fulfill({
        status: 200,
        json: {
          redirect: false,
          token: "test-session-token",
          url: null,
          user: { id: "test-user", username: "kitchen.staff" },
        },
      });
    });

    try {
      await page.goto("/");
      const form = page.getByRole("form", {
        name: "Masanao staff sign in",
        exact: true,
      });
      await expect(form).toHaveAttribute("data-client-ready", "true");
      await form.getByLabel("Username", { exact: true }).fill("kitchen.staff");
      await form
        .getByLabel("Password", { exact: true })
        .fill(staffPassword);

      const submit = form.getByRole("button", { name: "Sign in", exact: true });
      await submit.click();
      await requestStarted;
      await expect(form).toHaveAttribute("aria-busy", "true");
      await expect(form.getByRole("button", { name: /Signing in…/ })).toBeDisabled();
      releaseResponse();
      await expect(page).toHaveURL(/\/overview$/);
    } finally {
      releaseResponse();
    }
  });

  test("keeps authorization, service, and network login failures distinct", async ({
    page,
  }) => {
    let mode: "forbidden" | "server" | "network" = "forbidden";
    await page.route(signInEndpoint, async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      if (mode === "network") {
        await route.abort("failed");
        return;
      }

      await route.fulfill({
        status: mode === "forbidden" ? 403 : 500,
        json: { message: "simulated failure" },
      });
    });

    try {
      for (const scenario of [
        {
          name: "forbidden" as const,
          expected: "not authorized to use this workspace",
        },
        {
          name: "server" as const,
          expected: "sign-in service is unavailable",
        },
        {
          name: "network" as const,
          expected: "couldn't reach the sign-in service",
        },
      ]) {
        mode = scenario.name;
        await page.goto("/");
        const form = page.getByRole("form", {
          name: "Masanao staff sign in",
          exact: true,
        });
        await expect(form).toHaveAttribute("data-client-ready", "true");
        await form.getByLabel("Username", { exact: true }).fill("failure.staff");
        await form.getByLabel("Password", { exact: true }).fill("wrong-password");
        await form.getByLabel("Password", { exact: true }).press("Enter");
        await expect(form.getByRole("alert")).toContainText(scenario.expected);
      }
    } finally {
      await page.unroute(signInEndpoint);
    }
  });
});
