import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MealScheduleHeader } from "@/features/activity-planning/ui";
import type { MealScheduleDetailItem } from "@/features/activity-planning/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  mealSchedule,
  focusAfterPosting = false,
}: {
  workspace: IssuanceWorkspace;
  hydrated: boolean;
  mealSchedule: MealScheduleDetailItem;
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
      className="flex min-h-0 flex-1 flex-col bg-card"
      data-issuance-ready={hydrated ? "true" : undefined}
    >
      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <MealScheduleHeader mealSchedule={mealSchedule} ready={hydrated}
          title={`${context.mealLabel} · ${context.mealTime}`} status={<Badge>Posted</Badge>} />
        <p role="status" className="sr-only">
          Issuance posted. Stock was deducted.
        </p>
        <p className="mt-3 break-words text-body-sm text-muted-foreground">
          {draft.mealPax} pax · {posted?.actorName} · {" "}
          <time className="inline-block" dateTime={posted?.postedAt}>
            {posted
              ? new Intl.DateTimeFormat("en-PH", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Asia/Manila",
                }).format(new Date(posted.postedAt))
              : ""}
          </time>
        </p>
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
              <li key={row.itemId} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 p-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h3 className="min-w-0 break-words text-body-sm font-medium">
                    {row.itemName}
                  </h3>
                  {row.adjusted ? <Badge variant="secondary">Adjusted</Badge> : null}
                </div>
                <strong className="max-w-32 break-all text-body-sm tabular-nums">{row.finalQuantity} {row.baseUnitAbbreviation}</strong>
                <Button id={`receipt-sources-${row.itemId}`} disabled={!hydrated} aria-label={`Details for ${row.itemName}`} variant="ghost" size="sm" onClick={() => { receiptOpenerId.current = `receipt-sources-${row.itemId}`; setReceiptItemId(row.itemId); }}>Details</Button>
              </li>
            ))}
          </ul>
        </section>
        <Dialog open={Boolean(receiptRow)} onOpenChange={(open) => { if (!open) setReceiptItemId(null); }}>
          <DialogContent finalFocus={() => receiptOpenerId.current ? document.getElementById(receiptOpenerId.current) : null} className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
            <DialogHeader className="pr-8">
              <DialogTitle>Details for {receiptRow?.itemName}</DialogTitle>
              <DialogDescription className="sr-only">Saved quantities, policy and receipt sources.</DialogDescription>
            </DialogHeader>
            <dl className="grid grid-cols-2 gap-4 text-body-sm">
              <div className="min-w-0"><dt className="text-muted-foreground">Calculated</dt><dd className="break-all tabular-nums">{receiptRow?.calculatedApproximate ? "≈ " : ""}{receiptRow?.calculatedQuantity} {receiptRow?.baseUnitAbbreviation}</dd></div>
              <div className="min-w-0"><dt className="text-muted-foreground">Issued</dt><dd className="break-all font-medium tabular-nums">{receiptRow?.finalQuantity} {receiptRow?.baseUnitAbbreviation}{receiptRow?.adjusted ? " · Adjusted" : ""}</dd></div>
              <div className="col-span-2"><dt className="text-muted-foreground">Policy at posting</dt><dd>{receiptRow?.policy === "whole-only" ? "Whole quantities only" : "Decimals allowed"}</dd></div>
            </dl>
            <h3 className="font-medium">Receipt sources</h3>
            {receiptRow?.receiptAllocations?.length ? <p className="text-body-sm text-muted-foreground">Oldest receipt first (FIFO).</p> : <p className="text-body-sm text-muted-foreground">Receipt sources were not recorded for this older issuance.</p>}
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
        {draft.recipes.length ? <Collapsible className="mt-6 border-t pt-2">
          <CollapsibleTrigger disabled={!hydrated} render={<Button variant="ghost" className="w-full justify-between" />}>
            Recipes ({draft.recipes.length})<ChevronDown data-icon="inline-end" aria-hidden="true" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="divide-y px-3">
              {draft.recipes.map((recipe) => <li key={recipe.id} className="flex min-w-0 items-center justify-between gap-3 py-2">
                <Button id={`posted-ingredients-${recipe.id}`} variant="link" className="h-auto min-w-0 whitespace-normal text-left" aria-label={`View ingredients for ${recipe.recipeName}`} onClick={() => { jumpToTotals.current = false; openerId.current = `posted-ingredients-${recipe.id}`; setViewId(recipe.id); }}>{recipe.recipeName}</Button>
                <span className="shrink-0 text-body-sm text-muted-foreground tabular-nums">{recipe.targetPax} pax</span>
              </li>)}
            </ul>
          </CollapsibleContent>
        </Collapsible> : null}
        {draft.stockItems.length ? <Collapsible className="mt-2 border-t pt-2">
          <CollapsibleTrigger disabled={!hydrated} render={<Button variant="ghost" className="w-full justify-between" />}>
            Direct Stock ({draft.stockItems.length})<ChevronDown data-icon="inline-end" aria-hidden="true" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="divide-y px-3">
              {draft.stockItems.map((line) => <li key={line.id} className="flex min-w-0 flex-wrap justify-between gap-2 py-2 text-body-sm">
                <span className="min-w-0 break-words">{line.itemName}</span>
                <span className="break-all tabular-nums">{line.enteredQuantity} {line.selectedUnitAbbreviation}</span>
                {line.conversionId ? <p className="w-full break-words text-muted-foreground">1 {line.selectedUnitAbbreviation} = {line.conversionFactor} {line.baseUnitAbbreviation}</p> : null}
              </li>)}
            </ul>
          </CollapsibleContent>
        </Collapsible> : null}
        <Collapsible className="mt-2 border-t pt-2">
          <CollapsibleTrigger disabled={!hydrated} render={<Button variant="ghost" className="w-full justify-between" />}>
            Record details<ChevronDown data-icon="inline-end" aria-hidden="true" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <dl className="grid gap-3 px-3 py-3 text-body-sm sm:grid-cols-2">
              <div className="min-w-0"><dt className="text-muted-foreground">Activity Design</dt><dd className="break-words">{context.activityDesignNo} · {context.activityDesignTitle}</dd></div>
              <div className="min-w-0"><dt className="text-muted-foreground">Activity</dt><dd className="break-words">{context.activityName}</dd></div>
              <div className="min-w-0"><dt className="text-muted-foreground">Posted by</dt><dd className="break-words">{posted?.actorName} ({posted?.actorUsername})</dd></div>
              <div className="min-w-0"><dt className="text-muted-foreground">Posted at</dt><dd>{posted ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "long", timeZone: "Asia/Manila" }).format(new Date(posted.postedAt)) : ""}</dd></div>
            </dl>
            <p className="px-3 pb-3 text-body-sm text-muted-foreground">This record is read-only. No correction, reversal, return, or replacement posting is available in this release.</p>
          </CollapsibleContent>
        </Collapsible>
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
