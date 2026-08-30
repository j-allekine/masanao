"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Clock3, Pencil, Trash2, Utensils } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";

import { deleteMealScheduleAction } from "../actions";
import type { MealScheduleListItem } from "../types";
import MealScheduleEditForm from "./forms/meal-schedule-edit-form";

function MealScheduleListItemRow({
  activityDesignId,
  activityId,
  mealSchedule,
  onEdit,
  onDeleted,
}: {
  activityDesignId: string;
  activityId: string;
  mealSchedule: MealScheduleListItem;
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
        const result = await deleteMealScheduleAction(
          activityDesignId,
          activityId,
          mealSchedule.id,
        );

        if (result.status === "error") {
          setDeleteError(result.error);
          return;
        }

        setIsDeleteDialogOpen(false);
        onDeleted();
      } catch {
        setDeleteError(
          "The Meal Schedule could not be deleted. Check your connection and try again.",
        );
      }
    });
  }

  return (
    <li className="rounded-md border bg-background px-3 py-2.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {mealSchedule.label}
          </p>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 aria-hidden="true" />
            <span>{mealSchedule.mealTime}</span>
          </p>
        </div>
        <p className="shrink-0 text-xs text-muted-foreground">
          {mealSchedule.plannedServings === null
            ? "Servings not planned"
            : `${mealSchedule.plannedServings.toLocaleString("en-PH")} planned servings`}
        </p>
      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t pt-3 sm:border-t-0 sm:pt-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Edit ${mealSchedule.label} Meal Schedule`}
          onClick={onEdit}
        >
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
            render={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Delete ${mealSchedule.label} Meal Schedule`}
              />
            }
          >
            <Trash2 data-icon="inline-start" />
            Delete
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete {mealSchedule.label} Meal Schedule?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the Meal Schedule. A schedule with an
                Issuance Record cannot be deleted.
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
                {isDeleting ? "Deleting…" : "Delete Meal Schedule"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  );
}

export default function MealScheduleList({
  activityDesignId,
  activityId,
  mealSchedules,
}: {
  activityDesignId: string;
  activityId: string;
  mealSchedules: MealScheduleListItem[];
}) {
  const router = useRouter();
  const [editingMealSchedule, setEditingMealSchedule] =
    useState<MealScheduleListItem | null>(null);

  if (mealSchedules.length === 0) {
    return (
      <Empty className="min-h-0 border-0 px-3 py-6">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Utensils aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No Meal Schedules yet</EmptyTitle>
          <EmptyDescription>
            Add a named meal occasion and local time when the plan is ready.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      <ol aria-label="Meal Schedules" className="flex flex-col gap-2">
        {mealSchedules.map((mealSchedule) => (
          <MealScheduleListItemRow
            activityDesignId={activityDesignId}
            activityId={activityId}
            key={mealSchedule.id}
            mealSchedule={mealSchedule}
            onEdit={() => setEditingMealSchedule(mealSchedule)}
            onDeleted={() => router.refresh()}
          />
        ))}
      </ol>
      <Sheet
        open={editingMealSchedule !== null}
        onOpenChange={(open) => {
          if (!open) setEditingMealSchedule(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Edit Meal Schedule</SheetTitle>
            <SheetDescription>
              Update the label, local meal time, and optional planned servings.
            </SheetDescription>
          </SheetHeader>
          {editingMealSchedule ? (
            <MealScheduleEditForm
              activityDesignId={activityDesignId}
              mealSchedule={editingMealSchedule}
              onCancel={() => setEditingMealSchedule(null)}
              onSuccess={() => {
                setEditingMealSchedule(null);
                router.refresh();
              }}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
