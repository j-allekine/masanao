"use client";

import { useState, useTransition, type MouseEvent } from "react";

import DestructiveDialog from "@/components/workspace/destructive-dialog";

import { deleteActivityAction } from "../actions";
import {
  getActivityDeletionBlockMessage,
  isActivityDeletionBlocked,
} from "../domain/activity-deletion";
import type { ActivityWorkspaceListItem } from "../types";

export default function DeleteActivityDialog({
  activity,
  open,
  onOpenChange,
  onDeleted,
}: {
  activity: ActivityWorkspaceListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const [serverMealScheduleCount, setServerMealScheduleCount] = useState<
    number | null
  >(null);
  const [isServerBlocked, setIsServerBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const mealScheduleCount =
    serverMealScheduleCount ?? activity.mealScheduleCount;
  const isBlocked =
    isServerBlocked || isActivityDeletionBlocked(mealScheduleCount);

  function handleDelete(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    setError(null);

    startDeleteTransition(async () => {
      try {
        const result = await deleteActivityAction(
          activity.activityDesignId,
          activity.id,
        );

        if (result.status === "error") {
          if ("kind" in result && result.kind === "has-meal-schedules") {
            setIsServerBlocked(true);
            setServerMealScheduleCount(result.mealScheduleCount);
          } else {
            setError(result.error);
          }
          return;
        }

        onOpenChange(false);
        onDeleted();
      } catch {
        setError(
          "The Activity could not be deleted. Check your connection and try again.",
        );
      }
    });
  }

  return (
    <DestructiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        isBlocked
          ? `Activity “${activity.name}” cannot be deleted`
          : `Delete “${activity.name}”?`
      }
      description={
        isBlocked
          ? getActivityDeletionBlockMessage(mealScheduleCount)
          : "This permanently removes the Activity and its planning details. It can only be deleted while it has no Meal Schedules."
      }
      error={error}
      isPending={isDeleting}
      onConfirm={isBlocked ? undefined : handleDelete}
      confirmLabel="Delete Activity"
      pendingLabel="Deleting…"
      cancelLabel={isBlocked ? "Close" : "Cancel"}
    />
  );
}
