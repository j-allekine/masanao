"use client";

import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export type ListEmptyStateAction = {
  label: string;
  onClick: () => void;
  variant?: ComponentProps<typeof Button>["variant"];
};

export type ListEmptyStateContent = {
  title: string;
  description: string;
  action?: ListEmptyStateAction;
};

export type ListEmptyStateProps = {
  icon: ReactNode;
  hasFilters: boolean;
  filteredState: ListEmptyStateContent;
  emptyState: ListEmptyStateContent;
};

export function ListEmptyState({
  icon,
  hasFilters,
  filteredState,
  emptyState,
}: ListEmptyStateProps) {
  const state = hasFilters ? filteredState : emptyState;

  return (
    <Empty className="min-h-60 rounded-lg border">
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>{state.title}</EmptyTitle>
        <EmptyDescription>{state.description}</EmptyDescription>
      </EmptyHeader>
      {state.action ? (
        <EmptyContent>
          <Button
            type="button"
            variant={state.action.variant}
            onClick={state.action.onClick}
          >
            {state.action.label}
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}

export default ListEmptyState;
