"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, Pencil, Trash2 } from "lucide-react";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { deleteActivityDesignAction } from "../actions";
import type { ActivityDesignListItem } from "../types";
import { hasActivityDesignFilters } from "./activity-design-filters";
import ActivityDesignEditForm from "./forms/activity-design-edit-form";

function ActivityCount({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-medium">
        {count} {count === 1 ? "Activity" : "Activities"}
      </span>
      <span className="text-xs text-muted-foreground">
        Activity view coming in a future update.
      </span>
    </div>
  );
}

function ActivityDesignRow({
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
    <TableRow>
      <TableCell className="font-mono text-xs font-medium tracking-wide text-primary">
        {activityDesign.activityDesignNo}
      </TableCell>
      <TableCell className="max-w-[24rem] font-medium">
        <span className="block truncate">{activityDesign.title}</span>
      </TableCell>
      <TableCell>{activityDesign.officeName}</TableCell>
      <TableCell>FY {activityDesign.fiscalYear}</TableCell>
      <TableCell>
        <ActivityCount count={activityDesign.activityCount} />
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            nativeButton={false}
            render={<Link href={`/activity-designs/${activityDesign.id}`} />}
            size="sm"
          >
            Open
            <ArrowRight data-icon="inline-end" />
          </Button>
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
      </TableCell>
    </TableRow>
  );
}

export default function ActivityDesignTable({
  activityDesigns,
  filters,
  onClearFilters,
}: {
  activityDesigns: ActivityDesignListItem[];
  filters: { search: string; fiscalYear: string; office: string };
  onClearFilters: () => void;
}) {
  const router = useRouter();
  const [editingActivityDesign, setEditingActivityDesign] =
    useState<ActivityDesignListItem | null>(null);
  const hasFilters = hasActivityDesignFilters(filters);

  if (activityDesigns.length === 0) {
    return (
      <Empty className="min-h-72 rounded-lg border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <span aria-hidden="true">AD</span>
          </EmptyMedia>
          <EmptyTitle>
            {hasFilters
              ? "No Activity Designs match your current filters."
              : "No Activity Designs yet."}
          </EmptyTitle>
          <EmptyDescription>
            {hasFilters
              ? "Clear filters to see the complete Activity Designs list."
              : "Create an Activity Design to begin planning."}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          {hasFilters ? (
            <Button type="button" variant="outline" onClick={onClearFilters}>
              Clear filters
            </Button>
          ) : (
            <Button
              nativeButton={false}
              render={<a href="#create-activity-design-title" />}
            >
              New Activity Design
            </Button>
          )}
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table className="min-w-[62rem]">
        <caption className="sr-only">Activity Designs</caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Design No.</TableHead>
            <TableHead scope="col">Title</TableHead>
            <TableHead scope="col">Office</TableHead>
            <TableHead scope="col">Fiscal Year</TableHead>
            <TableHead scope="col">Activities</TableHead>
            <TableHead scope="col" className="text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activityDesigns.map((activityDesign) => (
            <ActivityDesignRow
              key={activityDesign.id}
              activityDesign={activityDesign}
              onEdit={() => setEditingActivityDesign(activityDesign)}
              onDeleted={() => router.refresh()}
            />
          ))}
        </TableBody>
      </Table>
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
              onSuccess={() => {
                setEditingActivityDesign(null);
                router.refresh();
              }}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
