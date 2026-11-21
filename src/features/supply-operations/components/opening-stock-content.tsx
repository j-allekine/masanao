"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import LocalDatePicker from "@/components/workspace/local-date-picker";
import WorkspaceLayout, { WorkspaceTaskHeader } from "@/components/workspace/workspace-layout";
import WorkspaceTableFrame from "@/components/workspace/table-frame";
import { useEditorNavigationGuard } from "@/hooks/use-editor-navigation-guard";
import { formatDisplayNumber } from "@/lib/format-display-number";
import { beginOpeningStockAction, discardOpeningStockDraftAction, postOpeningStockAction, saveOpeningStockDraftAction } from "../actions";
import { openingStockProduct, openingStockToday } from "../domain/opening-stock";
import type { OpeningStockLine, OpeningStockWorkspace } from "../opening-stock-types";
import type { CategoryListItem, ItemListItem, UnitListItem } from "../types";
import OpeningStockItemEditor from "./opening-stock-item-editor";
import ItemUnitsSheet from "./item-units-sheet";
import { OpeningStockPosted, OpeningStockReview } from "./opening-stock-review";

export default function OpeningStockContent({ workspace: initial, categories, units }: { workspace: OpeningStockWorkspace; categories: CategoryListItem[]; units: UnitListItem[] }) {
  const [workspace, setWorkspace] = useState(initial);
  const [lines, setLines] = useState(initial.lines);
  const [countDate, setCountDate] = useState(initial.countDate);
  const [note, setNote] = useState(initial.note);
  const signature = JSON.stringify({ countDate, note, lines });
  const [savedSignature, setSavedSignature] = useState(signature);
  const [pending, startTransition] = useTransition();
  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [managedItemId, setManagedItemId] = useState<string | null>(null);
  const managedUnitButtonRef = useRef<HTMLButtonElement>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [zeroAcknowledged, setZeroAcknowledged] = useState(false);
  const [postingError, setPostingError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const errorRef = useRef<HTMLDivElement>(null);
  const dirty = workspace.status === "draft" && signature !== savedSignature;
  const guard = useEditorNavigationGuard(dirty, pending);
  const editing = hydrated && workspace.canManage && workspace.status === "draft";

  function failure(message: string, errors: Record<string, string> = {}) {
    setError(message); setFields(errors);
  }
  useEffect(() => {
    if (!error || pending) return;
    const key = Object.keys(fields)[0];
    const target = key ? [...document.querySelectorAll<HTMLElement>(`[data-opening-field="${key}"]`)].find((element) => element.getClientRects().length > 0) : null;
    (target ?? errorRef.current)?.focus();
  }, [error, fields, pending]);
  function changeLine(id: string, patch: Partial<OpeningStockLine>) {
    setLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
    setFields({}); setError(""); setMessage("");
  }
  function addItem(item: ItemListItem) {
    setLines((current) => [...current, { id: crypto.randomUUID(), itemId: item.id, itemName: item.name, quantity: "", position: current.length,
      selectedUnitId: item.baseUnit.id, selectedUnitName: item.baseUnit.name, selectedUnitAbbreviation: item.baseUnit.abbreviation,
      baseUnitId: item.baseUnit.id, baseUnitName: item.baseUnit.name, baseUnitAbbreviation: item.baseUnit.abbreviation,
      conversionId: null, conversionFactor: "1", openingUnitCost: "", zeroCostReason: "", calculatedBaseUnitQuantity: null, lineAmount: null }]);
    setPickerOpen(false); setSearch(""); setMessage(`${item.name} added. Enter its counted quantity and opening cost.`);
  }
  function begin() {
    const attemptId = crypto.randomUUID();
    startTransition(async () => {
      const result = await beginOpeningStockAction({ attemptId, revision: workspace.revision });
      if (!result.ok) { failure(result.error, result.fields); return; }
      const date = openingStockToday();
      setWorkspace({ ...workspace, status: "draft", attemptId, revision: result.value.revision });
      setCountDate(date); setNote(""); setLines([]); setSavedSignature(JSON.stringify({ countDate: date, note: "", lines: [] })); setError("");
    });
  }
  function save(openReview = false) {
    startTransition(async () => {
      const result = await saveOpeningStockDraftAction({ attemptId: workspace.attemptId, revision: workspace.revision, countDate, note, lines });
      if (!result.ok) { failure(result.error, result.fields); return; }
      setWorkspace({ ...workspace, revision: result.value.revision }); setSavedSignature(signature); setFields({}); setError(""); setMessage("Opening Stock draft saved. No stock has moved.");
      if (openReview) { setZeroAcknowledged(false); setPostingError(""); setReviewOpen(true); }
    });
  }
  function post() {
    startTransition(async () => {
      const result = await postOpeningStockAction({ attemptId: workspace.attemptId, revision: workspace.revision, zeroCostAcknowledged: zeroAcknowledged });
      if (!result.ok) { setPostingError(result.error); return; }
      // Review saved this exact count, so the navigation guard is already clean.
      // Reload the immutable server snapshot rather than synthesizing posted evidence.
      window.location.reload();
    });
  }
  function discard() {
    startTransition(async () => {
      const result = await discardOpeningStockDraftAction({ attemptId: workspace.attemptId, revision: workspace.revision });
      if (!result.ok) { failure(result.error, result.fields); return; }
      setDiscardOpen(false); setWorkspace({ ...workspace, status: "not-started", attemptId: null, revision: result.value.revision });
      setLines([]); setCountDate(""); setNote(""); setSavedSignature(JSON.stringify({ countDate: "", note: "", lines: [] })); setError(""); setMessage("Setup draft discarded. Receiving and issuance are available again. Catalog Items and units were kept.");
    });
  }
  // Array order is the recorded source priority. IDs remain attached to edits.
  function moveLine(id: string, offset: number) {
    setFields({}); setError(""); setMessage("");
    setLines((current) => {
      const next = [...current];
      const index = next.findIndex((line) => line.id === id);
      if (index < 0 || index + offset < 0 || index + offset >= next.length) return current;
      [next[index], next[index + offset]] = [next[index + offset], next[index]];
      return next.map((line, position) => ({ ...line, position }));
    });
  }
  function lineName(line: OpeningStockLine) {
    const index = lines.findIndex((entry) => entry.id === line.id);
    return lines.filter((entry) => entry.itemId === line.itemId).length > 1 ? `${line.itemName}, line ${index + 1}` : line.itemName;
  }
  function lineActions(line: OpeningStockLine, index: number) {
    const item = workspace.items.find((entry) => entry.id === line.itemId);
    const firstForItem = lines.find((entry) => entry.itemId === line.itemId)?.id === line.id;
    return <div className="flex flex-wrap items-center gap-1">
      {editing && firstForItem && item && <Button type="button" variant="link" size="sm" className="h-auto max-w-full px-0 whitespace-normal text-left" disabled={pending} aria-label={`Add another cost line for ${item.name}`} onClick={() => addItem(item)}>Add another cost line</Button>}
      <Button type="button" variant="ghost" size="icon-sm" disabled={!editing || pending || index === 0} aria-label={`Move line ${index + 1} up`} onClick={() => moveLine(line.id, -1)}><ArrowUp /></Button>
      <Button type="button" variant="ghost" size="icon-sm" disabled={!editing || pending || index === lines.length - 1} aria-label={`Move line ${index + 1} down`} onClick={() => moveLine(line.id, 1)}><ArrowDown /></Button>
      {remove(line)}
    </div>;
  }
  function quantityInput(line: OpeningStockLine, index: number, prefix: string) {
    const key = `lines.${index}.quantity`;
    return <Field data-invalid={Boolean(fields[key])}><FieldLabel className="sr-only" htmlFor={`${prefix}-${line.id}-quantity`}>Quantity for {lineName(line)}</FieldLabel><Input id={`${prefix}-${line.id}-quantity`} data-opening-field={key} aria-invalid={Boolean(fields[key])} aria-describedby={fields[key] ? `${prefix}-${line.id}-quantity-error` : undefined} inputMode="decimal" value={line.quantity} disabled={!editing || pending} placeholder="Counted quantity" onChange={(event) => changeLine(line.id, { quantity: event.target.value })} />{fields[key] && <FieldError id={`${prefix}-${line.id}-quantity-error`}>{fields[key]}</FieldError>}</Field>;
  }
  function costInput(line: OpeningStockLine, index: number, prefix: string) {
    const key = `lines.${index}.openingUnitCost`;
    return <Field data-invalid={Boolean(fields[key])}><FieldLabel className="sr-only" htmlFor={`${prefix}-${line.id}-cost`}>Opening unit cost for {lineName(line)}</FieldLabel><Input id={`${prefix}-${line.id}-cost`} data-opening-field={key} aria-invalid={Boolean(fields[key])} inputMode="decimal" value={line.openingUnitCost} disabled={!editing || pending} placeholder="Unknown" onChange={(event) => changeLine(line.id, { openingUnitCost: event.target.value })} />{fields[key] && <FieldError>{fields[key]}</FieldError>}</Field>;
  }
  function unitInput(line: OpeningStockLine, prefix: string) {
    const item = workspace.items.find((entry) => entry.id === line.itemId);
    const options = [{ value: "base", label: line.baseUnitAbbreviation }, ...(item?.unitConversions ?? []).filter((entry) => entry.alternateUnit.active).map((entry) => ({ value: entry.id, label: entry.label }))];
    return <div className="flex min-w-0 flex-col gap-1"><Select items={options} value={line.conversionId ?? "base"} disabled={!editing || pending} onValueChange={(value) => {
      const conversion = item?.unitConversions?.find((entry) => entry.id === value);
      changeLine(line.id, { conversionId: conversion?.id ?? null, selectedUnitId: conversion?.alternateUnit.id ?? line.baseUnitId,
        selectedUnitName: conversion?.alternateUnit.name ?? line.baseUnitName, selectedUnitAbbreviation: conversion?.alternateUnit.abbreviation ?? line.baseUnitAbbreviation, conversionFactor: conversion?.baseUnitQuantity ?? "1" });
    }}><SelectTrigger id={`${prefix}-${line.id}-unit`} aria-label={`Unit for ${lineName(line)}`} className="w-full min-w-0"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{options.map((option) => <SelectItem value={option.value} key={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectContent></Select>{line.conversionId && <p className="text-body-sm text-muted-foreground whitespace-normal break-words">1 {line.selectedUnitName} = {formatDisplayNumber(line.conversionFactor)} {line.baseUnitAbbreviation}</p>}{editing && item && <Button type="button" variant="link" size="sm" className="w-fit px-0" disabled={pending} aria-label={`Manage units for ${line.itemName}`} onClick={(event) => { managedUnitButtonRef.current = event.currentTarget; setManagedItemId(item.id); }}>Manage units</Button>}</div>;
  }
  function zeroReason(line: OpeningStockLine, prefix: string) {
    if (!/^0+(?:\.0+)?$/.test(line.openingUnitCost)) return null;
    return <Field><FieldLabel htmlFor={`${prefix}-${line.id}-zero`}>Reason for zero cost{lines.filter((entry) => entry.itemId === line.itemId).length > 1 && <span className="sr-only"> for {lineName(line)}</span>}</FieldLabel><Input id={`${prefix}-${line.id}-zero`} disabled={!editing || pending} value={line.zeroCostReason} onChange={(event) => changeLine(line.id, { zeroCostReason: event.target.value })} placeholder="Explain the assigned zero value" /></Field>;
  }
  const equivalent = (line: OpeningStockLine) => {
    const quantity = openingStockProduct(line.quantity, line.conversionFactor);
    return quantity === null ? "Not counted" : `${formatDisplayNumber(quantity)} ${line.baseUnitAbbreviation}`;
  };
  const amount = (line: OpeningStockLine) => {
    const value = line.openingUnitCost === "" ? null : openingStockProduct(line.quantity, line.openingUnitCost);
    return value === null ? "Unknown" : `₱${formatDisplayNumber(value)}`;
  };
  const remove = (line: OpeningStockLine) => <Button type="button" size="icon-sm" variant="ghost" disabled={!editing || pending} aria-label={`Remove ${lineName(line)}`} onClick={() => { setFields({}); setError(""); setMessage(""); setLines((current) => current.filter((entry) => entry.id !== line.id).map((entry, position) => ({ ...entry, position }))); }}><Trash2 /></Button>;
  if (workspace.status === "posted") return <OpeningStockPosted workspace={workspace} />;
  return <WorkspaceLayout workspaceTitle="Supply Operations" data-opening-stock-ready={hydrated ? "true" : undefined} task={<WorkspaceTaskHeader actions={<Button variant="outline" nativeButton={false} render={<Link href="/inventory" />}>Inventory</Button>}><h1 className="text-heading-3 font-semibold">Opening Stock</h1><Badge variant="secondary">{workspace.status === "not-started" ? "Not started" : workspace.status === "draft" ? "Draft" : "Posted"}</Badge></WorkspaceTaskHeader>}>
    <div className="mx-auto flex w-full min-w-0 max-w-content flex-col gap-6 px-4 py-6 sm:px-6">
      {error && <Alert variant="destructive" ref={errorRef} tabIndex={-1}><AlertTitle>Review the starting count</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      {message && <p role="status" className="text-body-sm text-muted-foreground">{message}</p>}
      {workspace.status === "not-started" ? <Card><CardHeader><CardTitle>Start with what’s already in your kitchen</CardTitle></CardHeader><CardContent className="flex flex-col gap-4"><p className="text-body-sm text-muted-foreground">Count supplies on hand before ordinary receiving and issuance begin. Original Purchase Orders are not required.</p>{!workspace.eligible && <Alert><AlertTitle>Stock history already exists</AlertTitle><AlertDescription>Opening Stock needs a clean operational start. Existing records have not been changed.</AlertDescription></Alert>}{workspace.canManage ? <Button className="w-fit" disabled={!hydrated || pending || !workspace.eligible} onClick={begin}>Start opening stock</Button> : <p className="text-body-sm">An administrator prepares the initial count.</p>}</CardContent></Card> : <>
        <div><h2 className="text-heading-2 font-semibold">Start with what’s already in your kitchen</h2><p className="mt-2 text-body-sm text-muted-foreground">Save while counting. Drafts do not move stock. Receiving and issuance pause until an administrator completes or discards setup.</p></div>
        <FieldSet disabled={!editing || pending}><FieldGroup className="grid gap-4 sm:grid-cols-2"><LocalDatePicker id="opening-count-date" name="countDate" label="Stock counted as of" emptyLabel="Choose count date" value={countDate} error={fields.countDate ? [fields.countDate] : undefined} onChange={setCountDate} /><Field data-invalid={Boolean(fields.note)}><FieldLabel htmlFor="opening-note">Reference / notes (optional)</FieldLabel><Input id="opening-note" maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} />{fields.note && <FieldError>{fields.note}</FieldError>}</Field></FieldGroup></FieldSet>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-heading-3 font-semibold">Items on hand</h2><p className="text-body-sm text-muted-foreground">Enter physical quantities and cost per selected unit. Use another cost line only when the same Item has a distinct supported cost.</p></div>{editing && <Button disabled={pending} onClick={() => setPickerOpen(true)}><Plus data-icon="inline-start" />Add items</Button>}</div>
        {!lines.length ? <Empty><EmptyHeader><EmptyTitle>No Items counted yet</EmptyTitle><EmptyDescription>Add an existing Item to begin. Empty drafts can be saved or discarded.</EmptyDescription></EmptyHeader></Empty> : <>
          <div className="hidden md:block"><WorkspaceTableFrame caption="Opening Stock count"><TableHeader><TableRow>{["Item", "Counted quantity", "Unit", "Equivalent stock", "Opening unit cost", "Line amount", ""].map((label) => <TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader><TableBody>{lines.map((line, index) => <TableRow key={line.id}><TableCell className="min-w-32 max-w-48 whitespace-normal break-words">{line.itemName}<p className="text-body-sm text-muted-foreground">Line {index + 1}</p></TableCell><TableCell className="min-w-28">{quantityInput(line, index, "desktop")}</TableCell><TableCell className="min-w-36">{unitInput(line, "desktop")}</TableCell><TableCell>{equivalent(line)}</TableCell><TableCell className="min-w-36">{costInput(line, index, "desktop")}{zeroReason(line, "desktop")}</TableCell><TableCell>{amount(line)}</TableCell><TableCell className="max-w-48 whitespace-normal">{lineActions(line, index)}</TableCell></TableRow>)}</TableBody></WorkspaceTableFrame></div>
          <div className="flex flex-col gap-3 md:hidden">{lines.map((line, index) => <Card key={line.id} size="sm"><CardHeader><CardTitle className="break-words">{line.itemName}</CardTitle><p className="text-body-sm text-muted-foreground">Line {index + 1}</p></CardHeader><CardContent className="flex flex-col gap-3"><FieldGroup className="grid grid-cols-2 gap-3"><Field><FieldLabel>Counted quantity</FieldLabel>{quantityInput(line, index, "mobile")}</Field><Field><FieldLabel>Unit</FieldLabel>{unitInput(line, "mobile")}</Field><Field><FieldLabel>Opening unit cost</FieldLabel>{costInput(line, index, "mobile")}</Field><Field><FieldLabel>Line amount</FieldLabel><p>{amount(line)}</p></Field></FieldGroup><p className="text-body-sm">Equivalent stock: <strong>{equivalent(line)}</strong></p>{zeroReason(line, "mobile")}<div>{lineActions(line, index)}</div></CardContent></Card>)}</div>
        </>}
        {editing && <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><p className="text-body-sm text-muted-foreground">{new Set(lines.map((line) => line.itemId)).size} Items · {lines.length} lines · {dirty ? "Unsaved changes" : "Saved draft"}</p><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={pending} onClick={() => setDiscardOpen(true)}>Discard setup draft</Button><Button variant="outline" disabled={pending || !hydrated} onClick={() => save()}>{pending ? "Saving…" : "Save draft"}</Button><Button disabled={pending || !hydrated || !lines.length} onClick={() => save(true)}>Review opening stock</Button></div></div>}
      </>}
    </div>
    <Dialog open={pickerOpen} onOpenChange={setPickerOpen}><DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>Add items</DialogTitle><DialogDescription>Choose an existing Item or create a missing supply without losing the count.</DialogDescription></DialogHeader><FieldGroup><Field><FieldLabel htmlFor="opening-search">Search Items</FieldLabel><Input autoFocus id="opening-search" value={search} onChange={(event) => setSearch(event.target.value)} /></Field></FieldGroup><div className="flex max-h-72 flex-col gap-2 overflow-y-auto">{workspace.items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())).map((item) => <Button key={item.id} variant="outline" className="h-auto justify-between gap-3 py-3 whitespace-normal" disabled={lines.some((line) => line.itemId === item.id)} onClick={() => addItem(item)}><span className="min-w-0 break-words text-left">{item.name}<span className="block text-body-sm font-normal text-muted-foreground">{item.category.name} · {item.baseUnit.abbreviation}</span></span><span>{lines.some((line) => line.itemId === item.id) ? "Added" : "Add"}</span></Button>)}{!workspace.items.some((item) => item.name.toLowerCase().includes(search.toLowerCase())) && <p className="text-body-sm text-muted-foreground">No matching active Items.</p>}</div><Button type="button" variant="outline" onClick={() => { setPickerOpen(false); setCreateItemOpen(true); }}><Plus data-icon="inline-start" />Create Item{search ? `: ${search}` : ""}</Button></DialogContent></Dialog>
    {createItemOpen && <OpeningStockItemEditor initialName={search} categories={categories} units={units} onClose={() => { setCreateItemOpen(false); setPickerOpen(true); }} onSuccess={(item) => { setWorkspace((current) => ({ ...current, items: [...current.items, item] })); setCreateItemOpen(false); addItem(item); }} />}
    <ItemUnitsSheet item={workspace.items.find((item) => item.id === managedItemId) ?? null} units={units} canManage={workspace.canManage} open={Boolean(managedItemId)} onOpenChange={(open) => { if (!open) { setManagedItemId(null); requestAnimationFrame(() => managedUnitButtonRef.current?.focus()); } }} onSaved={(conversion) => { setWorkspace((current) => ({ ...current, items: current.items.map((item) => item.id === managedItemId ? { ...item, unitConversions: [...item.unitConversions ?? [], conversion] } : item) })); setMessage("Alternate unit added. Counted quantities and selected conversions were kept."); }} />
    <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Discard setup draft?</AlertDialogTitle><AlertDialogDescription>This clears the starting count and releases receiving and issuance. Catalog Items and their units remain. No stock will move.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={pending}>Keep counting</AlertDialogCancel><AlertDialogAction disabled={pending} onClick={(event) => { event.preventDefault(); discard(); }}>Discard setup draft</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={Boolean(guard.exitRequest)} onOpenChange={(open) => { if (!open) guard.dismissExit(); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Leave unsaved count changes?</AlertDialogTitle><AlertDialogDescription>Your saved draft remains. Changes since your last save will be lost.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Stay here</AlertDialogCancel><AlertDialogAction onClick={() => guard.confirmExit(() => {})}>Leave without saving</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <OpeningStockReview open={reviewOpen} onOpenChange={setReviewOpen} lines={lines.map((line, position) => ({ ...line, position, calculatedBaseUnitQuantity: openingStockProduct(line.quantity, line.conversionFactor), lineAmount: line.openingUnitCost === "" ? null : openingStockProduct(line.quantity, line.openingUnitCost) }))} countDate={countDate} note={note} pending={pending} error={postingError} zeroAcknowledged={zeroAcknowledged} onZeroAcknowledgedChange={setZeroAcknowledged} onPost={post} />
  </WorkspaceLayout>;
}
