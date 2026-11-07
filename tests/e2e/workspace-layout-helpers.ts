import { expect, type Locator, type Page } from "@playwright/test";

export const workspaceViewports = [
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 640 },
  { width: 320, height: 640 },
  { width: 320, height: 480 },
];

export async function scrollWorkspaceDocument(page: Page, fraction: number) {
  const scrollRange = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  expect(scrollRange).toBeGreaterThan(50);
  await page.evaluate((position) => window.scrollTo(0, position), Math.floor(scrollRange * fraction));
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThanOrEqual(Math.floor(scrollRange * fraction) - 1);
}

export async function expectPannedColumns(column: Locator, cell: Locator) {
  expect(await column.evaluate((element) => {
    const table = element.closest("table");
    const scroller = table?.parentElement;
    if (!scroller) return 0;
    scroller.scrollLeft = scroller.scrollWidth;
    return scroller.scrollLeft;
  })).toBeGreaterThan(0);
  await expect.poll(async () => Math.abs((await column.boundingBox())!.x - (await cell.boundingBox())!.x)).toBeLessThan(1);
}

