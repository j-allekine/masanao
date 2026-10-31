"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import CatalogPagination, { getCatalogPageContainingItem } from "@/components/workspace/catalog-pagination";
import { filterReceiptHistory, getReceiptHistoryQuery, getReceiptHistoryState, RECEIPT_PAGE_SIZE } from "./receipt-history-state";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { formatDeliveryReceiptAmount } from "../domain/delivery-receipt";
import { summarizePurchaseOrderDeliveries } from "../domain/purchase-order-delivery-summary";
import type { DeliveryReceiptHistoryItem } from "../types";
import PurchaseOrderDeliveredAmount from "./purchase-order-delivered-amount";
import WorkspaceTableFrame from "@/components/workspace/table-frame";
import { ListEmptyState } from "@/components/workspace/list-empty-state";
import { Inbox } from "lucide-react";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}

function formatPostedAt(value: string) {
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function replaceHistoryUrl(url: string) {
  // Next copies its current routing tree into native history updates. Passing
  // its private markers back skips that integration and leaves searchParams
  // stale. Preserve other owners' metadata while letting Next copy its own.
  const data = { ...window.history.state };
  delete data.__NA;
  delete data._N;
  window.history.replaceState(data, "", url);
}

export default function DeliveryReceiptHistory({
  deliveryReceipts,
}: {
  deliveryReceipts: DeliveryReceiptHistoryItem[];
}) {
  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const selectedReceipt = deliveryReceipts.find((receipt) => receipt.id === selectedReceiptId) ?? null;
  const total = summarizePurchaseOrderDeliveries(deliveryReceipts);
  const pathname = usePathname();
  const params = useSearchParams();
  const query = params.toString();
  const state = getReceiptHistoryState(params);
  const filtered = filterReceiptHistory(deliveryReceipts, state.search);
  const pageCount = Math.max(1, Math.ceil(filtered.length / RECEIPT_PAGE_SIZE));
  const page = Math.min(state.page, pageCount);
  const start = (page - 1) * RECEIPT_PAGE_SIZE;
  const visible = filtered.slice(start, start + RECEIPT_PAGE_SIZE);
  const created = params.get("receiptCreated");
  const handledCreated = useRef<string | null>(null);
  const showControls = deliveryReceipts.length > RECEIPT_PAGE_SIZE || Boolean(state.search);
  function update(updates: Parameters<typeof getReceiptHistoryQuery>[1]) {
    const next = getReceiptHistoryQuery(window.location.search.slice(1), updates);
    replaceHistoryUrl(`${pathname}${next ? `?${next}` : ""}${window.location.hash}`);
  }
  useEffect(() => {
    if (!created || handledCreated.current === created || !deliveryReceipts.some((receipt) => receipt.id === created)) return;
    handledCreated.current = created;
    const matching = filterReceiptHistory(deliveryReceipts, state.search);
    const cleared = !matching.some((receipt) => receipt.id === created);
    const records = cleared ? deliveryReceipts : matching;
    const next = getReceiptHistoryQuery(query, { search: cleared ? "" : state.search, page: getCatalogPageContainingItem(records, created, RECEIPT_PAGE_SIZE), created: null });
    replaceHistoryUrl(`${pathname}${next ? `?${next}` : ""}#delivery-receipt-${created}`);
    if (cleared) toast.info("Receipt search cleared to show the new delivery.");
  }, [created, deliveryReceipts, pathname, query, state.search]);
  useEffect(() => {
    if (created || !handledCreated.current) return;
    const target = document.getElementById(`inspect-receipt-${handledCreated.current}`);
    target?.focus();
  }, [created, page]);
  useEffect(() => {
    if (created || state.page <= pageCount) return;
    const timeout = window.setTimeout(() => {
      const next = getReceiptHistoryQuery(query, { page: pageCount });
      replaceHistoryUrl(`${pathname}${next ? `?${next}` : ""}${window.location.hash}`);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [created, pageCount, pathname, query, state.page]);


  return <>
    {showControls ? <div className="flex min-w-0 flex-wrap items-end gap-3">
      <Field className="min-w-0 flex-1"><FieldLabel htmlFor="receipt-search">Find a receipt</FieldLabel><Input disabled={!hydrated} id="receipt-search" type="search" aria-label="Search receipt numbers" className="min-h-10" value={state.search} placeholder="Search receipt numbers" onChange={(event) => update({ search: event.target.value, page: 1 })} /></Field>
      {state.search ? <Button variant="outline" className="min-h-10" onClick={() => update({ search: "", page: 1 })}>Clear receipt search</Button> : null}
    </div> : null}
    {!visible.length ? <div data-delivery-receipt-history={deliveryReceipts.length ? "no-match" : "empty"}><ListEmptyState icon={<Inbox />} hasFilters={Boolean(state.search)} emptyState={{ title: "No Delivery Receipts yet.", description: "Record a Delivery Receipt when supplies arrive for this Purchase Order." }} filteredState={{ title: "No matching receipts", description: "Clear search to see all receipts.", action: { label: "Clear receipt search", onClick: () => update({ search: "", page: 1 }) } }} /></div> : <WorkspaceTableFrame responsive caption="Delivery Receipt history and delivered amounts">
        <TableHeader>
          <TableRow>
            <TableHead>Receipt number</TableHead>
            <TableHead>Receipt date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((receipt) => <TableRow key={receipt.id} id={`delivery-receipt-${receipt.id}`}>
            <TableCell data-primary data-label="Receipt number" className="whitespace-normal font-medium">
              <Button id={`inspect-receipt-${receipt.id}`} variant="link" className="h-auto min-h-10 max-w-full justify-start whitespace-normal wrap-anywhere p-0 text-left font-medium" onClick={() => setSelectedReceiptId(receipt.id)}>
                {receipt.receiptNo}
              </Button>
            </TableCell>
            <TableCell data-label="Receipt date">{formatDate(receipt.receiptDate)}</TableCell>
            <TableCell data-label="Amount" className="whitespace-normal text-right" data-receipt-amount>
              <PurchaseOrderDeliveredAmount summary={summarizePurchaseOrderDeliveries([receipt])} />
            </TableCell>
          </TableRow>)}
        </TableBody>
    </WorkspaceTableFrame>}
    {showControls ? <CatalogPagination page={page} pageCount={pageCount} start={visible.length ? start + 1 : 0} end={start + visible.length} total={filtered.length} onPageChange={(page) => update({ page })} /> : null}
    <p className="text-right">Total delivered: <span data-delivery-history-total><PurchaseOrderDeliveredAmount summary={total} /></span></p>

    <Dialog open={selectedReceipt !== null} onOpenChange={(open) => { if (!open) { const id = selectedReceiptId; setSelectedReceiptId(null); window.setTimeout(() => document.getElementById(`inspect-receipt-${id}`)?.focus(), 0); } }}>
      {selectedReceipt ? <DialogContent size="wide" initialFocus={() => document.querySelector<HTMLElement>('[role="dialog"]')} className="[&_[data-slot=dialog-close]]:size-10 [&_[data-slot=dialog-footer]_button]:min-h-10" showCloseButton>
        <DialogHeader>
          <p className="text-label font-medium uppercase tracking-label text-primary">Purchase Order · Delivery Receipt</p>
          <DialogTitle>Delivery receipt {selectedReceipt.receiptNo}</DialogTitle>
          <DialogDescription>Vendor: {selectedReceipt.vendorName}</DialogDescription>
        </DialogHeader>
        <div className="flex min-w-0 flex-col gap-6 [container:workspace-content/inline-size]">
          <dl className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1"><dt className="text-label font-medium text-muted-foreground">Purchase Order</dt><dd>{selectedReceipt.purchaseOrderNo}</dd></div>
            <div className="flex flex-col gap-1"><dt className="text-label font-medium text-muted-foreground">Receipt date</dt><dd>{formatDate(selectedReceipt.receiptDate)}</dd></div>
            <div className="flex flex-col gap-1"><dt className="text-label font-medium text-muted-foreground">Posted</dt><dd>{formatPostedAt(selectedReceipt.postedAt)}</dd></div>
            <div className="flex flex-col gap-1"><dt className="text-label font-medium text-muted-foreground">Lines</dt><dd>{selectedReceipt.lines.length}</dd></div>
          </dl>
          <WorkspaceTableFrame responsive caption="Posted Delivery Receipt lines">
              <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Unit</TableHead><TableHead className="text-right">Delivered Qty</TableHead><TableHead className="text-right">Base Unit Qty</TableHead><TableHead className="text-right">Unit price</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>{selectedReceipt.lines.map((line) => <TableRow key={line.id}>
                <TableCell data-primary data-label="Item" className="font-medium">{line.itemName}</TableCell>
                <TableCell data-label="Unit">{line.selectedUnitName}</TableCell>
                <TableCell data-label="Delivered Qty" className="text-right">{line.enteredQuantity}</TableCell>
                <TableCell data-label="Base Unit Qty" className="text-right">{line.calculatedBaseUnitQuantity} {line.baseUnitName}</TableCell>
                <TableCell data-label="Unit price" className="text-right">{line.unitPrice ? `₱ ${formatDeliveryReceiptAmount(line.unitPrice)}` : "Not recorded"}</TableCell>
                <TableCell data-label="Amount" className="text-right">{line.lineAmount ? `₱ ${formatDeliveryReceiptAmount(line.lineAmount)}` : "Not recorded"}</TableCell>
              </TableRow>)}</TableBody>
          </WorkspaceTableFrame>
          <p className="text-right">Total: <span data-receipt-inspection-total><PurchaseOrderDeliveredAmount summary={summarizePurchaseOrderDeliveries([selectedReceipt])} /></span></p>
          <div className="flex flex-col gap-1"><p className="text-label font-medium text-muted-foreground">Receipt note</p><p className="whitespace-pre-wrap">{selectedReceipt.note ?? "Not recorded"}</p></div>
        </div>
        <DialogFooter showCloseButton />
      </DialogContent> : null}
    </Dialog>
  </>;
}
