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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import type { ActivityDesignListItem, ActivityListItem } from "../types";
import ActivityForm from "./forms/activity-form";

export default function ActivityCreateSheet({
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

  const closeSheet = useCallback(() => {
    setIsDiscardDialogOpen(false);
    setIsDirty(false);
    onClose();
  }, [onClose]);

  function requestClose() {
    if (isDirty) {
      setIsDiscardDialogOpen(true);
      return;
    }

    closeSheet();
  }

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) requestClose();
        }}
      >
        {activityDesign ? (
          <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>Add Activity to “{activityDesign.title}”</SheetTitle>
              <SheetDescription>
                Add an undertaking under this Activity Design. The Activity Design
                context is fixed for this workflow.
              </SheetDescription>
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
            </SheetHeader>
            <ActivityForm
              key={activityDesign.id}
              activityDesignId={activityDesign.id}
              layout="sheet"
              onCancel={requestClose}
              onDirtyChange={setIsDirty}
              onSuccess={(activity) => {
                setIsDirty(false);
                onSuccess(activity);
              }}
            />
          </SheetContent>
        ) : null}
      </Sheet>

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
            <AlertDialogAction variant="destructive" onClick={closeSheet}>
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
