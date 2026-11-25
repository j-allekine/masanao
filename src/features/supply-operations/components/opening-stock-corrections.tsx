"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEditorNavigationGuard } from "@/hooks/use-editor-navigation-guard";
import { addRational, decimalRational, finiteDecimal } from "@/features/issuance/domain/rational";
import { formatDisplayNumber } from "@/lib/format-display-number";
import { beginOpeningStockCorrectionAction, discardOpeningStockCorrectionAction, postOpeningStockCorrectionAction, saveOpeningStockCorrectionAction } from "../actions";
import { openingStockProduct } from "../domain/opening-stock";
import type { OpeningStockCorrection, OpeningStockCorrectionLine, OpeningStockSourceSummary } from "../opening-stock-correction-types";
import type { OpeningStockWorkspace } from "../opening-stock-types";
import type { CategoryListItem, ItemListItem, UnitListItem } from "../types";
import ItemUnitsSheet from "./item-units-sheet";
import OpeningStockItemEditor from "./opening-stock-item-editor";
import { CountEvidence } from "./opening-stock-review";

const timestamp = (value: string | null) => value ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(value)) : "Assigned when posted";
const value = (centavos: string | null) => centavos === null ? "Pending" : `${centavos.startsWith("-") ? "-" : ""}₱${formatDisplayNumber(openingStockProduct(centavos.replace(/^-/, ""), "0.01"))}`;
const signature = (correction: OpeningStockCorrection) => JSON.stringify({ reason: correction.reason, note: correction.note, lines: correction.lines });
const subscribeHydration = () => () => {};

