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
  try {
    await page.goBack({ waitUntil: "domcontentloaded" });
  } catch (error) {
    // Restoring the editor entry can supersede the original navigation.
    if (!(error instanceof Error) || !error.message.includes("net::ERR_ABORTED")) throw error;
  }
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
