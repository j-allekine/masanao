import { expect, test, type Page, type TestInfo } from "@playwright/test";

const adminPassword = "administrator-password";
const staffPassword = "correct-horse-battery-staple";

async function signIn(page: Page, username: string, password: string) {
  const response = await page.request.post("/api/auth/sign-in/username", {
    data: { username, password },
    headers: {
      origin: process.env.PLAYWRIGHT_TEST_ORIGIN ?? "http://localhost:3019",
    },
  });

  expect(response.status()).toBe(200);
}

async function openMasterData(page: Page, username: string, password: string) {
  await signIn(page, username, password);
  await page.goto("/master-data");
  await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
}

async function createUnit(page: Page, name: string, abbreviation: string) {
  await page.locator("#new-unit").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Name", exact: true }).fill(name);
  await dialog
    .getByRole("textbox", { name: "Abbreviation", exact: true })
    .fill(abbreviation);
  await dialog.getByRole("button", { name: "Create Unit", exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

async function discardUnitDialog(page: Page) {
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
  const discardDialog = page.getByRole("alertdialog");
  await discardDialog
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

async function unitRow(page: Page, name: string) {
  return page.getByRole("row").filter({ hasText: name }).first();
}

async function vendorRow(page: Page, name: string) {
  return page.getByRole("row").filter({ hasText: name }).first();
}

async function captureViewportEvidence(page: Page, testInfo: TestInfo) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/master-data");
  await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("master-data-desktop.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/master-data");
  await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    )
    .toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("master-data-mobile.png"),
    fullPage: true,
  });

  await page.setViewportSize({ width: 1440, height: 900 });
}

