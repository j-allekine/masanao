"use client";

import { useState, useTransition } from "react";
import { Eye, FilePenLine, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import DestructiveDialog from "@/components/workspace/destructive-dialog";
import WorkspaceRowActionMenu from "@/components/workspace/row-action-menu";

import { deleteRecipeAction, setRecipeActiveAction } from "../actions";
import type { RecipeCatalogItem } from "../types";

export default function RecipeCatalogActions({
  recipe,
  onView,
  canManageRecipes,
}: {
  recipe: RecipeCatalogItem;
  onView: () => void;
  canManageRecipes: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>();

  function setActive(isActive: boolean) {
    startTransition(async () => {
      const result = await setRecipeActiveAction(recipe.id, isActive);
      if (result.status === "success") {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.error);
    });
  }

  function deleteRecipe() {
    setDeleteError(undefined);
    startTransition(async () => {
      const result = await deleteRecipeAction(recipe.id);
      if (result.status === "success") {
        toast.success(result.message);
        setIsDeleteDialogOpen(false);
        router.refresh();
        return;
      }

      setDeleteError(result.error);
    });
  }

  return (
    <>
      <WorkspaceRowActionMenu
        actionButtonId={`recipe-actions-${recipe.id}`}
        ariaLabel={`Actions for ${recipe.name}`}
        disabled={isPending}
        groups={[
          {
            actions: [
              { label: "View", icon: <Eye />, onSelect: onView },
              ...(canManageRecipes && recipe.isActive
                ? [
                    {
                      label: "Edit",
                      icon: <FilePenLine />,
                      onSelect: () => router.push(`/recipes/${recipe.id}/edit`),
                    },
                  ]
                : []),
            ],
          },
          ...(canManageRecipes
            ? [
                {
                  actions: [
                    recipe.isActive
                      ? {
                          label: "Deactivate",
                          icon: <RotateCcw className="rotate-180" />,
                          onSelect: () => setActive(false),
                        }
                      : {
                          label: "Reactivate",
                          icon: <RotateCcw />,
                          onSelect: () => setActive(true),
                        },
                  ],
                },
                {
                  actions: [
                    {
                      label: "Delete Recipe",
                      icon: <Trash2 />,
                      onSelect: () => setIsDeleteDialogOpen(true),
                      variant: "destructive" as const,
                    },
                  ],
                },
              ]
            : []),
        ]}
      />
      <DestructiveDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={`Delete ${recipe.name}?`}
        description="This permanently removes this unused reusable template and its Ingredient rows."
        error={deleteError}
        isPending={isPending}
        onConfirm={deleteRecipe}
        confirmLabel="Delete Recipe"
      />
    </>
  );
}
