import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import WorkspaceTableFrame from "@/components/workspace/table-frame";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import type { IssuanceWorkspace } from "../types";

/** Posted values come entirely from persisted evidence. Never recalculate here. */
export default function IssuancePostedContent({
  workspace,
  hydrated,
  backUrl,
  focusAfterPosting = false,
}: {
  workspace: IssuanceWorkspace;
  hydrated: boolean;
  backUrl: string;
  focusAfterPosting?: boolean;
}) {
  const { context, draft, review, posted } = workspace;
  const [viewId, setViewId] = useState<string | null>(null);
  const [receiptItemId, setReceiptItemId] = useState<string | null>(null);
  const receiptOpenerId = useRef<string | null>(null);
  const receiptRow = review.find((row) => row.itemId === receiptItemId);
  const openerId = useRef<string | null>(null);
  const jumpToTotals = useRef(false);
  const view = draft.recipes.find((recipe) => recipe.id === viewId);
  useEffect(() => {
    if (focusAfterPosting) document.getElementById("posted-quantities")?.focus();
  }, [focusAfterPosting]);
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
            <ArrowLeft data-icon="inline-start" aria-hidden="true" />
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
          <h2
            id="posted-quantities"
            tabIndex={-1}
            className="text-heading-3 font-semibold"
          >
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
                {row.receiptAllocations?.length ? <Button id={`receipt-sources-${row.itemId}`} className="self-start" variant="ghost" size="sm" onClick={() => { receiptOpenerId.current = `receipt-sources-${row.itemId}`; setReceiptItemId(row.itemId); }}>Receipt sources · FIFO</Button> : null}
              </li>
            ))}
          </ul>
        </section>
        <Dialog open={Boolean(receiptRow)} onOpenChange={(open) => { if (!open) setReceiptItemId(null); }}>
          <DialogContent finalFocus={() => receiptOpenerId.current ? document.getElementById(receiptOpenerId.current) : null} className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
            <DialogHeader className="pr-8">
              <DialogTitle>Receipt sources for {receiptRow?.itemName}</DialogTitle>
              <DialogDescription>FIFO uses the oldest received stock first. Quantities are in the Item’s Base Unit.</DialogDescription>
            </DialogHeader>
            <ul className="flex flex-col divide-y sm:hidden" aria-label="Receipt allocations">
              {receiptRow?.receiptAllocations?.map((allocation) => <li key={allocation.receiptLineId} className="flex min-w-0 justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="break-words font-medium">{allocation.receiptNo}</p>
                  <p className="break-words text-body-sm">{allocation.purchaseOrderNo}</p>
                  <p className="text-body-sm text-muted-foreground">{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(allocation.receiptDate))}</p>
                  {allocation.basis === "reconstructed" ? <Badge variant="secondary">Reconstructed using FIFO</Badge> : null}
                </div>
                <p className="max-w-1/3 break-all text-body-sm tabular-nums">{allocation.quantity} {receiptRow.baseUnitAbbreviation}</p>
              </li>)}
            </ul>
            <div className="hidden sm:block"><Table>
              <TableHeader><TableRow><TableHead>Receipt</TableHead><TableHead>Purchase Order</TableHead><TableHead>Quantity</TableHead></TableRow></TableHeader>
              <TableBody>{receiptRow?.receiptAllocations?.map((allocation) => <TableRow key={allocation.receiptLineId}>
                <TableCell className="whitespace-normal break-words">{allocation.receiptNo}<p className="text-muted-foreground">{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(allocation.receiptDate))}</p>{allocation.basis === "reconstructed" ? <Badge variant="secondary">Reconstructed using FIFO</Badge> : null}</TableCell>
                <TableCell className="whitespace-normal break-words">{allocation.purchaseOrderNo}</TableCell>
                <TableCell className="whitespace-normal break-all tabular-nums">{allocation.quantity} {receiptRow.baseUnitAbbreviation}</TableCell>
              </TableRow>)}</TableBody>
            </Table></div>
          </DialogContent>
        </Dialog>
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
                  <Button
                    id={`posted-ingredients-${recipe.id}`}
                    variant="ghost"
                    onClick={() => {
                      jumpToTotals.current = false;
                      openerId.current = `posted-ingredients-${recipe.id}`;
                      setViewId(recipe.id);
                    }}
                  >
                    View ingredients for {recipe.recipeName}
                  </Button>
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
      <Sheet
        open={Boolean(view)}
        onOpenChange={(open) => {
          if (!open) setViewId(null);
        }}
      >
        <SheetContent
          finalFocus={() =>
            jumpToTotals.current
              ? document.getElementById("posted-quantities")
              : openerId.current
                ? document.getElementById(openerId.current)
                : null
          }
          className="data-[side=right]:w-full data-[side=right]:sm:w-[36rem] data-[side=right]:sm:max-w-none"
        >
          <SheetHeader>
            <SheetTitle>{view?.recipeName}</SheetTitle>
            <SheetDescription>
              Saved posting evidence. Baseline {view?.baselinePax} pax · To
              issue {view?.targetPax} pax
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 overflow-y-auto px-4 pb-4">
            <WorkspaceTableFrame
              caption="Posted Recipe ingredients: saved baseline and to-issue quantities"
              className="table-fixed"
            >
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/2">Ingredient</TableHead>
                  <TableHead className="whitespace-normal">
                    Baseline ({view?.baselinePax} pax)
                  </TableHead>
                  <TableHead className="whitespace-normal">
                    To issue ({view?.targetPax} pax)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {view?.ingredients.map((ingredient) => (
                  <TableRow key={ingredient.id}>
                    <TableCell className="whitespace-normal">
                      {ingredient.itemName}
                      {review.some(
                        (row) =>
                          row.itemId === ingredient.itemId && row.adjusted,
                      ) ? (
                        <p className="mt-1 text-body-sm text-muted-foreground">
                          Combined total adjusted. This contribution remains
                          calculated.{" "}
                          <Button
                            variant="link"
                            nativeButton={false}
                            role="link"
                            className="h-auto whitespace-normal text-left"
                            render={<a href="#posted-quantities" />}
                            onClick={(event) => {
                              event.preventDefault();
                              jumpToTotals.current = true;
                              setViewId(null);
                            }}
                          >
                            View issued quantities
                          </Button>
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="whitespace-normal break-words tabular-nums">
                      {ingredient.enteredQuantity}{" "}
                      {ingredient.selectedUnitAbbreviation}
                    </TableCell>
                    <TableCell className="whitespace-normal break-words tabular-nums">
                      {ingredient.postedContribution
                        ? `${ingredient.postedContribution.approximate ? "≈ " : ""}${ingredient.postedContribution.quantity} ${ingredient.selectedUnitAbbreviation}`
                        : "Saved contribution unavailable"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </WorkspaceTableFrame>
            <p className="mt-3 text-body-sm text-muted-foreground">
              Contributions are saved at posting. Final deductions belong to the
              combined Item quantities, not individual ingredients.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
