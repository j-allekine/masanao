"use client";

import { useState, useTransition } from "react";

import DestructiveDialog from "@/components/workspace/destructive-dialog";

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
    <DestructiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        isBlocked
          ? `Activity Design “${activityDesign.title}” cannot be deleted`
          : `Delete “${activityDesign.title}”?`
      }
      description={
        isBlocked
          ? blockedMessage(activityCount)
          : "This permanently removes the planning context. It can only be deleted while it has no Activities."
      }
      error={error}
      isPending={isDeleting}
      onConfirm={isBlocked ? undefined : handleDelete}
      confirmLabel="Delete Activity Design"
      pendingLabel="Deleting…"
      cancelLabel={isBlocked ? "Close" : "Cancel"}
    />
  );
}
