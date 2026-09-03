"use client";

import { useState, useTransition, type MouseEvent } from "react";
import { Trash2 } from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";

import { deleteActivityAction } from "../actions";
import type { ActivityWorkspaceListItem } from "../types";

function blockedMessage(mealScheduleCount: number) {
  return `This Activity cannot be deleted while it has ${mealScheduleCount} ${mealScheduleCount === 1 ? "Meal Schedule" : "Meal Schedules"}. Remove its Meal Schedules first.`;
}

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
  const isBlocked = isServerBlocked || mealScheduleCount > 0;

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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isBlocked
              ? `Activity “${activity.name}” cannot be deleted`
              : `Delete “${activity.name}”?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBlocked
              ? blockedMessage(mealScheduleCount)
              : "This permanently removes the Activity and its planning details. It can only be deleted while it has no Meal Schedules."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Deletion failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {isBlocked ? "Close" : "Cancel"}
          </AlertDialogCancel>
          {!isBlocked ? (
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Trash2 data-icon="inline-start" />
              )}
              {isDeleting ? "Deleting…" : "Delete Activity"}
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
