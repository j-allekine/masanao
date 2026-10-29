import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { RecordDetails } from "@/components/workspace/record-details";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MealScheduleHeader } from "@/features/activity-planning/ui";
import type { MealScheduleDetailItem } from "@/features/activity-planning/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
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
  const [totalsOpen, setTotalsOpen] = useState(false);
  const [postingDetailsOpen, setPostingDetailsOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [receiptItemId, setReceiptItemId] = useState<string | null>(null);
  const receiptOpenerId = useRef<string | null>(null);
  const receiptRow = review.find((row) => row.itemId === receiptItemId);
  const openerId = useRef<string | null>(null);
  const jumpToTotals = useRef(false);
  const view = draft.recipes.find((recipe) => recipe.id === viewId);
  useEffect(() => {
    if (focusAfterPosting) document.getElementById("view-issued-totals")?.focus();
  }, [focusAfterPosting]);
  return (
    <div
      className="flex min-h-0 flex-1 flex-col bg-card"
      data-issuance-ready={hydrated ? "true" : undefined}
    >
      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6" data-workspace-scroll="body">
        <MealScheduleHeader
          mealSchedule={mealSchedule}
          ready={hydrated}
          showDetails={false}
          title={`${context.mealLabel} · ${context.mealTime}`}
          summary={`${draft.mealPax} pax`}
          status={<>
            <Badge>Posted</Badge>
            <Button id="view-issued-totals" disabled={!hydrated} variant="outline" onClick={() => setTotalsOpen(true)}>View issued totals</Button>
            <Dialog open={postingDetailsOpen} onOpenChange={setPostingDetailsOpen}>
              <Tooltip>
                <TooltipTrigger render={<DialogTrigger disabled={!hydrated} render={<Button variant="ghost" size="icon-lg" aria-label="Posting details" />} />}>
                  <Info aria-hidden="true" />
                </TooltipTrigger>
                <TooltipContent>Posting details</TooltipContent>
              </Tooltip>
              <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
                <DialogHeader className="pr-8">
                  <DialogTitle>Posting details</DialogTitle>
                  <DialogDescription>Posted issuance is read-only.</DialogDescription>
                </DialogHeader>
                <dl className="grid gap-4 text-body-sm sm:grid-cols-2">
                  <div className="min-w-0"><dt className="text-muted-foreground">Posted by</dt><dd className="break-words">{posted?.actorName} ({posted?.actorUsername})</dd></div>
                  <div className="min-w-0"><dt className="text-muted-foreground">Posted at</dt><dd><time dateTime={posted?.postedAt}>{posted ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "long", timeZone: "Asia/Manila" }).format(new Date(posted.postedAt)) : ""}</time></dd></div>
                  <div className="min-w-0"><dt className="text-muted-foreground">Activity Design at posting</dt><dd className="break-words">{context.activityDesignNo} · {context.activityDesignTitle}</dd></div>
                  <div className="min-w-0"><dt className="text-muted-foreground">Activity at posting</dt><dd className="break-words">{context.activityName}</dd></div>
                  {`${mealSchedule.label} · ${mealSchedule.mealTime}` !== `${context.mealLabel} · ${context.mealTime}` ? <div className="min-w-0 sm:col-span-2"><dt className="text-muted-foreground">Current planning meal</dt><dd className="break-words">{mealSchedule.label} · {mealSchedule.mealTime}</dd></div> : null}
                </dl>
              </DialogContent>
            </Dialog>
          </>}
        />
        <p role="status" className="sr-only">Issuance posted. Stock was deducted.</p>
        <Dialog open={totalsOpen} onOpenChange={setTotalsOpen}>
          <DialogContent finalFocus={() => document.getElementById("view-issued-totals")} className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
            <DialogHeader className="pr-8">
              <DialogTitle id="posted-quantities">Issued item totals</DialogTitle>
              <DialogDescription>Combined quantities deducted from stock, including recipe ingredients and items added separately.</DialogDescription>
            </DialogHeader>
          <ul className="mt-3 divide-y rounded-lg border">
            {review.map((row) => (
              <li key={row.itemId} className="grid grid-cols-[minmax(0,1fr)_auto_2.25rem] items-center gap-4 px-4 py-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h3 className="min-w-0 break-words text-body-sm font-medium">
                    {row.itemName}
                  </h3>
                  {row.adjusted ? <Badge variant="secondary">Adjusted</Badge> : null}
                </div>
                <strong className="max-w-32 break-all text-body-sm tabular-nums">{row.finalQuantity} {row.baseUnitAbbreviation}</strong>
                <Tooltip>
                  <TooltipTrigger render={<Button id={`receipt-sources-${row.itemId}`} disabled={!hydrated} aria-label={`View breakdown for ${row.itemName}`} variant="ghost" size="icon-lg" onClick={() => { receiptOpenerId.current = `receipt-sources-${row.itemId}`; setReceiptItemId(row.itemId); }} />}>
                    <Info aria-hidden="true" />
                  </TooltipTrigger>
                  <TooltipContent>View breakdown</TooltipContent>
                </Tooltip>
              </li>
            ))}
          </ul>
        <Dialog open={Boolean(receiptRow)} onOpenChange={(open) => { if (!open) setReceiptItemId(null); }}>
          <DialogContent finalFocus={() => receiptOpenerId.current ? document.getElementById(receiptOpenerId.current) : null} className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
            <DialogHeader className="pr-8">
              <DialogTitle>Details for {receiptRow?.itemName}</DialogTitle>
              <DialogDescription className="sr-only">Saved quantities, policy and receipt sources.</DialogDescription>
            </DialogHeader>
            <dl className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
              <div><dt className="text-body-sm text-muted-foreground">Issued</dt><dd className="mt-1 break-all text-heading-2 font-semibold tabular-nums">{receiptRow?.finalQuantity} {receiptRow?.baseUnitAbbreviation}</dd></div>
              <div><dt className="text-body-sm text-muted-foreground">Calculated</dt><dd className="mt-1 break-all tabular-nums">{receiptRow?.calculatedApproximate ? "≈ " : ""}{receiptRow?.calculatedQuantity} {receiptRow?.baseUnitAbbreviation}</dd>{receiptRow?.adjusted ? <Badge variant="outline" className="mt-2">Adjusted</Badge> : null}</div>
            </dl>
            <h3 className="font-medium">Receipt sources</h3>
            {receiptRow?.receiptAllocations?.length ? <p className="text-body-sm text-muted-foreground">Oldest receipt first (FIFO).</p> : <p className="text-body-sm text-muted-foreground">Receipt sources were not recorded for this older issuance.</p>}
            <ul className="flex flex-col divide-y sm:hidden" aria-label="Receipt allocations">
              {receiptRow?.receiptAllocations?.map((allocation) => <li key={allocation.receiptLineId} className="flex min-w-0 justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="break-words font-medium">{allocation.receiptNo}</p>
                  <p className="break-words text-body-sm"><span className="text-muted-foreground">PO: </span><span>{allocation.purchaseOrderNo}</span></p>
                  <p className="text-body-sm text-muted-foreground">{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(allocation.receiptDate))}</p>
                  {allocation.basis === "reconstructed" ? <span className="block text-body-sm text-muted-foreground">Historical source reconstructed</span> : null}
                </div>
                <p className="max-w-1/3 shrink-0 break-all text-body-sm tabular-nums">{allocation.quantity} <span className="inline-block max-w-full break-all">{receiptRow.baseUnitAbbreviation}</span></p>
              </li>)}
            </ul>
            <div className="hidden sm:block"><Table>
              <TableHeader><TableRow><TableHead>Receipt</TableHead><TableHead>Purchase Order</TableHead><TableHead className="text-right">Quantity</TableHead></TableRow></TableHeader>
              <TableBody>{receiptRow?.receiptAllocations?.map((allocation) => <TableRow key={allocation.receiptLineId}>
                <TableCell className="whitespace-normal break-words">{allocation.receiptNo}<p className="text-muted-foreground">{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(allocation.receiptDate))}</p>{allocation.basis === "reconstructed" ? <span className="block text-body-sm text-muted-foreground">Historical source reconstructed</span> : null}</TableCell>
                <TableCell className="whitespace-normal break-words">{allocation.purchaseOrderNo}</TableCell>
                <TableCell className="whitespace-normal break-all text-right tabular-nums">{allocation.quantity} {receiptRow.baseUnitAbbreviation}</TableCell>
              </TableRow>)}</TableBody>
            </Table></div>
            {receiptRow?.receiptAllocations?.some((allocation) => allocation.basis === "reconstructed") ? <p className="text-body-sm text-muted-foreground">Historical receipt sources were inferred using FIFO; they do not prove which receipts were picked at the original posting.</p> : null}
            <RecordDetails label="Calculation details" fields={[{ label: "Quantity rule at posting", value: receiptRow?.policy === "whole-only" ? "Whole quantities only" : "Decimals allowed" }]} />
          </DialogContent>
        </Dialog>
          </DialogContent>
        </Dialog>
        {draft.recipes.length ? <section aria-labelledby="posted-recipes" className="mt-8">
          <h2 id="posted-recipes" className="text-heading-3 font-semibold">Recipes ({draft.recipes.length})</h2>
          <ul className="mt-3 divide-y rounded-lg border">
            {draft.recipes.map((recipe) => <li key={recipe.id} className="flex min-w-0 items-center justify-between gap-4 px-4 py-3">
              <Button id={`posted-ingredients-${recipe.id}`} disabled={!hydrated} variant="link" className="h-auto min-w-0 whitespace-normal px-0 text-left" aria-label={`View ingredients for ${recipe.recipeName}`} onClick={() => { jumpToTotals.current = false; openerId.current = `posted-ingredients-${recipe.id}`; setViewId(recipe.id); }}>{recipe.recipeName}</Button>
              <span className="shrink-0 text-body-sm text-muted-foreground tabular-nums">{recipe.targetPax} pax</span>
            </li>)}
          </ul>
        </section> : null}
        {draft.stockItems.length ? <section aria-labelledby="posted-direct-items" className="mt-8">
          <h2 id="posted-direct-items" className="text-heading-3 font-semibold">Items added separately ({draft.stockItems.length})</h2>
          <ul className="mt-3 divide-y rounded-lg border">
            {draft.stockItems.map((line) => <li key={line.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-4 px-4 py-4 text-body-sm">
              <span className="min-w-0 break-words font-medium">{line.itemName}</span>
              <span className="max-w-32 break-words text-right tabular-nums">{line.enteredQuantity} {line.selectedUnitAbbreviation}</span>
              {line.conversionId ? <p className="col-span-2 break-words text-muted-foreground">1 {line.selectedUnitAbbreviation} = {line.conversionFactor} {line.baseUnitAbbreviation}</p> : null}
            </li>)}
          </ul>
        </section> : null}
      </main>
      <Sheet
        open={Boolean(view)}
        onOpenChange={(open) => {
          if (!open) setViewId(null);
        }}
        onOpenChangeComplete={(open) => {
          if (!open && jumpToTotals.current) {
            jumpToTotals.current = false;
            setTotalsOpen(true);
          }
        }}
      >
        <SheetContent
          finalFocus={() =>
            jumpToTotals.current
              ? document.getElementById("view-issued-totals")
              : openerId.current
                ? document.getElementById(openerId.current)
                : null
          }
          className="data-[side=right]:w-full data-[side=right]:sm:w-[36rem] data-[side=right]:sm:max-w-none"
        >
          <SheetHeader className="gap-2 px-5 pt-6 pb-0 pr-12 sm:px-6 sm:pr-14">
            <SheetTitle>{view?.recipeName}</SheetTitle>
            <SheetDescription>
              Baseline {view?.baselinePax} pax · Target {view?.targetPax} pax
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 overflow-y-auto px-5 pb-6 sm:px-6">
            <WorkspaceTableFrame
              caption="Posted Recipe ingredients: saved baseline and calculated contributions"
              className="table-fixed"
            >
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[44%] px-2 py-3 sm:px-4">Ingredient</TableHead>
                  <TableHead aria-label="Baseline" className="w-[28%] whitespace-normal px-2 py-3 text-right sm:px-4">
                    <span className="sm:hidden">Base</span><span className="hidden sm:inline">Baseline</span>
                  </TableHead>
                  <TableHead aria-label="Calculated" className="w-[28%] whitespace-normal px-2 py-3 text-right sm:px-4">
                    <span className="sm:hidden">Scaled</span><span className="hidden sm:inline">Calculated</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {view?.ingredients.map((ingredient) => (
                  <TableRow key={ingredient.id}>
                    <TableCell className="whitespace-normal break-words px-2 py-3 align-top sm:px-4">
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
                            View issued totals
                          </Button>
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="whitespace-normal break-words px-2 py-3 text-right align-top tabular-nums sm:px-4">
                      {ingredient.enteredQuantity}{" "}
                      {ingredient.selectedUnitAbbreviation}
                    </TableCell>
                    <TableCell className="whitespace-normal break-words px-2 py-3 text-right align-top tabular-nums sm:px-4">
                      {ingredient.postedContribution
                        ? `${ingredient.postedContribution.approximate ? "≈ " : ""}${ingredient.postedContribution.quantity} ${ingredient.selectedUnitAbbreviation}`
                        : "Saved contribution unavailable"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </WorkspaceTableFrame>
            <p className="mt-5 text-body-sm leading-relaxed text-muted-foreground">
              Calculated recipe contributions. Use View issued totals to see the final stock deductions.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
