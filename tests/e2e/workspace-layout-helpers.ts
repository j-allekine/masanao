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
  await expect.poll(() => page.evaluate(async (target) => {
    // Resize and table measurement can settle on a later frame.
    const scroller = document.scrollingElement!;
    const position = Math.floor((scroller.scrollHeight - scroller.clientHeight) * target);
    window.scrollTo(0, position);
    await new Promise(requestAnimationFrame);
    return scrollY >= position - 1;
  }, fraction)).toBe(true);
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


export async function expectFullRecordHeading(page: Page, title: string) {
  const heading = page.getByRole("heading", { name: title, level: 1, exact: true });
  await expect(heading).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Show full title", exact: true })).toHaveCount(0);
  await expect.poll(() => heading.evaluate((element) =>
    element.scrollHeight <= element.clientHeight &&
    element.scrollWidth <= element.clientWidth &&
    document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);
  return heading;
}
