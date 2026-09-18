import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  getCatalogPageItems,
  getCatalogResultsSummary,
  getMobileCatalogPageItems,
} from "@/components/workspace/catalog-pagination";
import ActivityPagination, {
  getActivityResultsSummary,
} from "@/features/activity-planning/components/activity-pagination";

function renderPagination({
  page,
  pageCount,
  start,
  end,
  total,
}: {
  page: number;
  pageCount: number;
  start: number;
  end: number;
  total: number;
}) {
  return renderToStaticMarkup(
    createElement(ActivityPagination, {
      page,
      pageCount,
      start,
      end,
      total,
      onPageChange: vi.fn(),
    }),
  );
}

function getButtons(markup: string, label: string) {
  return markup.match(
    new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`, "g"),
  ) ?? [];
}

describe("Activities pagination", () => {
  it("keeps the feature summary export compatible with the canonical summary", () => {
    expect(getActivityResultsSummary).toBe(getCatalogResultsSummary);
    expect(
      getActivityResultsSummary({ start: 11, end: 12, total: 12 }),
    ).toBe("Showing 11 to 12 of 12 results");
  });

  it("keeps desktop page choices to the current three-page window", () => {
    expect(getCatalogPageItems(6, 12)).toEqual([
      "ellipsis-start",
      5,
      6,
      7,
      "ellipsis-end",
    ]);

    const markup = renderPagination({
      page: 6,
      pageCount: 12,
      start: 51,
      end: 60,
      total: 120,
    });

    expect(markup).toContain('aria-label="Page 5 of 12"');
    expect(markup).toContain('aria-label="Page 6 of 12"');
    expect(markup).toContain('aria-label="Page 7 of 12"');
    expect(markup).toContain("More pages");
    expect(markup).toContain(
      'aria-live="polite">Showing 51 to 60 of 120 results',
    );
  });

  it("caps mobile navigation at three page choices", () => {
    expect(getMobileCatalogPageItems(1, 12)).toEqual([1, 2, 12]);
    expect(getMobileCatalogPageItems(6, 12)).toEqual([1, 6, 12]);
    expect(getMobileCatalogPageItems(12, 12)).toEqual([1, 11, 12]);

    const markup = renderPagination({
      page: 6,
      pageCount: 12,
      start: 51,
      end: 60,
      total: 120,
    });

    expect(markup).toContain("sm:hidden");
    expect(markup).toContain("hidden sm:flex");
  });

  it.each([
    { page: 1, pageCount: 3, disabledLabel: "Previous page" },
    { page: 3, pageCount: 3, disabledLabel: "Next page" },
  ])(
    "disables the correct boundary control on page $page",
    ({ page, pageCount, disabledLabel }) => {
      const markup = renderPagination({
        page,
        pageCount,
        start: page,
        end: page,
        total: pageCount,
      });
      const disabledButtons = getButtons(markup, disabledLabel);

      expect(disabledButtons).toHaveLength(2);
      expect(
        disabledButtons.every((button) => button.includes("disabled")),
      ).toBe(true);
    },
  );

  it("marks the current page and keeps pagination controls keyboard-semantic", () => {
    const markup = renderPagination({
      page: 2,
      pageCount: 3,
      start: 11,
      end: 20,
      total: 25,
    });

    expect(markup.match(/aria-current="page"/g)).toHaveLength(2);
    expect(markup).toContain('aria-label="Page 2 of 3"');
    expect(markup.match(/<button[^>]*type="button"[^>]*>/g)?.length).toBe(10);
    expect(markup).not.toContain('aria-current="true"');
  });

  it("renders only the polite no-results summary without navigation controls", () => {
    const markup = renderPagination({
      page: 1,
      pageCount: 1,
      start: 0,
      end: 0,
      total: 0,
    });

    expect(markup).toBe(
      '<p class="pt-2 text-body-sm text-muted-foreground" aria-live="polite">No results</p>',
    );
    expect(markup).not.toContain('role="navigation"');
    expect(markup).not.toContain("Previous page");
    expect(markup).not.toContain("Next page");
  });
});
