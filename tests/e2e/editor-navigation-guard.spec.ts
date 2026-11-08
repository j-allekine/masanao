import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

import { postFixtureSignIn } from "./fixture-auth";

async function signInAsAdministrator(page: Page) {
  const response = await postFixtureSignIn(page.request, {
    data: { username: "municipal.admin", password: "administrator-password" },
    headers: { origin: process.env.BETTER_AUTH_URL! },
  });
  expect(response.status()).toBe(200);
}

async function goBack(page: Page) {
  // A guarded traversal may stop before any page navigation commits.
  await page.evaluate(() => history.back());
}

test("dirty Recipe survives Back and can be discarded through the workspace sidebar", async ({ page }) => {
  await signInAsAdministrator(page);
  await page.goto("/recipes");
  await page.getByRole("link", { name: "Create Recipe", exact: true }).click();
  await expect(page).toHaveURL(/\/recipes\/new$/);

  const name = page.getByRole("textbox", { name: "Recipe name", exact: true });
  await name.fill("Unsaved Recipe");
  await goBack(page);

  const discard = page.getByRole("alertdialog", { name: "Discard unsaved changes?", exact: true });
  await discard.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(discard).toBeHidden();
  await expect(page).toHaveURL(/\/recipes\/new$/);
  await expect(name).toHaveValue("Unsaved Recipe");

  await page.getByRole("link", { name: "Inventory", exact: true }).click();
  await discard.getByRole("button", { name: "Discard changes", exact: true }).click();
  await expect(page).toHaveURL(/\/inventory$/);
  await goBack(page);
  await expect(page).toHaveURL(/\/recipes\/new$/);
  await expect(name).toHaveValue("");
  await goBack(page);
  await expect(page).toHaveURL(/\/recipes$/);
});

test("editing after Back preserves the Recipe in Forward history", async ({ page, browserName }) => {
  await signInAsAdministrator(page);
  const recipe = "/recipes/e2e-recipe-active";
  const editor = `${recipe}/edit`;
  await page.goto(editor);
  const name = page.getByRole("textbox", { name: "Recipe name", exact: true });
  await expect(name).toHaveValue("Chicken Tinola");

  await page.getByRole("link", { name: "Recipes", exact: true }).click();
  await page.getByRole("link", { name: "Chicken Tinola", exact: true }).click();
  await expect(page).toHaveURL(recipe);
  await page.evaluate(() => history.go(-2));
  await expect(page).toHaveURL(editor);

  const historyLength = await page.evaluate(() => history.length);
  await name.fill("Unsaved Tinola");
  await expect(name).toHaveValue("Unsaved Tinola");
  await expect.poll(() => page.evaluate(() => history.length)).toBe(historyLength);

  // Use Chromium's browser history control for repeated multi-entry traversals.
  const browserSession = browserName === "chromium" ? await page.context().newCDPSession(page) : null;
  async function goForwardToRecipe() {
    if (!browserSession) {
      await page.evaluate(() => history.go(2));
      return;
    }

    const { currentIndex, entries } = await browserSession.send("Page.getNavigationHistory");
    const destination = entries[currentIndex + 2];
    expect(new URL(destination.url).pathname).toBe(recipe);
    await browserSession.send("Page.navigateToHistoryEntry", { entryId: destination.id });
  }

  const discard = page.getByRole("alertdialog", { name: "Discard unsaved changes?", exact: true });
  await goForwardToRecipe();
  await discard.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(discard).toBeHidden();
  await expect(page).toHaveURL(editor);
  await expect(name).toHaveValue("Unsaved Tinola");

  await goForwardToRecipe();
  await discard.getByRole("button", { name: "Discard changes", exact: true }).click();
  await expect(page).toHaveURL(recipe);
});

test("dirty receiving Back can keep entry or resume the Purchase Order", async ({ page }) => {
  const id = randomUUID();
  const number = `PO-GUARD-${id}`;
  const database = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    database.prepare(`INSERT INTO purchase_order
      (id,purchaseOrderNo,normalizedPurchaseOrderNo,vendorId,createdAt,updatedAt)
      VALUES (?,?,?,'e2e-vendor-acme',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).run(id, number, number.toLowerCase());

    await signInAsAdministrator(page);
    await page.goto(`/purchase-orders/${id}`);
    await page.getByRole("link", { name: "Record delivery", exact: true }).click();
    const receiving = page.getByRole("dialog", { name: "Record delivery", exact: true });
    const receipt = receiving.getByRole("textbox", { name: "Receipt number", exact: true });
    await expect(receiving).toBeVisible();
    await receipt.fill("Unsaved receipt");

    const discard = page.getByRole("alertdialog", { name: "Discard changes?", exact: true });
    await goBack(page);
    await discard.getByRole("button", { name: "Keep editing", exact: true }).click();
    await expect(discard).toBeHidden();
    await expect(page).toHaveURL(`/purchase-orders/${id}/record-delivery`);
    await expect(receipt).toHaveValue("Unsaved receipt");

    await goBack(page);
    await discard.getByRole("button", { name: "Discard changes", exact: true }).click();
    await expect(page).toHaveURL(`/purchase-orders/${id}`);
    await expect(receiving).toBeHidden();
    await expect(page.getByText("No Delivery Receipts yet.", { exact: true })).toBeVisible();
  } finally {
    database.prepare("DELETE FROM purchase_order WHERE id = ?").run(id);
    database.close();
  }
});