test.describe("Master Data Units journey", () => {
  test("lets an administrator maintain Units through the visible workspace", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);

    await openMasterData(page, "municipal.admin", adminPassword);
    await expect(page).toHaveURL(/\/master-data$/);
    await expect(page.getByText("Master Data", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Master Data", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );

    const tabs = page.getByRole("tablist", { name: "Master Data sections" });
    await expect(tabs.getByRole("tab", { name: "Units", exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    for (const tabName of ["Categories", "Offices"]) {
      await expect(tabs.getByRole("tab", { name: tabName, exact: true })).toBeDisabled();
    }
    await expect(tabs.getByRole("tab", { name: "Vendors", exact: true })).toBeEnabled();
    await expect(page.getByText("No Units yet.", { exact: true })).toBeVisible();

    await page.locator("#new-unit").click();
    let dialog = page.getByRole("dialog");
    const nameInput = dialog.getByRole("textbox", { name: "Name", exact: true });
    const abbreviationInput = dialog.getByRole("textbox", {
      name: "Abbreviation",
      exact: true,
    });
    await expect(nameInput).toBeFocused();
    await dialog.getByRole("button", { name: "Create Unit", exact: true }).click();
    await expect(dialog.getByText("Unit name is required", { exact: true })).toBeVisible();
    await expect(nameInput).toBeFocused();

    await nameInput.fill("  Gram  ");
    await abbreviationInput.fill(" g ");
    await dialog.getByRole("button", { name: "Create Unit", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText("Unit “Gram” created", { exact: true })).toBeVisible();
    await expect((await unitRow(page, "Gram"))).toContainText("g");

    await page.locator("#new-unit").click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox", { name: "Name", exact: true }).fill(" gram ");
    await dialog
      .getByRole("textbox", { name: "Abbreviation", exact: true })
      .fill("gram-alt");
    await dialog.getByRole("button", { name: "Create Unit", exact: true }).click();
    await expect(
      dialog.locator("#create-unit-name-error"),
    ).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Name", exact: true })).toHaveValue(
      " gram ",
    );
    await discardUnitDialog(page);

    await createUnit(page, "Kilogram", "kg");
    await page.locator("#new-unit").click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox", { name: "Name", exact: true }).fill("Milliliter");
    await dialog
      .getByRole("textbox", { name: "Abbreviation", exact: true })
      .fill(" G ");
    await dialog.getByRole("button", { name: "Create Unit", exact: true }).click();
    await expect(
      dialog.locator("#create-unit-abbreviation-error"),
    ).toBeVisible();
    await discardUnitDialog(page);

    for (const [name, abbreviation] of [
      ["Milliliter", "mL"],
      ["Liter", "L"],
      ["Piece", "pc"],
      ["Dozen", "doz"],
      ["Pack", "pk"],
      ["Box", "box"],
      ["Bottle", "btl"],
      ["Can", "can"],
      ["Sack", "sack"],
    ]) {
      await createUnit(page, name, abbreviation);
    }

    await expect(page.getByRole("button", { name: "Page 1 of 2", exact: true })).toBeVisible();
    await expect(page.getByText("Showing 1 to 10 of 11 results", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Next page", exact: true }).click();
    await expect(page).toHaveURL(/page=2$/);
    await expect(page.getByRole("button", { name: "Page 2 of 2", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Previous page", exact: true }).click();
    await expect(page).toHaveURL(/master-data(?:\?tab=units)?$/);

    await page.getByRole("searchbox", { name: "Search Units", exact: true }).fill("mL");
    await expect(page).toHaveURL(/search=mL/);
    await expect(await unitRow(page, "Milliliter")).toContainText("mL");
    await expect(page.getByText("Showing 1 result", { exact: true })).toBeVisible();
    await page.getByRole("searchbox", { name: "Search Units", exact: true }).fill("no-such-unit");
    await expect(page.getByText("No Units match your search.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Clear search", exact: true }).click();
    await expect(page.getByRole("searchbox", { name: "Search Units", exact: true })).toBeEmpty();

    const gramRow = await unitRow(page, "Gram");
    await gramRow.getByRole("button", { name: "Actions for Gram", exact: true }).click();
    await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
    dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("textbox", { name: "Name", exact: true })).toHaveValue("Gram");
    await dialog.getByRole("textbox", { name: "Name", exact: true }).fill("Gram Updated");
    await dialog.getByRole("textbox", { name: "Abbreviation", exact: true }).fill("g2");
    await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText("Unit “Gram Updated” updated", { exact: true })).toBeVisible();

    const updatedRow = await unitRow(page, "Gram Updated");
    await updatedRow
      .getByRole("button", { name: "Actions for Gram Updated", exact: true })
      .click();
    await page.getByRole("menuitem", { name: "Deactivate", exact: true }).click();
    await expect(page.getByText("Unit “Gram Updated” deactivated", { exact: true })).toBeVisible();
    await expect(await unitRow(page, "Gram Updated")).toContainText("Inactive");

    await (await unitRow(page, "Gram Updated"))
      .getByRole("button", { name: "Actions for Gram Updated", exact: true })
      .click();
    await page.getByRole("menuitem", { name: "Activate", exact: true }).click();
    await expect(page.getByText("Unit “Gram Updated” activated", { exact: true })).toBeVisible();
    await expect(await unitRow(page, "Gram Updated")).toContainText("Active");

    await (await unitRow(page, "Gram Updated"))
      .getByRole("button", { name: "Actions for Gram Updated", exact: true })
      .click();
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
    const deleteDialog = page.getByRole("alertdialog");
    await expect(deleteDialog).toContainText("Delete “Gram Updated”?");
    await deleteDialog.getByRole("button", { name: "Delete Unit", exact: true }).click();
    await expect(deleteDialog).toHaveCount(0);
    await expect(page.getByText("Unit “Gram Updated” deleted", { exact: true })).toBeVisible();
    await expect(page.getByText("Gram Updated", { exact: true })).toHaveCount(0);

    await captureViewportEvidence(page, testInfo);

    await page.goto("/overview");
    await expect(page.locator('[data-shell-client-ready="true"]')).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("sentinel-overview.png"),
      fullPage: true,
    });
    await page.goto("/activity-designs");
    await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath("sentinel-activity-designs.png"),
      fullPage: true,
    });
  });

  test("keeps an authenticated non-administrator read-only", async ({ page }) => {
    await openMasterData(page, "kitchen.staff", staffPassword);

    await expect(page.getByRole("searchbox", { name: "Search Units", exact: true })).toBeVisible();
    await expect(page.locator("#new-unit")).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: "Actions", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Actions for/ })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Categories", exact: true })).toBeDisabled();
  });
});

