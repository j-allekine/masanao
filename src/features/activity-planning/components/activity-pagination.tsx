"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";

const countFormatter = new Intl.NumberFormat("en-US");

export function getActivityResultsSummary({
  start,
  end,
  total,
}: {
  start: number;
  end: number;
  total: number;
}) {
  if (total === 0) return "No results";
  if (total === 1) return "Showing 1 result";

  return `Showing ${countFormatter.format(start)} to ${countFormatter.format(end)} of ${countFormatter.format(total)} results`;
}

export default function ActivityPagination({
  page,
  pageCount,
  start,
  end,
  total,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  start: number;
  end: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const resultsSummary = getActivityResultsSummary({ start, end, total });

  if (total === 0) {
    return (
      <p className="pt-2 text-body-sm text-muted-foreground" aria-live="polite">
        {resultsSummary}
      </p>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 pt-2 text-body-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="min-w-0 text-body-sm text-muted-foreground" aria-live="polite">
        {resultsSummary}
      </p>
      <Pagination className="mx-0 w-full shrink-0 justify-start sm:w-auto sm:justify-end">
        <PaginationContent>
          <PaginationItem>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={page === 1}
              aria-label="Previous page"
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
          </PaginationItem>
          <PaginationItem>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`Page ${page} of ${pageCount}`}
              aria-current="page"
              disabled
              className="border-primary text-primary"
            >
              {page}
            </Button>
          </PaginationItem>
          <PaginationItem>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={page === pageCount}
              aria-label="Next page"
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
