"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";

export default function ActivityDesignPagination({
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
  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-3 pt-2 text-body-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-body-sm text-muted-foreground" aria-live="polite">
        Showing {start} to {end} of {total} results
      </p>
      <Pagination className="mx-0 w-auto justify-start sm:justify-end">
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
              <ChevronLeft />
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
              <ChevronRight />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
