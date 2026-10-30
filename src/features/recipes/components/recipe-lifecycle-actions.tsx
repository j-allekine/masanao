"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import WorkspaceRowActionMenu from "@/components/workspace/row-action-menu";
import DestructiveDialog from "@/components/workspace/destructive-dialog";
import { deleteRecipeAction, setRecipeActiveAction } from "../actions";

export default function RecipeLifecycleActions({ id, isActive, returnTo = "/recipes" }: { id: string; isActive: boolean; returnTo?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();
  function setActive() {
    startTransition(async () => {
      try {
        const result = await setRecipeActiveAction(id, !isActive);
        if (result.status === "success") { toast.success(result.message); router.refresh(); }
        else toast.error(result.error);
      } catch { toast.error("Could not update Recipe. Please try again."); }
    });
  }
  function remove() {
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await deleteRecipeAction(id);
        if (result.status === "success") { toast.success(result.message); router.push(returnTo); }
        else setError(result.error);
      } catch { setError("Could not delete Recipe. Please try again."); }
    });
  }
  return <>
    <WorkspaceRowActionMenu actionButtonId={`recipe-record-actions-${id}`} ariaLabel="Recipe actions" disabled={isPending} groups={[{ actions: [{ label: isActive ? "Deactivate" : "Reactivate", icon: <RotateCcw />, onSelect: setActive }] }, { actions: [{ label: "Delete Recipe", icon: <Trash2 />, onSelect: () => setDeleting(true), variant: "destructive" }] }]} />
    <DestructiveDialog bounded open={deleting} onOpenChange={setDeleting} title="Delete this Recipe?" description="This permanently removes this unused reusable template and its Ingredient rows." error={error} isPending={isPending} onConfirm={remove} confirmLabel="Delete Recipe" />
  </>;
}
