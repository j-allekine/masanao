import Database from "better-sqlite3";
import { expect, test } from "@playwright/test";

const id = "e2e-design-interactions";
const title = "Design interaction verification";
const record = `/activity-designs/${id}`;

test.use({ hasTouch: true });

test.beforeAll(() => {
  const database = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    database.prepare(
      "INSERT INTO activity_design (id, activityDesignNo, title, fiscalYear, aipReferenceCode, createdAt, updatedAt) VALUES (?, ?, ?, 2026, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
    ).run(id, "DESIGN-INTERACTIONS", title, "AIP-INTERACTIONS");
  } finally {
    database.close();
  }
});

test.afterAll(() => {
  const database = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    database.prepare("DELETE FROM activity_design WHERE id = ?").run(id);
  } finally {
    database.close();
  }
});

test.beforeEach(async ({ page }) => {
  const response = await page.request.post("/api/auth/sign-in/username", {
    data: { username: "kitchen.staff", password: "correct-horse-battery-staple" },
    headers: { origin: process.env.BETTER_AUTH_URL! },
  });
  expect(response.status()).toBe(200);
});

test("Design disclosure supports touch and Space and rejects unsafe return destinations", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(record);
  await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
  const disclosure = page.getByRole("button", { name: "Additional details", exact: true });
  await expect(disclosure).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByText("AIP-INTERACTIONS", { exact: true })).not.toBeVisible();
  await disclosure.tap();
  await expect(disclosure).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("AIP-INTERACTIONS", { exact: true })).toBeVisible();
  await disclosure.focus();
  await page.keyboard.press("Space");
  await expect(disclosure).toHaveAttribute("aria-expanded", "false");
  await expect(disclosure).toBeFocused();
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await expect(page.getByText("Fiscal year: 2026", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Activities (0)", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create Activity", exact: true })).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("design-empty-touch-320.png"), fullPage: true });

  for (const destination of ["https://example.com/activities", "//example.com/activities", "/recipes"]) {
    await page.goto(`${record}?${new URLSearchParams({ planningReturn: destination })}`);
    await expect(page.getByRole("link", { name: "Activity Designs", exact: true })).toHaveAttribute("href", "/activity-designs");
  }
});

test("Design edit retains fields through pending and failed save, then saves and restores action focus", async ({ page }, info) => {
  await page.goto("/activity-designs");
  await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
  await page.getByRole("searchbox", { name: "Search Activity Designs", exact: true }).fill(title);
  const actions = page.getByRole("button", { name: `Actions for ${title}`, exact: true });
  await actions.click();
  await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const titleInput = dialog.getByRole("textbox", { name: "Title", exact: true });
  await expect(titleInput).toHaveValue(title);
  await expect(dialog.getByRole("textbox", { name: "Activity Design No.", exact: true })).toHaveValue("DESIGN-INTERACTIONS");
  await expect(dialog.getByRole("button", { name: "Fiscal Year", exact: true })).toContainText("2026");
  await expect(dialog.getByRole("textbox", { name: "AIP Reference Code", exact: true })).toHaveValue("AIP-INTERACTIONS");
  await titleInput.fill(`${title} updated`);

  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/activity-designs*", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await pending;
    await route.abort("failed");
  });
  try {
    await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(dialog.getByRole("form", { name: "Edit Activity Design", exact: true })).toHaveAttribute("aria-busy", "true");
    await expect(dialog.getByRole("button", { name: "Loading Saving…", exact: true })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(dialog).toBeVisible();
  } finally {
    release();
  }
  await expect(dialog.getByText("The Activity Design could not be saved. Check your connection and try again.", { exact: true })).toBeVisible();
  await expect(titleInput).toHaveValue(`${title} updated`);
  await page.screenshot({ path: info.outputPath("design-edit-save-error.png"), fullPage: true });
  await page.unrouteAll({ behavior: "wait" });
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const updatedActions = page.getByRole("button", { name: `Actions for ${title} updated`, exact: true });
  await expect(updatedActions).toBeFocused();
  await page.reload();
  await expect(page.getByRole("link", { name: `${title} updated`, exact: true })).toBeVisible();
});
