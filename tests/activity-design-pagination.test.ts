import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import CatalogPagination, {
  getCatalogPageItems,
  getCatalogResultsSummary,
  getMobileCatalogPageItems,
} from "@/components/workspace/catalog-pagination";
import ActivityDesignPagination, {
  getActivityDesignResultsSummary,
} from "@/features/activity-planning/components/activity-design-pagination";

const defaultPaginationProps = {
  page: 6,
  pageCount: 12,
  start: 51,
  end: 60,
  total: 120,
  onPageChange: () => {},
};

function renderActivityDesignPagination(
  props: Partial<typeof defaultPaginationProps> = {},
) {
  return renderToStaticMarkup(
    ActivityDesignPagination({ ...defaultPaginationProps, ...props }),
  );
}

describe("Activity Designs pagination adapter", () => {
  it("reuses the canonical paginator and summary API", () => {
    expect(ActivityDesignPagination).toBe(CatalogPagination);
    expect(getActivityDesignResultsSummary).toBe(getCatalogResultsSummary);
  });

  it("keeps desktop page choices direct while using ellipses for long ranges", () => {
    expect(getCatalogPageItems(6, 12)).toEqual([
      1,
      "ellipsis-start",
      5,
      6,
      7,
      "ellipsis-end",
      12,
    ]);
  });

  it("limits mobile page choices to three numbers", () => {
    expect(getMobileCatalogPageItems(1, 12)).toEqual([1, 2, 12]);
    expect(getMobileCatalogPageItems(6, 12)).toEqual([1, 6, 12]);
    expect(getMobileCatalogPageItems(12, 12)).toEqual([1, 11, 12]);
    expect(getMobileCatalogPageItems(6, 12)).toHaveLength(3);
  });

  it("renders summary, current-page state, boundaries, and keyboard-safe controls", () => {
    const firstPage = renderActivityDesignPagination({ page: 1 });
    const lastPage = renderActivityDesignPagination({ page: 12 });

    expect(firstPage).toContain(
      "Showing 51 to 60 of 120 results",
    );
    expect(firstPage).toMatch(
      /<button(?=[^>]*aria-label="Previous page")(?=[^>]*disabled)[^>]*>/,
    );
    expect(lastPage).toMatch(
      /<button(?=[^>]*aria-label="Next page")(?=[^>]*disabled)[^>]*>/,
    );
    expect(lastPage).toMatch(
      /<button(?=[^>]*aria-label="Page 12 of 12")(?=[^>]*aria-current="page")(?=[^>]*type="button")[^>]*>12<\/button>/,
    );
    expect(lastPage).toMatch(
      /<button(?=[^>]*aria-label="Next page")(?=[^>]*type="button")[^>]*>/,
    );
  });

  it("does not render navigation controls when there are no results", () => {
    const emptyState = renderActivityDesignPagination({
      page: 1,
      pageCount: 1,
      start: 0,
      end: 0,
      total: 0,
    });

    expect(emptyState).toContain("No results");
    expect(emptyState).not.toContain('aria-label="Previous page"');
    expect(emptyState).not.toContain('aria-label="Next page"');
    expect(emptyState).not.toContain('role="navigation"');
  });
});

describe("Activity Designs results summary", () => {
  it("uses zero-result copy without a stale range", () => {
    expect(
      getActivityDesignResultsSummary({ start: 0, end: 0, total: 0 }),
    ).toBe("No results");
  });

  it("uses singular copy for one filtered result", () => {
    expect(
      getActivityDesignResultsSummary({ start: 1, end: 1, total: 1 }),
    ).toBe("Showing 1 result");
  });

  it("keeps the filtered range for a multi-result final page", () => {
    expect(
      getActivityDesignResultsSummary({ start: 11, end: 11, total: 11 }),
    ).toBe("Showing 11 to 11 of 11 results");
  });

  it("formats operational counts with thousands separators", () => {
    expect(
      getActivityDesignResultsSummary({
        start: 1001,
        end: 1010,
        total: 1010,
      }),
    ).toBe("Showing 1,001 to 1,010 of 1,010 results");
  });
});
