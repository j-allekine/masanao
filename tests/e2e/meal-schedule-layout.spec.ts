import { expect, test } from "@playwright/test";
import Database from "better-sqlite3";
import { cleanupIssuanceFixtures } from "./issuance-fixture-cleanup";
import { postFixtureSignIn } from "./fixture-auth";

const activity = "/activity-designs/e2e-issuance-layout-design/activities/e2e-issuance-layout-activity";
const meal = `${activity}/meal-schedules/e2e-issuance-layout-meal`;
test.beforeAll(() => {
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  db.exec(`
    INSERT INTO activity_design (id,activityDesignNo,fiscalYear,title,createdAt,updatedAt) VALUES ('e2e-issuance-layout-design','AD-LAYOUT',2026,'Kitchen preparation',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO activity (id,activityDesignId,name,officeName,venue,scheduledDate,plannedParticipantCount,createdAt,updatedAt) VALUES ('e2e-issuance-layout-activity','e2e-issuance-layout-design','Community kitchen','Kitchen','Municipal hall',CURRENT_TIMESTAMP,75,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO meal_schedule (id,activityId,label,mealTime,createdAt,updatedAt) VALUES ('e2e-issuance-layout-meal','e2e-issuance-layout-activity','Lunch','12:00',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
    INSERT INTO purchase_order (id,purchaseOrderNo,normalizedPurchaseOrderNo,vendorId,createdAt,updatedAt) VALUES ('e2e-issuance-layout-po','PO-LAYOUT','po-layout','e2e-vendor-acme',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
  `);
  db.close();
});
test.afterAll(cleanupIssuanceFixtures);