test.describe("Master Data Vendors journey", () => {
  test("lets an administrator add and edit Vendors through the visible workspace", async ({
    page,
  }) => {
    await openMasterData(page, "municipal.admin", adminPassword);
    await page.getByRole("tab", { name: "Vendors", exact: true }).click();

    const addButton = page.getByRole("button", {
      name: "Add Vendor",
      exact: true,
    });
    await expect(addButton).toBeVisible();
    await addButton.click();

    let dialog = page.getByRole("dialog");
    const nameInput = dialog.getByRole("textbox", {
      name: "Name",
      exact: true,
    });
    await expect(nameInput).toBeFocused();
    await dialog.getByRole("button", { name: "Add Vendor", exact: true }).click();
    await expect(
      dialog.getByText("Vendor name is required", { exact: true }),
    ).toBeVisible();
    await expect(nameInput).toBeFocused();

    await nameInput.fill("  Demo Vendor  ");
    await dialog
      .getByRole("textbox", { name: "Contact person", exact: true })
      .fill("  Dana Cruz  ");
    await dialog
      .getByRole("textbox", { name: "Contact number", exact: true })
      .fill("   ");
    await dialog
      .getByRole("textbox", { name: "Email", exact: true })
      .fill(" dana@example.test ");
    await dialog
      .getByRole("textbox", { name: "Address", exact: true })
      .fill("  Municipal Market  ");
    await dialog.getByRole("button", { name: "Add Vendor", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByText("Vendor “Demo Vendor” added", { exact: true }),
    ).toBeVisible();
    await expect(await vendorRow(page, "Demo Vendor")).toContainText("Dana Cruz");

    await (await vendorRow(page, "Demo Vendor"))
      .getByRole("button", { name: "Actions for Demo Vendor", exact: true })
      .click();
    await page.getByRole("menuitem", { name: "Deactivate", exact: true }).click();
    await expect(
      page.getByText("Vendor “Demo Vendor” deactivated", { exact: true }),
    ).toBeVisible();
    await expect(await vendorRow(page, "Demo Vendor")).toContainText("Inactive");
    await expect(
      page.getByRole("button", {
        name: "Actions for Demo Vendor",
        exact: true,
      }),
    ).toBeFocused();

    await (await vendorRow(page, "Demo Vendor"))
      .getByRole("button", { name: "Actions for Demo Vendor", exact: true })
      .click();
    await page.getByRole("menuitem", { name: "Activate", exact: true }).click();
    await expect(
      page.getByText("Vendor “Demo Vendor” activated", { exact: true }),
    ).toBeVisible();
    await expect(await vendorRow(page, "Demo Vendor")).toContainText("Active");

    await (await vendorRow(page, "Demo Vendor"))
      .getByRole("button", { name: "Actions for Demo Vendor", exact: true })
      .click();
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
    let deleteDialog = page.getByRole("alertdialog");
    await expect(deleteDialog).toContainText("Delete “Demo Vendor”?");
    await deleteDialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(deleteDialog).toHaveCount(0);
    await expect(await vendorRow(page, "Demo Vendor")).toBeVisible();

    await (await vendorRow(page, "Demo Vendor"))
      .getByRole("button", { name: "Actions for Demo Vendor", exact: true })
      .click();
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
    deleteDialog = page.getByRole("alertdialog");
    await deleteDialog
      .getByRole("button", { name: "Delete Vendor", exact: true })
      .click();
    await expect(deleteDialog).toHaveCount(0);
    await expect(
      page.getByText("Vendor “Demo Vendor” deleted", { exact: true }),
    ).toBeVisible();
    await expect(await vendorRow(page, "Demo Vendor")).toHaveCount(0);
    await expect(
      page.getByRole("button", {
        name: "Actions for Evergreen Produce",
        exact: true,
      }),
    ).toBeFocused();

    await addButton.click();
    dialog = page.getByRole("dialog");
    const duplicateName = dialog.getByRole("textbox", {
      name: "Name",
      exact: true,
    });
    await duplicateName.fill(" acme foods ");
    await dialog.getByRole("button", { name: "Add Vendor", exact: true }).click();
    await expect(
      dialog.getByText("A Vendor with that name already exists.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(duplicateName).toHaveValue(" acme foods ");
    await duplicateName.fill("Second Vendor");
    await dialog.getByRole("button", { name: "Add Vendor", exact: true }).click();
    await expect(dialog).toHaveCount(0);

    const deltaRow = await vendorRow(page, "Delta Grocers");
    await deltaRow
      .getByRole("button", { name: "Actions for Delta Grocers", exact: true })
      .click();
    await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
    dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("textbox", { name: "Name", exact: true }),
    ).toHaveValue("Delta Grocers");
    await dialog
      .getByRole("textbox", { name: "Name", exact: true })
      .fill("Delta Grocers Updated");
    await dialog
      .getByRole("textbox", { name: "Contact person", exact: true })
      .fill("Delta Updated");
    await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByText("Vendor “Delta Grocers Updated” updated", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
    await page.getByRole("tab", { name: "Vendors", exact: true }).click();
    await expect(await vendorRow(page, "Delta Grocers Updated")).toContainText(
      "Delta Updated",
    );
  });

  test(
    "shows the persisted Vendor catalog as read-only",
    async ({ page }, testInfo) => {
      await openMasterData(page, "kitchen.staff", staffPassword);
      await page.getByRole("tab", { name: "Vendors", exact: true }).click();

      await expect(page).toHaveURL(/tab=vendors/);
      await expect(
        page.getByRole("tab", { name: "Vendors", exact: true }),
      ).toHaveAttribute("aria-selected", "true");
      await expect(
        page.getByRole("searchbox", { name: "Search Vendors", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("columnheader", { name: "Actions", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: /Create Vendor/ }),
      ).toHaveCount(0);
      await expect(
        page.getByText(/Showing 1 to 10 of \d+ results/, { exact: true }),
      ).toBeVisible();
      await expect(page.getByText("Inactive", { exact: true })).toBeVisible();

      await page.getByRole("button", { name: "Next page", exact: true }).click();
      await expect(page).toHaveURL(/tab=vendors&page=2$/);
      await expect(
        page.getByRole("button", { name: "Page 2 of 2", exact: true }),
      ).toBeVisible();
      await page.reload();
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
      await expect(
        page.getByText("Kitchen Select", { exact: true }),
      ).toBeVisible();

      await page.goto("/master-data?tab=vendors");
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
      const search = page.getByRole("searchbox", {
        name: "Search Vendors",
        exact: true,
      });
      await search.fill("  aLiCe  ");
      await expect(page).toHaveURL(/tab=vendors&search=/);
      await expect(page.getByText("Acme Foods", { exact: true })).toBeVisible();
      await expect(
        page.getByText("Showing 1 result", { exact: true }),
      ).toBeVisible();
      await search.fill("no-such-vendor");
      await expect(
        page.getByText("No Vendors match your search.", { exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Clear search", exact: true })
        .click();
      await expect(search).toBeEmpty();
      await expect(
        page.getByText("Acme Foods", { exact: true }),
      ).toBeVisible();

      await page.setViewportSize({ width: 1440, height: 900 });
      await page.screenshot({
        path: testInfo.outputPath("master-data-vendors-desktop.png"),
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        )
        .toBe(true);
      await page.screenshot({
        path: testInfo.outputPath("master-data-vendors-mobile.png"),
        fullPage: true,
      });
    },
  );
});
