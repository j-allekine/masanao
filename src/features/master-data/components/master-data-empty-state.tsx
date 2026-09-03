"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function MasterDataEmptyState({
  icon,
  hasFilters,
  filteredState,
  emptyState,
  canCreate,
  createLabel,
  onCreate,
  onClearFilters,
}: {
  icon: ReactNode;
  hasFilters: boolean;
  filteredState: { title: string; description: string };
  emptyState: { title: string; description: string };
  canCreate: boolean;
  createLabel: string;
  onCreate: () => void;
  onClearFilters: () => void;
}) {
  const state = hasFilters ? filteredState : emptyState;

  return (
    <Empty className="min-h-60 rounded-lg border">
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>{state.title}</EmptyTitle>
        <EmptyDescription>{state.description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {hasFilters ? (
          <Button type="button" variant="outline" onClick={onClearFilters}>
            Clear search
          </Button>
        ) : canCreate ? (
          <Button type="button" onClick={onCreate}>
            {createLabel}
          </Button>
        ) : null}
      </EmptyContent>
    </Empty>
  );
}
