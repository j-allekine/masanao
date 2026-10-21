import { expect, type Page } from "@playwright/test";

export async function openCatalogFilters(page: Page) {
  const toolbar = page.getByRole("search");
  const expectedLayout = await toolbar.evaluate((element) => element.getBoundingClientRect().width >= 760 ? "inline" : "panel");
  await expect(toolbar).toHaveAttribute("data-filter-layout", expectedLayout);
  const trigger = toolbar.getByRole("button", { name: /^Filters/ });
  if (await trigger.isVisible()) {
    await trigger.click();
    await expect(page.getByRole("dialog", { name: "Filters", exact: true })).toBeVisible();
  }
}

export async function closeCatalogFilters(page: Page) {
  const panel = page.getByRole("dialog", { name: "Filters", exact: true });
  if (await panel.isVisible()) {
    await panel.getByRole("button", { name: "Show results", exact: true }).click();
    await expect(panel).toBeHidden();
  }
}

export async function chooseCatalogFilter(page: Page, label: string, option: string) {
  await openCatalogFilters(page);
  const control = page.getByRole("combobox", { name: label, exact: true });
  await control.click();
  await page.getByRole("option", { name: option, exact: true }).click();
  await expect(control).toContainText(option);
  await closeCatalogFilters(page);
}

export async function resetCatalogFilters(page: Page) {
  await openCatalogFilters(page);
  const panel = page.getByRole("dialog", { name: "Filters", exact: true });
  if (await panel.isVisible()) {
    await panel.getByRole("button", { name: "Reset filters", exact: true }).click();
    await expect(panel).toBeHidden();
  } else {
    await page.getByRole("search").getByRole("button", { name: "Reset", exact: true }).click();
  }
}
