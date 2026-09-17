"use client";

import type { ComponentProps } from "react";

import CatalogPagination, {
  getCatalogResultsSummary,
} from "@/components/workspace/catalog-pagination";

export const getActivityResultsSummary = getCatalogResultsSummary;

type ActivityPaginationProps = ComponentProps<typeof CatalogPagination>;

export default function ActivityPagination(
  props: ActivityPaginationProps,
) {
  return <CatalogPagination {...props} />;
}
