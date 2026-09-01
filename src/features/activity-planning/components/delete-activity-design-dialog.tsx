"use client";

import { useState, useTransition } from "react";
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

import { deleteActivityDesignAction } from "../actions";
import type { ActivityDesignListItem } from "../types";

function blockedMessage(activityCount: number) {
  return `This Activity Design cannot be deleted because it contains ${activityCount} ${activityCount === 1 ? "Activity" : "Activities"}.`;
}

export default function DeleteActivityDesignDialog({
  activityDesign,
  open,
  onOpenChange,
  onDeleted,
}: {
  activityDesign: ActivityDesignListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const [serverActivityCount, setServerActivityCount] = useState<number | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const activityCount = serverActivityCount ?? activityDesign.activityCount;
  const isBlocked = activityCount > 0;

  function handleDelete() {
    setError(null);

    startDeleteTransition(async () => {
      try {
        const result = await deleteActivityDesignAction(activityDesign.id);

        if (result.status === "error") {
          if (result.kind === "has-activities") {
            setServerActivityCount(result.activityCount ?? 0);
          } else {
            setError(result.error);
          }
          return;
        }

        onOpenChange(false);
        onDeleted();
      } catch {
        setError(
          "The Activity Design could not be deleted. Check your connection and try again.",
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
              ? `Activity Design “${activityDesign.title}” cannot be deleted`
              : `Delete “${activityDesign.title}”?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBlocked
              ? blockedMessage(activityCount)
              : "This permanently removes the planning context. It can only be deleted while it has no Activities."}
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
              {isDeleting ? "Deleting…" : "Delete Activity Design"}
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