test("long Meal Schedule breadcrumbs wrap without hiding controls at narrow widths", async ({ page }) => {
  test.setTimeout(120_000);
  const designNo = `AD-${"2026".repeat(20)}`;
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  db.prepare("UPDATE activity_design SET activityDesignNo=? WHERE id='e2e-issuance-layout-design'").run(designNo);
  db.close();
  try {
    expect((await postFixtureSignIn(page.request, { data: { username: "kitchen.staff", password: "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
    await page.goto(meal);
    await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
    for (const width of [320, 406, 768, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByRole("link", { name: designNo, exact: true })).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.getByRole("button", { name: "Post issuance", exact: true })).toBeInViewport();
    }
  } finally {
    const restore = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
    restore.prepare("UPDATE activity_design SET activityDesignNo='AD-LAYOUT' WHERE id='e2e-issuance-layout-design'").run();
    restore.close();
  }
});

test("one Meal Schedule workspace preserves breadcrumbs, details, legacy links and guarded navigation", async ({ page }, info) => {
  test.setTimeout(120_000);
  expect((await postFixtureSignIn(page.request, { data: { username: "kitchen.staff", password: "correct-horse-battery-staple" }, headers: { origin: process.env.BETTER_AUTH_URL! } })).status()).toBe(200);
  for (const [path, heading, screenshot] of [
    [activity, "Community kitchen", "01-activity-record.png"],
    ["/purchase-orders/e2e-issuance-layout-po", "PO-LAYOUT", "02-purchase-order.png"],
    ["/recipes", "Recipes", "03-recipe-catalog.png"],
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    await page.screenshot({ path: info.outputPath(screenshot), fullPage: true, animations: "disabled" });
  }
  await page.goto(`${meal}/issuance`);
  await expect(page).toHaveURL(new RegExp(`${meal}$`));
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lunch · 12:00", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Community kitchen", exact: true })).toHaveAttribute("href", activity);
  await expect(page.getByRole("link", { name: "Open issuance draft", exact: true })).toHaveCount(0);
  await expect(page.getByText("Meal Schedule context", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Municipal hall", { exact: true })).toHaveCount(0);
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const trigger = page.getByRole("button", { name: "Additional details", exact: true });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const details = page.locator('[data-slot="collapsible-content"]');
    await expect(details.getByText("Municipal hall", { exact: true })).toBeVisible();
    await expect(details.getByText("Kitchen", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`04-meal-details-${width}.png`), fullPage: true, animations: "disabled" });
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();
    await expect(page.getByRole("button", { name: "Post issuance", exact: true })).toBeInViewport();
    await page.screenshot({ path: info.outputPath(`05-meal-workspace-${width}.png`), fullPage: true, animations: "disabled" });
  }
  await page.getByRole("textbox", { name: "Meal pax", exact: true }).fill("80");
  await page.getByRole("link", { name: "Community kitchen", exact: true }).click();
  const discard = page.getByRole("dialog", { name: "Discard unsaved changes?" });
  await expect(discard).toBeVisible();
  await discard.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Meal pax", exact: true })).toHaveValue("80");
  await page.getByRole("link", { name: "Community kitchen", exact: true }).click();
  await discard.getByRole("button", { name: "Discard changes", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${activity}$`));
});

test("a long draft and posted meal retain identity while the working body scrolls", async ({ page }, info) => {
  test.setTimeout(120_000);
  const itemCount = 24;
  const itemName = (number: number) => `Layout pantry supply ${String(number).padStart(2, "0")}`;
  const label = "Community kitchen luncheon for municipal operations and emergency response volunteer training";
  const title = `${label} \u00b7 12:00`;
  const db = new Database(process.env.MASANAO_E2E_DATABASE_PATH!);
  try {
    db.transaction(() => {
      db.prepare("UPDATE meal_schedule SET label=? WHERE id='e2e-issuance-layout-meal'").run(label);
      db.exec(`
        INSERT INTO issuance_record (id,mealScheduleId,mealPax,createdAt,updatedAt) VALUES ('e2e-issuance-layout-draft','e2e-issuance-layout-meal',75,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
        INSERT INTO delivery_receipt (id,purchaseOrderId,vendorId,vendorName,purchaseOrderNo,receiptNo,normalizedReceiptNo,receiptDate,postedAt) VALUES ('e2e-issuance-layout-receipt','e2e-issuance-layout-po','e2e-vendor-acme','Acme Foods','PO-LAYOUT','DR-LAYOUT','dr-layout',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
      `);
      const item = db.prepare(`INSERT INTO item (id,name,normalizedName,categoryId,baseUnitId,reorderLevel,isActive,createdAt,updatedAt)
        VALUES (?,?,?,'default-category-staples-dry-goods','default-unit-piece','0',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`);
      const stock = db.prepare(`INSERT INTO issuance_stock_item (id,issuanceRecordId,itemId,itemName,enteredQuantity,conversionFactor,selectedUnitId,selectedUnitName,selectedUnitAbbreviation,baseUnitId,baseUnitName,baseUnitAbbreviation)
        VALUES (?,'e2e-issuance-layout-draft',?,?,'1','1','default-unit-piece','Piece','pc','default-unit-piece','Piece','pc')`);
      const receiptLine = db.prepare(`INSERT INTO delivery_receipt_line (id,deliveryReceiptId,itemId,selectedUnitId,baseUnitId,itemName,selectedUnitName,baseUnitName,enteredQuantity,conversionFactor,calculatedBaseUnitQuantity)
        VALUES (?,'e2e-issuance-layout-receipt',?,'default-unit-piece','default-unit-piece',?,'Piece','Piece','10','1','10')`);
      const movement = db.prepare(`INSERT INTO inventory_ledger_movement (id,deliveryReceiptLineId,itemId,baseUnitId,quantity,movementType,occurredAt)
        VALUES (?,?,?,'default-unit-piece','10','stock-in',CURRENT_TIMESTAMP)`);
      for (let number = 1; number <= itemCount; number++) {
        const suffix = String(number).padStart(2, "0");
        const itemId = `e2e-issuance-layout-item-${suffix}`;
        const lineId = `e2e-issuance-layout-receipt-${suffix}`;
        item.run(itemId, itemName(number), itemName(number).toLowerCase());
        stock.run(`e2e-issuance-layout-stock-${suffix}`, itemId, itemName(number));
        receiptLine.run(lineId, itemId, itemName(number));
        movement.run(`e2e-issuance-layout-in-${suffix}`, lineId, itemId);
      }
    })();
  } finally {
    db.close();
  }

  expect((await postFixtureSignIn(page.request, {
    data: { username: "municipal.admin", password: "administrator-password" },
    headers: { origin: process.env.BETTER_AUTH_URL! },
  })).status()).toBe(200);
  await page.goto(meal);
  await expect(page.locator('[data-issuance-ready="true"]')).toBeVisible();

  const heading = page.getByRole("heading", { name: title, level: 1, exact: true });
  const sidebar = page.getByRole("main").getByRole("button", { name: "Toggle Sidebar", exact: true });
  const pax = page.getByRole("textbox", { name: "Meal pax", exact: true });
  const review = page.getByRole("button", { name: "Review", exact: true });
  const save = page.getByRole("button", { name: "Save draft", exact: true });
  const post = page.getByRole("button", { name: "Post issuance", exact: true });
  const lastStock = page.getByRole("button", { name: `Actions for Stock item ${itemName(itemCount)}`, exact: true });
  const viewports = [
    { width: 1280, height: 720 }, { width: 1024, height: 768 }, { width: 768, height: 1024 },
    { width: 390, height: 640 }, { width: 320, height: 640 }, { width: 320, height: 480 },
  ];

  await pax.fill("76");
  await expect(save).toBeEnabled();
  await expect(page.getByRole("main")).toHaveCount(1);
  const footer = page.locator("footer").filter({ has: review });
  const discardChanges = footer.getByRole("button", { name: "Discard changes", exact: true });
  for (const { width, height } of viewports) {
    await page.setViewportSize({ width, height });
    await expect(review).toHaveText("Review");
    await expect(footer.getByRole("button")).toHaveText(["Discard changes", "Review", "Save draft", "Post issuance"]);
    await discardChanges.focus();
    for (const action of [review, save, post]) {
      await page.keyboard.press("Tab");
      await expect(action).toBeFocused();
      await expect(action).toBeInViewport({ ratio: 1 });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (width >= 768) {
      const footerBox = (await footer.boundingBox())!;
      const postBox = (await post.boundingBox())!;
      expect(footerBox.x + footerBox.width - postBox.x - postBox.width).toBeLessThanOrEqual(24);
    }
    await pax.scrollIntoViewIfNeeded();
    await expect(pax).toBeInViewport({ ratio: 1 });
    await expect(pax).toHaveValue("76");
    await expect(lastStock).not.toBeInViewport();
    for (const number of [Math.floor(itemCount / 2), itemCount]) {
      const rowAction = page.getByRole("button", { name: `Actions for Stock item ${itemName(number)}`, exact: true });
      await rowAction.scrollIntoViewIfNeeded();
      await expect(rowAction).toBeInViewport({ ratio: 1 });
      for (const fixed of [heading, sidebar, review, save, post]) await expect(fixed).toBeInViewport({ ratio: 1 });
      expect(await page.evaluate(() => scrollY)).toBe(0);
    }
    await expect(pax).not.toBeInViewport();
    await page.screenshot({ path: info.outputPath(`draft-scrolled-${width}x${height}.png`), animations: "disabled" });
  }

  const enlarged = await page.addStyleTag({ content: "html { font-size: 150%; } body { letter-spacing: .02em; }" });
  await lastStock.scrollIntoViewIfNeeded();
  await expect(lastStock).toBeInViewport({ ratio: 1 });
  await save.scrollIntoViewIfNeeded();
  await expect(save).toBeInViewport({ ratio: 1 });
  const fullTitle = page.getByRole("button", { name: "Show full title", exact: true });
  await fullTitle.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: title, exact: true })).toHaveText(title);
  await page.keyboard.press("Escape");
  await expect(fullTitle).toBeFocused();
  await page.screenshot({ path: info.outputPath("draft-scrolled-enlarged.png"), animations: "disabled" });
  await enlarged.evaluate((style) => { style.textContent = "html { font-size: 200%; } body { letter-spacing: .02em; }"; });
  await lastStock.scrollIntoViewIfNeeded();
  await expect(lastStock).toBeInViewport({ ratio: 1 });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  await expect(heading).toBeInViewport();
  await save.scrollIntoViewIfNeeded();
  await expect(save).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: info.outputPath("draft-scrolled-200-percent.png"), animations: "disabled" });
  await enlarged.evaluate((style) => { style.parentNode?.removeChild(style); });

  await post.click();
  const confirmation = page.getByRole("dialog", { name: "Post issuance?", exact: true });
  await confirmation.getByRole("button", { name: "Confirm and post issuance", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Issuance posted");

  const lastIssued = page.getByText(itemName(itemCount), { exact: true });
  const totals = page.getByRole("button", { name: "View issued totals", exact: true });
  for (const { width, height } of viewports) {
    await page.setViewportSize({ width, height });
    await totals.scrollIntoViewIfNeeded();
    await expect(totals).toBeInViewport({ ratio: 1 });
    await expect(lastIssued).not.toBeInViewport();
    await lastIssued.scrollIntoViewIfNeeded();
    await expect(lastIssued).toBeInViewport({ ratio: 1 });
    await expect(heading).toBeInViewport({ ratio: 1 });
    await expect(sidebar).toBeInViewport({ ratio: 1 });
    await expect(page.getByText("Posted", { exact: true })).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await page.screenshot({ path: info.outputPath(`posted-scrolled-${width}x${height}.png`), animations: "disabled" });
  }
});