export default function OpeningStockCorrections({ workspace, categories, units }: { workspace: OpeningStockWorkspace; categories: CategoryListItem[]; units: UnitListItem[] }) {
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const [records, setRecords] = useState(workspace.corrections ?? []);
  const [items, setItems] = useState(workspace.items);
  const [current, setCurrent] = useState<OpeningStockCorrection | null>(null);
  const [saved, setSaved] = useState("");
  const [pending, startTransition] = useTransition();
  const [chooseAction, setChooseAction] = useState(false);
  const [picker, setPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [createItem, setCreateItem] = useState(false);
  const [managedItemId, setManagedItemId] = useState<string | null>(null);
  const unitTrigger = useRef<HTMLButtonElement>(null);
  const [review, setReview] = useState(false);
  const [zeroAcknowledged, setZeroAcknowledged] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [closeRequested, setCloseRequested] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);
  const reducing = current?.kind === "reduce-remaining";
  const correctingCost = current?.kind === "correct-remaining-cost";
  const selectingSource = reducing || correctingCost;
  const actionLabel = (kind: OpeningStockCorrection["kind"]) => kind === "reduce-remaining" ? "Reduce remaining stock" : kind === "correct-remaining-cost" ? "Correct remaining cost" : "Add omitted stock";
  const editing = current?.status === "draft" && workspace.canManage;
  const dirty = Boolean(editing && current && signature(current) !== saved);
  const guard = useEditorNavigationGuard(dirty, pending);
  useEffect(() => { if (error && !pending) errorRef.current?.focus(); }, [error, pending]);

  function failure(message: string, errors: Record<string, string> = {}) { setError(message); setFields(errors); }
  function open(record: OpeningStockCorrection) { setCurrent(record); setSaved(signature(record)); setReview(false); setError(""); setFields({}); setMessage(""); }
  function close() { if (pending) return; if (dirty) setCloseRequested(true); else { setCurrent(null); setReview(false); setError(""); } }
  function change(patch: Partial<OpeningStockCorrection>) { setCurrent((old) => old ? { ...old, ...patch } : old); setFields({}); setError(""); setMessage(""); }
  function changeLine(id: string, patch: Partial<OpeningStockCorrectionLine>) { if (current) change({ lines: current.lines.map((line) => line.id === id ? { ...line, ...patch } : line) }); }
  function begin(kind: OpeningStockCorrection["kind"]) {
    const id = crypto.randomUUID();
    startTransition(async () => {
      const result = await beginOpeningStockCorrectionAction({ id, kind });
      if (!result.ok) { failure(result.error, result.fields); return; }
      const record = result.value.correction;
      setChooseAction(false); setRecords((old) => [...old, record]); open(record);
    });
  }
  function save(openReview = false) {
    if (!current) return;
    const document = current;
    startTransition(async () => {
      const result = await saveOpeningStockCorrectionAction({ id: document.id, revision: document.revision, reason: document.reason, note: document.note, lines: document.lines.map(({ id, sourceId, itemId, quantity, selectedUnitId, conversionId, openingUnitCost, zeroCostReason }) => document.kind === "reduce-remaining" ? { id, sourceId: sourceId ?? "", quantity } : document.kind === "correct-remaining-cost" ? { id, sourceId: sourceId ?? "", openingUnitCost, zeroCostReason } : { id, itemId, quantity, selectedUnitId, conversionId, openingUnitCost, zeroCostReason }) });
      if (!result.ok) { failure(result.error, result.fields); return; }
      const updated = result.value.correction;
      setCurrent(updated); setSaved(signature(updated)); setRecords((old) => old.map((record) => record.id === updated.id ? updated : record)); setFields({}); setError(""); setMessage("Correction draft saved. No stock moved or was reserved.");
      if (openReview) { setReview(true); setZeroAcknowledged(false); }
    });
  }
  function post() {
    if (!current) return;
    startTransition(async () => {
      const result = await postOpeningStockCorrectionAction({ id: current.id, revision: current.revision, zeroCostAcknowledged: zeroAcknowledged });
      if (!result.ok) { failure(result.error, result.fields); return; }
      sessionStorage.setItem("masanao:opening-correction", current.id);
      window.location.reload();
    });
  }
  function discardDraft() {
    if (!current) return;
    startTransition(async () => {
      const result = await discardOpeningStockCorrectionAction({ id: current.id, revision: current.revision });
      if (!result.ok) { setDiscard(false); failure(result.error, result.fields); return; }
      setRecords((old) => old.filter((record) => record.id !== current.id)); setCurrent(null); setDiscard(false); setMessage("Correction draft discarded. Catalog Items and units were kept.");
    });
  }
  useEffect(() => {
    const id = sessionStorage.getItem("masanao:opening-correction");
    if (!id) return;
    const record = workspace.corrections?.find((entry) => entry.id === id && entry.status === "posted");
    const frame = requestAnimationFrame(() => { sessionStorage.removeItem("masanao:opening-correction"); if (record) { setCurrent(record); setSaved(signature(record)); } });
    return () => cancelAnimationFrame(frame);
  }, [workspace.corrections]);
  function togglePicker(open: boolean) { setPicker(open); if (!open) requestAnimationFrame(() => document.getElementById("correction-select-source")?.focus()); }
  function addItem(item: ItemListItem) {
    if (!current) return;
    const sources = (workspace.sources ?? []).filter((source) => source.itemId === item.id);
    // The server refreshes exact before/after evidence during review and posting.
    const line: OpeningStockCorrectionLine = { sourceId: null, sourceReference: null, sourcePosition: null, sourceQuantity: null, sourceAmount: null, id: crypto.randomUUID(), itemId: item.id, itemName: item.name, quantity: "", position: current.lines.length, selectedUnitId: item.baseUnit.id, selectedUnitName: item.baseUnit.name, selectedUnitAbbreviation: item.baseUnit.abbreviation, baseUnitId: item.baseUnit.id, baseUnitName: item.baseUnit.name, baseUnitAbbreviation: item.baseUnit.abbreviation, conversionId: null, conversionFactor: "1", openingUnitCost: "", zeroCostReason: "", calculatedBaseUnitQuantity: null, lineAmount: null, beforeQuantity: sources.length ? "" : "0", beforeValueCentavos: sources.length ? "" : "0", afterQuantity: null, afterValueCentavos: null };
    change({ lines: [...current.lines, line] }); togglePicker(false); setSearch("");
  }
  function addSource(source: OpeningStockSourceSummary) {
    if (!current) return;
    const item = items.find((entry) => entry.id === source.itemId);
    if (!item) return;
    const line: OpeningStockCorrectionLine = { id: crypto.randomUUID(), sourceQuantity: null, sourceAmount: null, sourceId: source.id, sourceReference: source.reference, sourcePosition: source.position, itemId: source.itemId, itemName: source.itemName, quantity: correctingCost ? source.remainingQuantity : "", position: current.lines.length, selectedUnitId: item.baseUnit.id, selectedUnitName: item.baseUnit.name, selectedUnitAbbreviation: source.baseUnitAbbreviation, baseUnitId: item.baseUnit.id, baseUnitName: item.baseUnit.name, baseUnitAbbreviation: source.baseUnitAbbreviation, conversionId: null, conversionFactor: "1", openingUnitCost: "", zeroCostReason: "", calculatedBaseUnitQuantity: null, lineAmount: null, beforeQuantity: source.remainingQuantity, beforeValueCentavos: source.remainingValueCentavos, afterQuantity: null, afterValueCentavos: null };
    change({ lines: [...current.lines, line] }); togglePicker(false); setSearch("");
  }
  function sourceLabel(line: OpeningStockCorrectionLine) {
    const source = workspace.sources?.find((entry) => entry.id === line.sourceId);
    return line.sourceReference ? `${line.sourceReference} · source ${(line.sourcePosition ?? 0) + 1}` : source ? `${source.reference} · source ${source.position + 1}` : "Opening-derived source";
  }
  const zeroLines = reducing ? [] : current?.lines.filter((line) => /^0+(?:\.0+)?$/.test(line.openingUnitCost)) ?? [];
  const incomplete = !current?.reason.trim() || !current.lines.length || current.lines.some((line) => {
    try { if (decimalRational(line.quantity).numerator <= BigInt(0)) return true; } catch { return true; }
    return reducing ? !line.sourceId || line.afterQuantity === null : correctingCost ? !line.sourceId || line.afterValueCentavos === null || line.openingUnitCost === "" || (/^0+(?:\.0+)?$/.test(line.openingUnitCost) && !line.zeroCostReason.trim()) : line.openingUnitCost === "" || openingStockProduct(line.quantity, line.conversionFactor) === null || (/^0+(?:\.0+)?$/.test(line.openingUnitCost) && !line.zeroCostReason.trim());
  });
  const evidence = current?.lines.map((line) => ({ ...line, calculatedBaseUnitQuantity: openingStockProduct(line.quantity, line.conversionFactor), lineAmount: line.openingUnitCost === "" ? null : openingStockProduct(line.quantity, line.openingUnitCost) })) ?? [];
  const additions = new Map<string, { name: string; quantity: string | null; unit: string }>();
  for (const line of evidence) {
    const prior = additions.get(line.itemId);
    let quantity = line.calculatedBaseUnitQuantity;
    if (prior) {
      try { quantity = prior.quantity === null || quantity === null ? null : finiteDecimal(addRational(decimalRational(prior.quantity), decimalRational(quantity))); }
      catch { quantity = null; }
    }
    additions.set(line.itemId, { name: line.itemName, quantity, unit: line.baseUnitAbbreviation });
  }
  return <section aria-labelledby="opening-corrections-heading" data-opening-corrections-ready={hydrated ? "true" : "false"} className="flex min-w-0 flex-col gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="opening-corrections-heading" className="text-heading-3 font-semibold">Corrections</h2><p className="text-body-sm text-muted-foreground">Linked changes preserve the original count and previous issuance costs.</p></div>{workspace.canManage && <Button disabled={!hydrated || pending} onClick={() => setChooseAction(true)}>Record correction</Button>}</div>
    {message && !current && <p role="status" className="text-body-sm">{message}</p>}
    {error && !current && <Alert variant="destructive" ref={errorRef} tabIndex={-1}><AlertTitle>Correction could not be started</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
    {!records.length && <p className="text-body-sm text-muted-foreground">No corrections recorded.</p>}
    {records.map((record) => <Card key={record.id} size="sm"><CardHeader><CardTitle className="flex flex-wrap items-center gap-2"><span className="break-words">{record.reference}</span><Badge variant={record.status === "posted" ? "default" : "secondary"}>{record.status === "posted" ? "Posted" : "Draft"}</Badge></CardTitle></CardHeader><CardContent className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="text-body-sm">{actionLabel(record.kind)} · {record.lines.length} lines</p><p className="break-words text-body-sm text-muted-foreground">{record.reason || "Reason pending"}</p><p className="text-body-sm text-muted-foreground">{record.status === "posted" ? `${record.postedByName ?? "Administrator"} · ${timestamp(record.postedAt)}` : `Saved by ${record.createdByName}`}</p></div><Button variant="outline" disabled={!hydrated || pending} onClick={() => open(record)}>{record.status === "draft" ? "Resume draft" : "View correction"}</Button></CardContent></Card>)}
    <div className="flex flex-col gap-3"><h3 className="text-heading-3 font-semibold">Current opening-derived stock</h3><p className="text-body-sm text-muted-foreground">Original quantities above remain unchanged. Remaining quantities below include posted corrections and issuance.</p>{(workspace.sources ?? []).map((source) => <Card key={source.id} size="sm"><CardHeader><CardTitle className="break-words">{source.itemName}</CardTitle></CardHeader><CardContent><p className="break-words text-body-sm">{source.reference} · source {source.position + 1}{source.correctionId ? " · From correction" : " · Original count"}</p><p className="text-body-sm">Original source quantity: {formatDisplayNumber(source.quantity)} {source.baseUnitAbbreviation}</p><p className="text-body-sm">Remaining: <strong>{formatDisplayNumber(source.remainingQuantity)} {source.baseUnitAbbreviation}</strong> · Residual value: {value(source.remainingValueCentavos)}</p></CardContent></Card>)}</div>
    <Dialog open={Boolean(current) && !picker && !createItem && !managedItemId} onOpenChange={(open) => { if (!open) close(); }}><DialogContent showCloseButton={!pending} className="max-h-[calc(100svh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-4xl"><DialogHeader className="pr-7"><DialogTitle>{review ? "Review correction" : editing && current ? actionLabel(current.kind) : current?.reference}</DialogTitle><DialogDescription>Linked to {workspace.reference ?? "Opening Stock"}. {editing ? "Corrections take effect when posted. Drafts do not block receiving or issuance." : "Posted correction. The original count and prior issuance evidence are preserved."}</DialogDescription></DialogHeader>
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
        {error && <Alert variant="destructive" ref={errorRef} tabIndex={-1}><AlertTitle>Review the correction</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
        {message && <p role="status" className="text-body-sm">{message}</p>}
        {current && <><dl className="grid gap-3 text-body-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Correction reference</dt><dd className="break-words">{current.reference}</dd></div><div><dt className="text-muted-foreground">Posting time</dt><dd>{timestamp(current.postedAt)}</dd></div>{!editing && <div><dt className="text-muted-foreground">Posted by</dt><dd>{current.postedByName}</dd></div>}</dl>
          {editing && !review ? <><FieldGroup><Field data-invalid={Boolean(fields.reason)}><FieldLabel htmlFor="correction-reason">Reason for correction</FieldLabel><Textarea id="correction-reason" value={current.reason} disabled={pending} maxLength={2000} aria-invalid={Boolean(fields.reason)} onChange={(event) => change({ reason: event.target.value })} />{fields.reason && <FieldError>{fields.reason}</FieldError>}</Field><Field data-invalid={Boolean(fields.note)}><FieldLabel htmlFor="correction-note">Supporting notes (optional)</FieldLabel><Textarea id="correction-note" value={current.note} disabled={pending} maxLength={2000} onChange={(event) => change({ note: event.target.value })} /><p className="text-body-sm text-muted-foreground">Notes do not change the server-assigned posting time.</p>{fields.note && <FieldError>{fields.note}</FieldError>}</Field></FieldGroup>
          <Button id="correction-select-source" variant="outline" className="w-fit" disabled={pending} onClick={() => setPicker(true)}><Plus data-icon="inline-start" />{selectingSource ? "Select source lines" : "Add items"}</Button>
          {!current.lines.length && <p className="text-body-sm text-muted-foreground">{correctingCost ? "Select opening-derived sources. The entire remaining quantity is retained at the replacement cost." : reducing ? "Select the opening-derived source to reduce. Drafts do not reserve stock." : "Add an omitted Item. Empty or incomplete drafts can be saved."}</p>}
          {current.lines.map((line, index) => { if (correctingCost) return <CostEditor key={line.id} line={line} sourceLabel={sourceLabel(line)} fields={fields} index={index} pending={pending} onChange={(patch) => changeLine(line.id, patch)} onRemove={() => change({ lines: current.lines.filter((entry) => entry.id !== line.id) })} />; if (reducing) return <ReductionEditor key={line.id} line={line} sourceLabel={sourceLabel(line)} fields={fields} index={index} pending={pending} onChange={(quantity) => changeLine(line.id, { quantity })} onRemove={() => change({ lines: current.lines.filter((entry) => entry.id !== line.id) })} />; const item = items.find((entry) => entry.id === line.itemId); const options = [{ value: "base", label: line.baseUnitAbbreviation }, ...(item?.unitConversions ?? []).filter((entry) => entry.alternateUnit.active).map((entry) => ({ value: entry.id, label: entry.label }))]; return <Card size="sm" key={line.id}><CardHeader><CardTitle className="flex items-start justify-between gap-2"><span className="min-w-0 break-words">{line.itemName}</span><Button size="icon-sm" variant="ghost" disabled={pending} aria-label={`Remove ${line.itemName}`} onClick={() => change({ lines: current.lines.filter((entry) => entry.id !== line.id) })}><Trash2 /></Button></CardTitle></CardHeader><CardContent className="flex min-w-0 flex-col gap-3"><FieldGroup className="grid gap-3 sm:grid-cols-2"><Field data-invalid={Boolean(fields[`lines.${index}.quantity`])}><FieldLabel htmlFor={`correction-${line.id}-quantity`}>Added quantity</FieldLabel><Input id={`correction-${line.id}-quantity`} value={line.quantity} inputMode="decimal" disabled={pending} aria-invalid={Boolean(fields[`lines.${index}.quantity`])} onChange={(event) => changeLine(line.id, { quantity: event.target.value })} />{fields[`lines.${index}.quantity`] && <FieldError>{fields[`lines.${index}.quantity`]}</FieldError>}</Field><Field><FieldLabel htmlFor={`correction-${line.id}-unit`}>Unit</FieldLabel><Select items={options} value={line.conversionId ?? "base"} disabled={pending} onValueChange={(selected) => { const conversion = item?.unitConversions?.find((entry) => entry.id === selected); changeLine(line.id, { conversionId: conversion?.id ?? null, selectedUnitId: conversion?.alternateUnit.id ?? line.baseUnitId, selectedUnitName: conversion?.alternateUnit.name ?? line.baseUnitName, selectedUnitAbbreviation: conversion?.alternateUnit.abbreviation ?? line.baseUnitAbbreviation, conversionFactor: conversion?.baseUnitQuantity ?? "1" }); }}><SelectTrigger id={`correction-${line.id}-unit`} className="w-full min-w-0"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectContent></Select>{item && <Button id={`correction-${line.id}-manage-units`} aria-label={`Manage units for ${line.itemName}`} variant="link" className="w-fit px-0" disabled={pending} onClick={(event) => { unitTrigger.current = event.currentTarget; setManagedItemId(item.id); }}>Manage units</Button>}</Field><Field data-invalid={Boolean(fields[`lines.${index}.openingUnitCost`])}><FieldLabel htmlFor={`correction-${line.id}-cost`}>Opening unit cost</FieldLabel><Input id={`correction-${line.id}-cost`} value={line.openingUnitCost} inputMode="decimal" placeholder="Unknown" disabled={pending} aria-invalid={Boolean(fields[`lines.${index}.openingUnitCost`])} onChange={(event) => changeLine(line.id, { openingUnitCost: event.target.value })} />{fields[`lines.${index}.openingUnitCost`] && <FieldError>{fields[`lines.${index}.openingUnitCost`]}</FieldError>}</Field><Field><FieldLabel>Added value</FieldLabel><p>{line.openingUnitCost === "" ? "Unknown" : `₱${formatDisplayNumber(openingStockProduct(line.quantity, line.openingUnitCost))}`}</p></Field></FieldGroup><p className="text-body-sm">Net stock addition: {formatDisplayNumber(openingStockProduct(line.quantity, line.conversionFactor))} {line.baseUnitAbbreviation}</p>{line.conversionId && <p className="break-words text-body-sm text-muted-foreground">1 {line.selectedUnitAbbreviation} = {formatDisplayNumber(line.conversionFactor)} {line.baseUnitAbbreviation}</p>}{/^0+(?:\.0+)?$/.test(line.openingUnitCost) && <Field data-invalid={Boolean(fields[`lines.${index}.zeroCostReason`])}><FieldLabel htmlFor={`correction-${line.id}-zero`}>Reason for zero cost</FieldLabel><Input id={`correction-${line.id}-zero`} disabled={pending} value={line.zeroCostReason} onChange={(event) => changeLine(line.id, { zeroCostReason: event.target.value })} />{fields[`lines.${index}.zeroCostReason`] && <FieldError>{fields[`lines.${index}.zeroCostReason`]}</FieldError>}</Field>}</CardContent></Card>; })}</> : <><dl className="grid gap-3 text-body-sm"><div><dt className="text-muted-foreground">Reason</dt><dd className="break-words">{current.reason || "Not entered"}</dd></div><div><dt className="text-muted-foreground">Supporting notes</dt><dd className="break-words">{current.note || "None provided"}</dd></div></dl>{correctingCost ? <CostEvidence lines={current.lines} sourceLabel={sourceLabel} /> : reducing ? <ReductionEvidence lines={current.lines} sourceLabel={sourceLabel} /> : <CountEvidence lines={evidence} />}<div className="flex flex-col gap-2"><h3 className="text-heading-3 font-semibold">Net stock effect</h3>{[...additions].map(([id, addition]) => <p key={id} className="break-words text-body-sm">{addition.name}: {correctingCost ? "" : reducing ? "-" : "+"}{correctingCost ? "0" : formatDisplayNumber(addition.quantity)} {addition.unit}</p>)}</div>{!selectingSource && current.lines.map((line) => <p key={line.id} className="break-words text-body-sm">{line.itemName}: opening-derived remainder before {line.beforeQuantity ? `${formatDisplayNumber(line.beforeQuantity)} ${line.baseUnitAbbreviation} (${value(line.beforeValueCentavos)})` : "refreshed at posting"}; net addition +{formatDisplayNumber(openingStockProduct(line.quantity, line.conversionFactor))} {line.baseUnitAbbreviation}{line.afterQuantity !== null ? `; after ${formatDisplayNumber(line.afterQuantity)} ${line.baseUnitAbbreviation} (${value(line.afterValueCentavos)})` : ". Posting records the exact before and after evidence."}</p>)}{editing && incomplete && <Alert><AlertTitle>Complete before posting</AlertTitle><AlertDescription>{correctingCost ? "Enter a reason and explicit replacement costs for the entire remainder. Each zero cost needs an explanation. Save and review again to refresh remaining quantities and values." : reducing ? "Enter a reason and positive reductions within the selected sources. Save and review again to refresh remaining quantities and values." : "Enter a reason, positive quantities and explicit costs. Each zero cost needs an explanation."}</AlertDescription></Alert>}{editing && zeroLines.length > 0 && <Field orientation="horizontal"><Checkbox id="correction-zero-ack" checked={zeroAcknowledged} disabled={pending} onCheckedChange={(checked) => setZeroAcknowledged(checked === true)} /><FieldLabel htmlFor="correction-zero-ack">I confirm the zero costs and their recorded reasons.</FieldLabel></Field>}</>}
        </>}
      </div><DialogFooter>{editing ? review ? <><Button variant="outline" disabled={pending} onClick={() => { setReview(false); setError(""); }}>Back to correction</Button><Button disabled={pending || incomplete || (zeroLines.length > 0 && !zeroAcknowledged)} onClick={post}>{pending ? "Posting…" : "Post correction"}</Button></> : <><Button variant="outline" disabled={pending} onClick={() => setDiscard(true)}>Discard draft</Button><Button variant="outline" disabled={pending} onClick={() => save()}>Save draft</Button><Button disabled={pending || !current?.lines.length} onClick={() => save(true)}>Review correction</Button></> : <Button variant="outline" onClick={close}>Close</Button>}</DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={chooseAction} onOpenChange={setChooseAction}><DialogContent><DialogHeader><DialogTitle>Record correction</DialogTitle><DialogDescription>Choose the change to the posted opening stock. Previous count and issuance evidence are preserved.</DialogDescription></DialogHeader><div className="flex flex-col gap-3"><Button disabled={pending} onClick={() => begin("add-omitted")}>Add omitted stock</Button><Button variant="outline" disabled={pending} onClick={() => begin("reduce-remaining")}>Reduce remaining stock</Button><Button variant="outline" disabled={pending} onClick={() => begin("correct-remaining-cost")}>Correct remaining cost</Button></div></DialogContent></Dialog>
    <Dialog open={picker && selectingSource} onOpenChange={togglePicker}><DialogContent className="max-h-[calc(100svh-2rem)] grid-rows-[auto_auto_minmax(0,1fr)] sm:max-w-xl"><DialogHeader className="pr-7"><DialogTitle>Select source line</DialogTitle><DialogDescription>Choose the exact opening-derived remainder. Delivery Receipts and already-issued quantities are excluded.</DialogDescription></DialogHeader><Field><FieldLabel htmlFor="correction-source-search">Search source Items</FieldLabel><Input id="correction-source-search" value={search} onChange={(event) => setSearch(event.target.value)} /></Field><div className="flex min-h-0 flex-col gap-2 overflow-y-auto">{(workspace.sources ?? []).filter((source) => source.itemName.toLowerCase().includes(search.toLowerCase()) && !current?.lines.some((line) => line.sourceId === source.id)).map((source) => <Button key={source.id} variant="outline" disabled={source.remainingQuantity === "0"} className="h-auto justify-start py-3 whitespace-normal" onClick={() => addSource(source)}><span className="min-w-0 break-words text-left">{source.itemName}<span className="block text-body-sm font-normal">{source.reference} · source {source.position + 1}</span><span className="block text-body-sm font-normal text-muted-foreground">Remaining: {formatDisplayNumber(source.remainingQuantity)} {source.baseUnitAbbreviation} · Residual value: {value(source.remainingValueCentavos)}</span></span></Button>)}{!(workspace.sources ?? []).some((source) => source.itemName.toLowerCase().includes(search.toLowerCase()) && !current?.lines.some((line) => line.sourceId === source.id)) && <p className="text-body-sm text-muted-foreground">No additional source lines match.</p>}</div></DialogContent></Dialog>
    <Dialog open={picker && !selectingSource} onOpenChange={togglePicker}><DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>Add omitted Item</DialogTitle><DialogDescription>Select an existing Item or create a missing supply. Correction inputs stay in place.</DialogDescription></DialogHeader><Field><FieldLabel htmlFor="correction-item-search">Search Items</FieldLabel><Input id="correction-item-search" value={search} onChange={(event) => setSearch(event.target.value)} /></Field><div className="flex max-h-72 flex-col gap-2 overflow-y-auto">{items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())).map((item) => <Button key={item.id} variant="outline" className="h-auto justify-between gap-2 py-3 whitespace-normal" onClick={() => addItem(item)}><span className="min-w-0 break-words text-left">{item.name}<span className="block text-body-sm font-normal text-muted-foreground">{item.category.name} · {item.baseUnit.abbreviation}</span></span><span>Add</span></Button>)}</div><Button variant="outline" className="h-auto whitespace-normal break-words" onClick={() => { setPicker(false); setCreateItem(true); }}><Plus data-icon="inline-start" />Create Item{search ? `: ${search}` : ""}</Button></DialogContent></Dialog>
    {createItem && <OpeningStockItemEditor initialName={search} categories={categories} units={units} onClose={() => { setCreateItem(false); setPicker(true); }} onSuccess={(item) => { setItems((old) => [...old, item]); setCreateItem(false); addItem(item); }} />}
    <ItemUnitsSheet item={items.find((item) => item.id === managedItemId) ?? null} units={units} canManage={workspace.canManage} open={Boolean(managedItemId)} onOpenChange={(open) => { if (!open) { setManagedItemId(null); requestAnimationFrame(() => { const id = unitTrigger.current?.id; if (id) document.getElementById(id)?.focus(); }); } }} onSaved={(conversion) => setItems((old) => old.map((item) => item.id === managedItemId ? { ...item, unitConversions: [...item.unitConversions ?? [], conversion] } : item))} />
    <AlertDialog open={discard} onOpenChange={setDiscard}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Discard correction draft?</AlertDialogTitle><AlertDialogDescription>This removes the unposted correction. The original count, stock, catalog Items and units stay in place.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={pending}>Keep draft</AlertDialogCancel><AlertDialogAction disabled={pending} onClick={(event) => { event.preventDefault(); discardDraft(); }}>Discard correction draft</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={closeRequested || Boolean(guard.exitRequest)} onOpenChange={(open) => { if (!open) { setCloseRequested(false); guard.dismissExit(); } }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Leave unsaved correction changes?</AlertDialogTitle><AlertDialogDescription>Your last saved draft remains. Changes since the last save will be lost.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction onClick={() => { if (guard.exitRequest) guard.confirmExit(() => {}); else { setCurrent(null); setReview(false); } setCloseRequested(false); }}>Leave without saving</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}

function ReductionEditor({ line, sourceLabel, fields, index, pending, onChange, onRemove }: { line: OpeningStockCorrectionLine; sourceLabel: string; fields: Record<string, string>; index: number; pending: boolean; onChange: (quantity: string) => void; onRemove: () => void }) {
  return <Card size="sm"><CardHeader><CardTitle className="flex items-start justify-between gap-2"><span className="min-w-0 break-words">{line.itemName}</span><Button size="icon-sm" variant="ghost" disabled={pending} aria-label={`Remove ${line.itemName}`} onClick={onRemove}><Trash2 /></Button></CardTitle></CardHeader><CardContent className="flex min-w-0 flex-col gap-3"><p className="break-words text-body-sm">{sourceLabel}</p><p className="text-body-sm">Reviewed remaining: {formatDisplayNumber(line.beforeQuantity)} {line.baseUnitAbbreviation} · Residual value: {value(line.beforeValueCentavos)}</p><FieldGroup><Field data-invalid={Boolean(fields[`lines.${index}.quantity`])}><FieldLabel htmlFor={`correction-${line.id}-quantity`}>Reduction quantity ({line.baseUnitAbbreviation})</FieldLabel><Input id={`correction-${line.id}-quantity`} value={line.quantity} inputMode="decimal" disabled={pending} aria-invalid={Boolean(fields[`lines.${index}.quantity`])} onChange={(event) => onChange(event.target.value)} />{fields[`lines.${index}.quantity`] && <FieldError>{fields[`lines.${index}.quantity`]}</FieldError>}</Field></FieldGroup><p className="text-body-sm text-muted-foreground">Value is calculated from the source’s remaining centavos during review. Previously issued stock cannot be reduced.</p>{fields[`lines.${index}.sourceId`] && <FieldError>{fields[`lines.${index}.sourceId`]}</FieldError>}</CardContent></Card>;
}

function ReductionEvidence({ lines, sourceLabel }: { lines: OpeningStockCorrectionLine[]; sourceLabel: (line: OpeningStockCorrectionLine) => string }) {
  return <div className="flex flex-col gap-3">{lines.map((line) => <Card key={line.id} size="sm"><CardHeader><CardTitle className="break-words">{line.itemName}</CardTitle></CardHeader><CardContent className="flex flex-col gap-2 text-body-sm"><p className="break-words">{sourceLabel(line)}</p><p>Reduction: {formatDisplayNumber(line.quantity)} {line.baseUnitAbbreviation}</p><p>Before: {formatDisplayNumber(line.beforeQuantity)} {line.baseUnitAbbreviation} · {value(line.beforeValueCentavos)}</p><p>After: {formatDisplayNumber(line.afterQuantity)} {line.baseUnitAbbreviation} · {value(line.afterValueCentavos)}</p><p>Retired value: {line.beforeValueCentavos && line.afterValueCentavos !== null ? value((BigInt(line.beforeValueCentavos) - BigInt(line.afterValueCentavos)).toString()) : "Pending review"}</p></CardContent></Card>)}</div>;
}

function CostEditor({ line, sourceLabel, fields, index, pending, onChange, onRemove }: { line: OpeningStockCorrectionLine; sourceLabel: string; fields: Record<string, string>; index: number; pending: boolean; onChange: (patch: Partial<OpeningStockCorrectionLine>) => void; onRemove: () => void }) {
  const costError = fields[`lines.${index}.openingUnitCost`];
  const zeroError = fields[`lines.${index}.zeroCostReason`];
  return <Card size="sm"><CardHeader><CardTitle className="flex items-start justify-between gap-2"><span className="min-w-0 break-words">{line.itemName}</span><Button size="icon-sm" variant="ghost" disabled={pending} aria-label={`Remove ${line.itemName}`} onClick={onRemove}><Trash2 /></Button></CardTitle></CardHeader><CardContent className="flex min-w-0 flex-col gap-3">
    <p className="break-words text-body-sm">{sourceLabel}</p>
    <p className="text-body-sm">Entire remaining quantity: {formatDisplayNumber(line.beforeQuantity)} {line.baseUnitAbbreviation}</p>
    <p className="text-body-sm">Old remaining value: {value(line.beforeValueCentavos)}</p>
    <FieldGroup><Field data-invalid={Boolean(costError)}><FieldLabel htmlFor={`correction-${line.id}-cost`}>Replacement cost per Base Unit ({line.baseUnitAbbreviation})</FieldLabel><Input id={`correction-${line.id}-cost`} inputMode="decimal" placeholder="Unknown" disabled={pending} value={line.openingUnitCost} aria-invalid={Boolean(costError)} onChange={(event) => onChange({ openingUnitCost: event.target.value })} />{costError && <FieldError>{costError}</FieldError>}</Field>
    {/^0+(?:\.0+)?$/.test(line.openingUnitCost) && <Field data-invalid={Boolean(zeroError)}><FieldLabel htmlFor={`correction-${line.id}-zero`}>Reason for zero cost</FieldLabel><Input id={`correction-${line.id}-zero`} disabled={pending} value={line.zeroCostReason} aria-invalid={Boolean(zeroError)} onChange={(event) => onChange({ zeroCostReason: event.target.value })} />{zeroError && <FieldError>{zeroError}</FieldError>}</Field>}</FieldGroup>
    <p className="text-body-sm text-muted-foreground">Review calculates the replacement value for this entire remainder. On-hand quantity stays the same. Previously issued costs cannot be changed.</p>
    {fields[`lines.${index}.sourceId`] && <FieldError>{fields[`lines.${index}.sourceId`]}</FieldError>}
  </CardContent></Card>;
}

function CostEvidence({ lines, sourceLabel }: { lines: OpeningStockCorrectionLine[]; sourceLabel: (line: OpeningStockCorrectionLine) => string }) {
  return <div className="flex flex-col gap-3"><p className="text-body-sm text-muted-foreground">Each old remainder is retired and replaced once at its corrected cost. Quantity is unchanged. Previously issued costs remain as posted; historical revaluation is unavailable.</p>{lines.map((line) => <Card key={line.id} size="sm"><CardHeader><CardTitle className="break-words">{line.itemName}</CardTitle></CardHeader><CardContent className="flex flex-col gap-2 text-body-sm">
    <p className="break-words">{sourceLabel(line)}</p>
    <p>Entire remaining quantity: {formatDisplayNumber(line.beforeQuantity)} {line.baseUnitAbbreviation}</p>
    {line.sourceAmount !== null && line.sourceQuantity !== null && <p>Previous source basis: ₱{formatDisplayNumber(line.sourceAmount)} / {formatDisplayNumber(line.sourceQuantity)} {line.baseUnitAbbreviation}</p>}
    <p>Old remaining value: {value(line.beforeValueCentavos)}</p>
    <p>Replacement cost per Base Unit ({line.baseUnitAbbreviation}): {line.openingUnitCost === "" ? "Unknown" : `₱${formatDisplayNumber(line.openingUnitCost)}`}</p>
    <p>Replacement value: {value(line.afterValueCentavos)}</p>
    <p>Value difference: {line.beforeValueCentavos && line.afterValueCentavos !== null ? value((BigInt(line.afterValueCentavos) - BigInt(line.beforeValueCentavos)).toString()) : "Pending review"}</p>
    {/^0+(?:\.0+)?$/.test(line.openingUnitCost) && <p className="break-words">Reason for zero cost: {line.zeroCostReason || "Not entered"}</p>}
    <p>Quantity before and after: {formatDisplayNumber(line.beforeQuantity)} {line.baseUnitAbbreviation} → {formatDisplayNumber(line.afterQuantity)} {line.baseUnitAbbreviation}</p>
  </CardContent></Card>)}</div>;
}
