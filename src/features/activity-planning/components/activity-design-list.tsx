"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";

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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";

import { deleteActivityDesignAction } from "../actions";
import ActivityDesignEditForm from "./forms/activity-design-edit-form";
import type { ActivityDesignListItem } from "../types";

function ActivityDesignListItemCard({
  activityDesign,
  onEdit,
  onDeleted,
}: {
  activityDesign: ActivityDesignListItem;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleDelete() {
    setDeleteError(null);

    startDeleteTransition(async () => {
      try {
        const result = await deleteActivityDesignAction(activityDesign.id);

        if (result.status === "error") {
          setDeleteError(result.error);
          return;
        }

        setIsDeleteDialogOpen(false);
        onDeleted();
      } catch {
        setDeleteError(
          "The Activity Design could not be deleted. Check your connection and try again.",
        );
      }
    });
  }

  return (
    <li
      className="rounded-lg border bg-background p-4 transition-colors hover:bg-muted/40"
    >
      <article className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-xs font-medium tracking-wide text-primary uppercase">
            {activityDesign.activityDesignNo}
          </p>
          <h3 className="mt-2 truncate text-base font-semibold">
            {activityDesign.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {activityDesign.officeName}
          </p>
        </div>
        <div className="flex shrink-0 flex-row gap-4 text-sm sm:flex-col sm:items-end sm:gap-1">
          <span className="font-medium">FY {activityDesign.fiscalYear}</span>
          <span className="text-muted-foreground">
            {activityDesign.activityCount === 1
              ? "1 Activity"
              : `${activityDesign.activityCount} Activities`}
          </span>
        </div>
      </article>
      {activityDesign.aipReferenceCode ? (
        <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
          AIP Reference Code: {activityDesign.aipReferenceCode}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t pt-3">
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          <Pencil data-icon="inline-start" />
          Edit
        </Button>
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            setIsDeleteDialogOpen(open);
            if (!open) setDeleteError(null);
          }}
        >
          <AlertDialogTrigger
            render={<Button type="button" variant="ghost" size="sm" />}
          >
            <Trash2 data-icon="inline-start" />
            Delete
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Activity Design?</AlertDialogTitle>
              <AlertDialogDescription>
                {activityDesign.activityCount > 0
                  ? `This design has ${activityDesign.activityCount} ${activityDesign.activityCount === 1 ? "Activity" : "Activities"}. Remove ${activityDesign.activityCount === 1 ? "it" : "them"} before deleting this planning context.`
                  : "This permanently removes the planning context. It can only be deleted while it has no Activities."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {deleteError ? (
              <Alert variant="destructive">
                <AlertTitle>Deletion blocked</AlertTitle>
                <AlertDescription>{deleteError}</AlertDescription>
              </Alert>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
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
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  );
}

export default function ActivityDesignList({
  activityDesigns,
}: {
  activityDesigns: ActivityDesignListItem[];
}) {
  const router = useRouter();
  const [editingActivityDesign, setEditingActivityDesign] =
    useState<ActivityDesignListItem | null>(null);

  function handleActivityDesignUpdated() {
    setEditingActivityDesign(null);
    router.refresh();
  }

  if (activityDesigns.length === 0) {
    return (
      <Empty className="min-h-72">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ClipboardList aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No Activity Designs yet</EmptyTitle>
          <EmptyDescription>
            Create the first planning context with its LGU reference number, fiscal year, and office.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            nativeButton={false}
            render={<a href="#create-activity-design-title" />}
          >
            Create the first Activity Design
            <Plus data-icon="inline-end" />
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <>
      <ul aria-label="Activity Designs" className="flex flex-col gap-3">
        {activityDesigns.map((activityDesign) => (
          <ActivityDesignListItemCard
            activityDesign={activityDesign}
            key={activityDesign.id}
            onEdit={() => setEditingActivityDesign(activityDesign)}
            onDeleted={() => router.refresh()}
          />
        ))}
      </ul>
      <Sheet
        open={editingActivityDesign !== null}
        onOpenChange={(open) => {
          if (!open) setEditingActivityDesign(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Edit Activity Design</SheetTitle>
            <SheetDescription>
              Update the planning context. Changes to the Activity Design No.
              are checked for duplicates before saving.
            </SheetDescription>
          </SheetHeader>
          {editingActivityDesign ? (
            <ActivityDesignEditForm
              activityDesign={editingActivityDesign}
              onCancel={() => setEditingActivityDesign(null)}
              onSuccess={handleActivityDesignUpdated}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
