"use client";

import { useCallback, useState } from "react";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { ActivityDesignListItem, ActivityListItem } from "../types";
import ActivityForm from "./forms/activity-form";

export default function ActivityCreateDialog({
  activityDesign,
  open,
  onClose,
  onSuccess,
}: {
  activityDesign: ActivityDesignListItem | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (activity: ActivityListItem) => void;
}) {
  const [isDirty, setIsDirty] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);

  const closeDialog = useCallback(() => {
    setIsDiscardDialogOpen(false);
    setIsDirty(false);
    onClose();
  }, [onClose]);

  function requestClose() {
    if (isDirty) {
      setIsDiscardDialogOpen(true);
      return;
    }

    closeDialog();
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) requestClose();
        }}
      >
        {activityDesign ? (
            <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] flex-col gap-4 overflow-hidden sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Activity to “{activityDesign.title}”</DialogTitle>
              <DialogDescription>
                Add an undertaking under this Activity Design. The Activity Design
                context is fixed for this workflow.
              </DialogDescription>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 pt-3 text-label">
                <div>
                  <dt className="text-muted-foreground">Activity Design No.</dt>
                  <dd className="mt-1 font-mono text-mono font-medium">{activityDesign.activityDesignNo}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Fiscal Year</dt>
                  <dd className="mt-1 font-mono text-mono font-medium tabular-nums">FY {activityDesign.fiscalYear}</dd>
                </div>
              </dl>
            </DialogHeader>
            <ActivityForm
              key={activityDesign.id}
              activityDesignId={activityDesign.id}
              layout="dialog"
              onCancel={requestClose}
              onDirtyChange={setIsDirty}
              onSuccess={(activity) => {
                setIsDirty(false);
                onSuccess(activity);
              }}
            />
          </DialogContent>
        ) : null}
      </Dialog>

      <AlertDialog
        open={isDiscardDialogOpen}
        onOpenChange={setIsDiscardDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your unsaved Activity changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={closeDialog}>
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
