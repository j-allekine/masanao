import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { IssuanceWorkspace } from "../types";

/** Posted values come entirely from persisted evidence. Never recalculate here. */
export default function IssuancePostedContent({
  workspace,
  hydrated,
  backUrl,
}: {
  workspace: IssuanceWorkspace;
  hydrated: boolean;
  backUrl: string;
}) {
  const { context, draft, review, posted } = workspace;
  return (
    <div
      className="flex h-svh min-h-0 flex-col bg-card"
      data-issuance-ready={hydrated ? "true" : undefined}
    >
      <header className="flex min-h-16 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
        <SidebarTrigger />
        <div className="min-w-0">
          <p className="text-heading-3 font-semibold">Issuance</p>
          <p className="break-words text-body-sm text-muted-foreground">
            {context.activityDesignNo} · {context.activityName}
          </p>
        </div>
        <Badge>Posted</Badge>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="break-words text-heading-2 font-semibold">
              {context.mealLabel} · {context.mealTime}
            </h1>
            <p className="break-words text-body-sm text-muted-foreground">
              {context.activityDesignTitle} / {context.activityName} / Meal
              Schedule
            </p>
          </div>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={backUrl} />}
          >
            Back to Meal Schedule
          </Button>
        </div>
        <p role="status" className="mt-4 text-body-sm">
          Issuance posted. Stock was deducted.
        </p>
        <p className="mt-2 break-words text-body-sm">
          Meal pax: {draft.mealPax} · Posted by {posted?.actorName} (
          {posted?.actorUsername})
        </p>
        <p className="mt-1 break-words text-body-sm">
          Posted at:{" "}
          <time dateTime={posted?.postedAt}>
            {posted
              ? new Intl.DateTimeFormat("en-PH", {
                  dateStyle: "medium",
                  timeStyle: "long",
                  timeZone: "Asia/Manila",
                }).format(new Date(posted.postedAt))
              : ""}
          </time>
        </p>
        <Alert className="mt-4">
          <AlertDescription>
            This record is read-only. No correction, reversal, return, or
            replacement posting is available in this release.
          </AlertDescription>
        </Alert>
        <section aria-labelledby="posted-quantities" className="mt-6">
          <h2 id="posted-quantities" className="text-heading-3 font-semibold">
            Issued quantities
          </h2>
          <ul className="mt-3 divide-y rounded-lg border">
            {review.map((row) => (
              <li key={row.itemId} className="flex flex-col gap-2 p-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <h3 className="min-w-0 break-words text-body-sm font-medium">
                    {row.itemName}
                  </h3>
                  <strong className="break-all tabular-nums">
                    {row.finalQuantity} {row.baseUnitAbbreviation}
                  </strong>
                </div>
                <p className="break-words text-body-sm text-muted-foreground">
                  Calculated: {row.calculatedApproximate ? "≈ " : ""}
                  {row.calculatedQuantity} {row.baseUnitAbbreviation}
                  {row.adjusted ? " · Final quantity adjusted" : ""}
                </p>
                <p className="text-body-sm text-muted-foreground">
                  Policy at posting:{" "}
                  {row.policy === "whole-only"
                    ? "Whole quantities only"
                    : "Decimals allowed"}
                </p>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="posted-recipes" className="mt-6">
          <h2 id="posted-recipes" className="text-heading-3 font-semibold">
            Recipes
          </h2>
          {draft.recipes.length ? (
            <ul className="mt-3 flex flex-col gap-3">
              {draft.recipes.map((recipe) => (
                <li key={recipe.id} className="rounded-lg border p-3">
                  <h3 className="break-words text-body-sm font-medium">
                    {recipe.recipeName} · {recipe.targetPax} pax
                  </h3>
                  <p className="text-body-sm text-muted-foreground">
                    Baseline: {recipe.baselinePax} pax
                  </p>
                  <ul
                    className="mt-2 flex flex-col gap-2"
                    aria-label={`Saved ingredients for ${recipe.recipeName}`}
                  >
                    {recipe.ingredients.map((ingredient) => (
                      <li
                        key={ingredient.id}
                        className="break-words text-body-sm"
                      >
                        {ingredient.itemName}:{" "}
                        <span className="break-all tabular-nums">
                          {ingredient.enteredQuantity}{" "}
                          {ingredient.selectedUnitAbbreviation}
                        </span>{" "}
                        at baseline
                        {ingredient.conversionFactor !== "1"
                          ? ` · 1 ${ingredient.selectedUnitAbbreviation} = ${ingredient.conversionFactor} ${ingredient.baseUnitAbbreviation}`
                          : ""}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-body-sm text-muted-foreground">
              No Recipes.
            </p>
          )}
        </section>
        <section aria-labelledby="posted-stock" className="mt-6">
          <h2 id="posted-stock" className="text-heading-3 font-semibold">
            Stock
          </h2>
          {draft.stockItems.length ? (
            <ul className="mt-3 flex flex-col gap-2">
              {draft.stockItems.map((line) => (
                <li
                  key={line.id}
                  className="break-words rounded-lg border p-3 text-body-sm"
                >
                  {line.itemName}:{" "}
                  <span className="break-all tabular-nums">
                    {line.enteredQuantity} {line.selectedUnitAbbreviation}
                  </span>
                  {line.conversionId
                    ? ` · 1 ${line.selectedUnitAbbreviation} = ${line.conversionFactor} ${line.baseUnitAbbreviation}`
                    : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-body-sm text-muted-foreground">
              No direct Stock items.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
