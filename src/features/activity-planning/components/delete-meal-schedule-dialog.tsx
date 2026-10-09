"use client";

import { useState, useTransition, type MouseEvent } from "react";

import DestructiveDialog from "@/components/workspace/destructive-dialog";

import { deleteMealScheduleAction } from "../actions";
import type { MealScheduleListItem } from "../types";

export default function DeleteMealScheduleDialog({
  activityDesignId,
  activityId,
  mealSchedule,
  open,
  onOpenChange,
  onDeleted,
}: {
  activityDesignId: string;
  activityId: string;
  mealSchedule: MealScheduleListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleDelete(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    setError(null);

    startDeleteTransition(async () => {
      try {
        const result = await deleteMealScheduleAction(
          activityDesignId,
          activityId,
          mealSchedule.id,
        );

        if (result.status === "error") {
          setError(result.error);
          return;
        }

        onOpenChange(false);
        onDeleted();
      } catch {
        setError(
          "The Meal Schedule could not be deleted. Check your connection and try again.",
        );
      }
    });
  }

  return (
    <DestructiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete “${mealSchedule.label}”?`}
      description="This permanently removes the Meal Schedule and its planning details."
      error={error}
      isPending={isDeleting}
      onConfirm={handleDelete}
      confirmLabel="Delete Meal Schedule"
      pendingLabel="Deleting…"
    />
  );
}
