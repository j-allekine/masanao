"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import { deleteRecipeAction, setRecipeActiveAction } from "../actions";

export default function RecipeLifecycleActions({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  function run(operation: () => Promise<{ status: string; message?: string; error?: string }>, returnToCatalog = false) {
    startTransition(async () => {
      const result = await operation();
      if (result.status === "success") {
        toast.success(result.message);
        if (returnToCatalog) router.push("/recipes"); else router.refresh();
      } else toast.error(result.error);
    });
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" disabled={isPending} onClick={() => run(() => setRecipeActiveAction(id, !isActive))}>
        {isActive ? "Deactivate" : "Reactivate"}
      </Button>
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="destructive" disabled={isPending} />}>Delete Recipe</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this Recipe?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes this unused reusable template and its Ingredient rows.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => run(() => deleteRecipeAction(id), true)}>Delete Recipe</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
