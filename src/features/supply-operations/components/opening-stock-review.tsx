"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import WorkspaceLayout, { WorkspaceTaskHeader } from "@/components/workspace/workspace-layout";
import WorkspaceTableFrame from "@/components/workspace/table-frame";
import { addRational, decimalRational, finiteDecimal, rational } from "@/features/issuance/domain/rational";
import { formatDisplayNumber } from "@/lib/format-display-number";
import type { OpeningStockLine, OpeningStockWorkspace } from "../opening-stock-types";
import { openingStockProduct } from "../domain/opening-stock";

function money(amount: string | null) {
  return amount === null ? "Unknown" : `₱${formatDisplayNumber(amount)}`;
}

function totalAmount(lines: OpeningStockLine[]) {
  let total = rational(BigInt(0));
  for (const line of lines) {
    const amount = openingStockProduct(line.quantity, line.openingUnitCost);
    if (amount === null) return null;
    total = addRational(total, decimalRational(amount));
  }
  return finiteDecimal(total);
}

export function CountEvidence({ lines }: { lines: OpeningStockLine[] }) {
  return <>
    <p className="text-body-sm text-muted-foreground">Opening lines are allocated in their recorded order, before later deliveries. This is an allocation convention because original purchase chronology is unknown; it does not prove physical picking order.</p>
    <div className="hidden md:block">
      <WorkspaceTableFrame caption="Opening Stock quantities and costs">
        <TableHeader><TableRow>{["Item", "Counted quantity", "Equivalent stock", "Opening unit cost", "Line amount"].map((label) => <TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{lines.map((line) => <TableRow key={line.id}>
          <TableCell className="max-w-48 whitespace-normal break-words">{line.itemName}<p className="text-body-sm text-muted-foreground">Line {line.position + 1}</p>{/^0+(?:\.0+)?$/.test(line.openingUnitCost) && line.zeroCostReason && <p className="mt-1 text-body-sm text-muted-foreground">Zero-cost reason: {line.zeroCostReason}</p>}</TableCell>
          <TableCell className="whitespace-normal">{formatDisplayNumber(line.quantity)} {line.selectedUnitAbbreviation}{line.conversionId && <p className="text-body-sm text-muted-foreground">1 {line.selectedUnitAbbreviation} = {formatDisplayNumber(line.conversionFactor)} {line.baseUnitAbbreviation}</p>}</TableCell>
          <TableCell className="whitespace-normal tabular-nums">{formatDisplayNumber(line.calculatedBaseUnitQuantity ?? openingStockProduct(line.quantity, line.conversionFactor))} {line.baseUnitAbbreviation}</TableCell>
          <TableCell className="whitespace-normal tabular-nums">{money(line.openingUnitCost || null)} / {line.selectedUnitAbbreviation}</TableCell>
          <TableCell className="whitespace-normal tabular-nums">{money(line.lineAmount ?? openingStockProduct(line.quantity, line.openingUnitCost))}</TableCell>
        </TableRow>)}</TableBody>
      </WorkspaceTableFrame>
    </div>
    <div className="flex flex-col gap-3 md:hidden">{lines.map((line) => <Card key={line.id} size="sm">
      <CardHeader><CardTitle className="break-words">{line.itemName}</CardTitle><p className="text-body-sm text-muted-foreground">Line {line.position + 1}</p></CardHeader>
      <CardContent className="flex flex-col gap-3">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-body-sm">
          <dt className="text-muted-foreground">Counted</dt><dd className="break-words text-right tabular-nums">{formatDisplayNumber(line.quantity)} {line.selectedUnitAbbreviation}</dd>
          <dt className="text-muted-foreground">Equivalent stock</dt><dd className="break-words text-right tabular-nums">{formatDisplayNumber(line.calculatedBaseUnitQuantity ?? openingStockProduct(line.quantity, line.conversionFactor))} {line.baseUnitAbbreviation}</dd>
          <dt className="text-muted-foreground">Opening unit cost</dt><dd className="break-words text-right tabular-nums">{money(line.openingUnitCost || null)} / {line.selectedUnitAbbreviation}</dd>
          <dt className="text-muted-foreground">Line amount</dt><dd className="break-words text-right font-medium tabular-nums">{money(line.lineAmount ?? openingStockProduct(line.quantity, line.openingUnitCost))}</dd>
        </dl>
        {line.conversionId && <p className="text-body-sm text-muted-foreground">1 {line.selectedUnitAbbreviation} = {formatDisplayNumber(line.conversionFactor)} {line.baseUnitAbbreviation}</p>}
        {/^0+(?:\.0+)?$/.test(line.openingUnitCost) && line.zeroCostReason && <p className="break-words text-body-sm text-muted-foreground">Zero-cost reason: {line.zeroCostReason}</p>}
      </CardContent>
    </Card>)}</div>
    <p className="text-right text-body-sm">Opening value: <strong className="tabular-nums">{money(totalAmount(lines))}</strong></p>
  </>;
}

export function OpeningStockReview({ open, onOpenChange, lines, countDate, note, pending, error, zeroAcknowledged, onZeroAcknowledgedChange, onPost, returnFocusRef }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: OpeningStockLine[];
  countDate: string;
  note: string;
  pending: boolean;
  error: string;
  zeroAcknowledged: boolean;
  onZeroAcknowledgedChange: (value: boolean) => void;
  onPost: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}) {
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error && !pending) errorRef.current?.focus(); }, [error, pending]);
  const zeroLines = lines.filter((line) => /^0+(?:\.0+)?$/.test(line.openingUnitCost));
  const incomplete = !countDate || !lines.length || lines.some((line) => !line.quantity || line.openingUnitCost === "" || (/^0+(?:\.0+)?$/.test(line.openingUnitCost) && !line.zeroCostReason.trim()));
  return <Dialog open={open} onOpenChange={(nextOpen) => { if (!pending) onOpenChange(nextOpen); }}>
    <DialogContent finalFocus={returnFocusRef} showCloseButton={!pending} className="max-h-[calc(100svh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-4xl">
      <DialogHeader className="pr-8"><DialogTitle>Review opening stock</DialogTitle><DialogDescription>Posting makes these quantities available for issuance. The posted count will be read-only.</DialogDescription></DialogHeader>
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pb-2">
        {error && <Alert variant="destructive" role="alert" ref={errorRef} tabIndex={-1}><AlertTitle>Opening Stock was not posted</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        <dl className="grid gap-3 text-body-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Stock counted as of</dt><dd>{countDate || "Not entered"}</dd></div><div><dt className="text-muted-foreground">Reference / notes</dt><dd className="break-words">{note || "None provided"}</dd></div></dl>
        <p className="text-body-sm text-muted-foreground">The count represents stock at the beginning of the selected day, before that day’s deliveries and issuance.</p>
        {incomplete && <Alert><AlertTitle>Complete the count before posting</AlertTitle><AlertDescription>Return to the count and enter its date, a positive quantity and an explicit cost for every Item. Each zero cost needs a reason.</AlertDescription></Alert>}
        <CountEvidence lines={lines} />
        {zeroLines.length > 0 && <FieldSet disabled={pending} className="gap-2"><FieldLegend>Confirm zero opening costs</FieldLegend><p className="text-body-sm text-muted-foreground">{zeroLines.map((line) => line.itemName).join(", ")} will contribute ₱0 to operational supply costs.</p><Field orientation="horizontal"><Checkbox id="opening-zero-acknowledgment" checked={zeroAcknowledged} onCheckedChange={(checked) => onZeroAcknowledgedChange(checked === true)} /><FieldLabel htmlFor="opening-zero-acknowledgment">I confirm the zero costs and their recorded reasons.</FieldLabel></Field></FieldSet>}
      </div>
      <DialogFooter><Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>Back to count</Button><Button disabled={pending || incomplete || (zeroLines.length > 0 && !zeroAcknowledged)} onClick={onPost}>{pending ? "Posting…" : "Post opening stock"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

export function OpeningStockPosted({ workspace, children }: { workspace: OpeningStockWorkspace; children?: ReactNode }) {
  return <WorkspaceLayout workspaceTitle="Supply Operations" task={<WorkspaceTaskHeader actions={<Button variant="outline" nativeButton={false} render={<Link href="/inventory" />}>Inventory</Button>}><h1 className="text-heading-3 font-semibold">Opening Stock</h1><Badge>Posted</Badge></WorkspaceTaskHeader>}>
    <div className="mx-auto flex w-full min-w-0 max-w-content flex-col gap-6 px-4 py-6 sm:px-6">
      <div><h2 className="text-heading-2 font-semibold">{workspace.reference || "Opening Stock"}</h2><p className="mt-2 text-body-sm text-muted-foreground">These starting quantities were posted as stock. The original count is read-only.</p></div>
      <dl className="grid gap-4 text-body-sm sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-muted-foreground">Count date</dt><dd>{workspace.countDate}</dd></div>
        <div><dt className="text-muted-foreground">Posted by</dt><dd className="break-words">{workspace.postedByName || "Not recorded"}</dd></div>
        <div><dt className="text-muted-foreground">Posted at</dt><dd>{workspace.postedAt ? <time dateTime={workspace.postedAt}>{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(workspace.postedAt))}</time> : "Not recorded"}</dd></div>
        <div><dt className="text-muted-foreground">Reference / notes</dt><dd className="break-words">{workspace.note || "None provided"}</dd></div>
      </dl>
      <h2 className="text-heading-3 font-semibold">Original counted quantities</h2>
      <CountEvidence lines={workspace.lines} />
      <p className="text-body-sm text-muted-foreground">Assigned opening costs support operational supply-cost reporting. Original Purchase Orders are not required for these sources.</p>
      {children}
    </div>
  </WorkspaceLayout>;
}
