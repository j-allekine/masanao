"use client";

// Throwaway: compare a count sheet, split workspace, and guided setup on /inventory
// ?prototype=opening-stock&variant=A|B|C. All edits live in memory; no real mutations.
import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ClipboardList, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import LocalDatePicker from "@/components/workspace/local-date-picker";
import WorkspaceTableFrame from "@/components/workspace/table-frame";
import WorkspaceLayout, { WorkspaceTaskHeader } from "@/components/workspace/workspace-layout";
import type { InventoryListItem } from "../types";
import InventoryContent from "./inventory-content";

type Unit = { name: string; factor: number };
type SampleItem = { id: string; name: string; category: string; base: string; units: Unit[] };
type CountLine = { itemId: string; quantity: string; unit: string };
const sampleCatalog: SampleItem[] = [
  { id: "rice", name: "Rice", category: "Staples & dry goods", base: "kg", units: [{ name: "kg", factor: 1 }, { name: "sack (25 kg)", factor: 25 }] },
  { id: "oil", name: "Cooking oil", category: "Condiments & seasonings", base: "L", units: [{ name: "L", factor: 1 }, { name: "bottle (1 L)", factor: 1 }] },
  { id: "eggs", name: "Eggs", category: "Fresh supplies", base: "piece", units: [{ name: "piece", factor: 1 }, { name: "tray (30 pieces)", factor: 30 }] },
  { id: "sugar", name: "Sugar", category: "Staples & dry goods", base: "kg", units: [{ name: "kg", factor: 1 }] },
];
const sampleLines: CountLine[] = [
  { itemId: "rice", quantity: "3", unit: "sack (25 kg)" },
  { itemId: "oil", quantity: "10", unit: "L" },
  { itemId: "eggs", quantity: "4", unit: "tray (30 pieces)" },
];
const variants = ["A", "B", "C"];
const variantLabels = ["Count sheet", "Split workspace", "Guided setup"];
const unitNames = ["kg", "L", "piece", "sack", "tray", "bottle", "pack"];
const showQuantity = (value: number) => new Intl.NumberFormat("en-PH", { maximumFractionDigits: 6 }).format(value);

function Choice({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <Select items={options.map((name) => ({ value: name, label: name }))} value={value || null} onValueChange={(next) => onChange(next ?? "")}>
    <SelectTrigger id={id} aria-label={label} className="w-full min-w-0"><SelectValue placeholder="Choose a unit" /></SelectTrigger>
    <SelectContent><SelectGroup>{options.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectGroup></SelectContent>
  </Select>;
}

export default function OpeningStockPrototype({ items }: { items: InventoryListItem[] }) {
  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);
  const searchParams = useSearchParams();
  const variant = variants.includes(searchParams.get("variant") ?? "") ? searchParams.get("variant")! : "A";
  const [screen, setScreenState] = useState<"inventory" | "edit" | "review" | "posted">("inventory");
  const [catalog, setCatalog] = useState(sampleCatalog);
  const [lines, setLines] = useState(sampleLines);
  const [date, setDate] = useState("2026-11-19");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [picker, setPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<"create" | SampleItem | null>(null);
  const [step, setStep] = useState(1);
  const posted = screen === "posted";
  const valid = Boolean(date && lines.length && lines.every((line) => Number(line.quantity) > 0 && Number.isFinite(Number(line.quantity))));
  const resolved = lines.map((line) => {
    const item = catalog.find((entry) => entry.id === line.itemId)!;
    return { ...line, item, total: Number(line.quantity) * (item.units.find((unit) => unit.name === line.unit)?.factor ?? 1) };
  });

  function setScreen(next: typeof screen) {
    setScreenState(next);
    window.scrollTo(0, 0);
  }

  function switchVariant(direction: number) {
    const next = variants[(variants.indexOf(variant) + direction + variants.length) % variants.length];
    const params = new URLSearchParams(window.location.search);
    params.set("variant", next);
    window.history.replaceState(null, "", `?${params}`);
  }
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, [contenteditable], [role=combobox], [role=dialog], [role=grid]")) return;
      if (picker || editor) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        const direction = event.key === "ArrowLeft" ? -1 : 1;
        const params = new URLSearchParams(window.location.search);
        params.set("variant", variants[(variants.indexOf(variant) + direction + variants.length) % variants.length]);
        window.history.replaceState(null, "", `?${params}`);
      }
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [variant, picker, editor]);

  function updateLine(itemId: string, patch: Partial<CountLine>) {
    setLines((current) => current.map((line) => line.itemId === itemId ? { ...line, ...patch } : line));
    setMessage("");
  }
  function addItem(item: SampleItem) {
    setLines((current) => [...current, { itemId: item.id, quantity: "", unit: item.base }]);
    setPicker(false); setSearch(""); setMessage(`${item.name} added. Enter its counted quantity.`);
  }
  function reset() {
    setCatalog(sampleCatalog); setLines(sampleLines); setDate("2026-11-19"); setNotes(""); setScreen("inventory"); setMessage(""); setStep(1);
  }
  const addButton = <Button onClick={() => { setSearch(""); setPicker(true); }}><Plus data-icon="inline-start" />Add items</Button>;
  const details = <FieldGroup className={variant === "B" ? "grid gap-4" : "grid gap-4 sm:grid-cols-2"}>
    <LocalDatePicker id="opening-date" name="openingDate" label="Stock counted as of" emptyLabel="Choose count date" value={date} required onChange={setDate} />
    <Field><FieldLabel htmlFor="opening-notes">Reference / notes <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel><Input id="opening-notes" value={notes} placeholder="e.g. Kitchen count sheet, November 19" onChange={(event) => setNotes(event.target.value)} /></Field>
  </FieldGroup>;
  const summary = <Card size="sm"><CardHeader><CardTitle>Count summary</CardTitle><CardDescription>Starting quantities by Item</CardDescription></CardHeader><CardContent className="flex flex-col gap-4">
    <dl className="flex flex-col gap-3">{resolved.map((line) => <div key={line.itemId} className="flex flex-wrap justify-between gap-2"><dt>{line.item.name}</dt><dd className="font-medium tabular-nums">{line.quantity ? `${showQuantity(line.total)} ${line.item.base}` : "Not counted"}</dd></div>)}</dl>
    <Separator /><p className="text-body-sm text-muted-foreground">{lines.length} Items · Opening costs unknown</p>
    <p className="text-body-sm text-muted-foreground">The original PO is not required. The source will be Opening Stock · OS-0001.</p>
  </CardContent></Card>;
  const countEditor = (cards: boolean) => <section className="flex min-w-0 flex-col gap-4" aria-label="Counted items">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-heading-3 font-semibold">Items on hand</h2><p className="text-body-sm text-muted-foreground">Enter the physical count. Choose any configured unit.</p></div>{addButton}</div>
    {!lines.length ? <Empty><EmptyHeader><EmptyTitle>No Items counted yet</EmptyTitle><EmptyDescription>Add an existing Item or create a missing one.</EmptyDescription></EmptyHeader>{addButton}</Empty> : <>
      <div className={cards ? "flex flex-col gap-3" : "flex flex-col gap-3 md:hidden"}>{resolved.map((line) => <Card key={line.itemId} size="sm"><CardHeader><CardTitle>{line.item.name}</CardTitle><CardDescription>{line.item.category}</CardDescription></CardHeader><CardContent className="flex flex-col gap-3">
        <FieldGroup className="grid grid-cols-2 gap-3"><Field><FieldLabel htmlFor={`card-qty-${line.itemId}`}>Quantity</FieldLabel><Input id={`card-qty-${line.itemId}`} inputMode="decimal" value={line.quantity} placeholder="0" aria-invalid={Boolean(line.quantity && !(Number(line.quantity) > 0))} onChange={(event) => updateLine(line.itemId, { quantity: event.target.value })} /></Field><Field><FieldLabel htmlFor={`card-unit-${line.itemId}`}>Unit</FieldLabel><Choice id={`card-unit-${line.itemId}`} label={`Unit for ${line.item.name}`} value={line.unit} options={line.item.units.map((unit) => unit.name)} onChange={(unit) => updateLine(line.itemId, { unit })} /></Field></FieldGroup>
        <p className="text-body-sm">Equivalent stock: <strong>{showQuantity(line.total)} {line.item.base}</strong></p><div className="flex justify-between gap-2"><Button variant="ghost" size="sm" onClick={() => setEditor(line.item)}>Manage units</Button><Button variant="ghost" size="sm" onClick={() => setLines((current) => current.filter((entry) => entry.itemId !== line.itemId))} aria-label={`Remove ${line.item.name}`}><Trash2 data-icon="inline-start" />Remove</Button></div>
      </CardContent></Card>)}</div>
      {!cards && <div className="hidden md:block"><WorkspaceTableFrame caption="Opening stock count"><TableHeader><TableRow>{["Item", "Counted quantity", "Unit", "Equivalent stock", ""].map((label) => <TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader><TableBody>{resolved.map((line) => <TableRow key={line.itemId}>
        <TableCell><p className="font-medium">{line.item.name}</p><p className="text-body-sm text-muted-foreground">{line.item.category}</p></TableCell>
        <TableCell><Input className="w-28" aria-label={`Quantity for ${line.item.name}`} inputMode="decimal" value={line.quantity} placeholder="0" aria-invalid={Boolean(line.quantity && !(Number(line.quantity) > 0))} onChange={(event) => updateLine(line.itemId, { quantity: event.target.value })} /></TableCell>
        <TableCell><Choice id={`table-unit-${line.itemId}`} label={`Unit for ${line.item.name}`} value={line.unit} options={line.item.units.map((unit) => unit.name)} onChange={(unit) => updateLine(line.itemId, { unit })} /><Button variant="link" size="sm" onClick={() => setEditor(line.item)}>Manage units</Button></TableCell>
        <TableCell className="tabular-nums">{showQuantity(line.total)} {line.item.base}</TableCell><TableCell><Button variant="ghost" size="icon-sm" aria-label={`Remove ${line.item.name}`} onClick={() => setLines((current) => current.filter((entry) => entry.itemId !== line.itemId))}><Trash2 /></Button></TableCell>
      </TableRow>)}</TableBody></WorkspaceTableFrame></div>}
    </>}
  </section>;

  const switcher = process.env.NODE_ENV !== "production" ? <aside aria-label="Prototype layouts" className="fixed inset-x-4 bottom-4 z-30 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-xl border bg-popover p-2 text-popover-foreground shadow-lg">
    <Button variant="outline" size="icon-sm" aria-label="Previous layout" onClick={() => switchVariant(-1)}><ArrowLeft /></Button><div className="min-w-0 text-center"><p className="text-body-sm font-medium">{variant} · {variantLabels[variants.indexOf(variant)]}</p><p className="text-caption text-muted-foreground">Prototype · {screen === "inventory" ? "Open Opening Stock to explore" : `${lines.length} Items · ${screen}`}</p></div><Button variant="outline" size="icon-sm" aria-label="Next layout" onClick={() => switchVariant(1)}><ArrowRight /></Button><Button variant="ghost" size="icon-sm" aria-label="Reset prototype" onClick={reset}><RotateCcw /></Button>
  </aside> : null;

  if (screen === "inventory") return <><InventoryContent items={items} openingStockAction={<Button variant="outline" disabled={!hydrated} onClick={() => setScreen("edit")}><ClipboardList data-icon="inline-start" />Opening Stock</Button>} />{switcher}</>;

  return <><WorkspaceLayout workspaceTitle="Supply Operations" task={<WorkspaceTaskHeader actions={<Button variant="outline" onClick={() => { setScreen("inventory"); setMessage(""); }}><ArrowLeft data-icon="inline-start" />Inventory</Button>}><h1 className="text-heading-3 font-semibold">Opening Stock</h1><Badge variant="secondary">{posted ? "Posted · demo" : "Draft · demo"}</Badge></WorkspaceTaskHeader>}>
    <div className="mx-auto flex w-full min-w-0 max-w-content flex-col gap-6 px-4 pt-6 pb-32 sm:px-6">
      <Alert><ClipboardList /><AlertTitle>Opening Stock prototype</AlertTitle><AlertDescription>Try the sample count and create sample Items. Changes stay in this preview and reset on reload. Real inventory is unchanged.</AlertDescription></Alert>
      {message && <p role="status" className="text-body-sm text-muted-foreground">{message}</p>}
      {screen === "edit" ? <>
        <div><h2 className="text-heading-2 font-semibold">Start with what’s already in your kitchen</h2><p className="mt-2 max-w-2xl text-body-sm text-muted-foreground">Count existing supplies before recording new deliveries or issuance. Their original Purchase Orders are not required.</p></div>
        {variant === "A" && <>{details}<Separator />{countEditor(false)}</>}
        {variant === "B" && <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]"><div className="flex min-w-0 flex-col gap-6">{countEditor(true)}</div><aside className="flex min-w-0 flex-col gap-5"><Card size="sm"><CardHeader><CardTitle>Count details</CardTitle></CardHeader><CardContent>{details}</CardContent></Card>{summary}</aside></div>}
        {variant === "C" && <div className="mx-auto flex w-full max-w-3xl flex-col gap-5"><ol className="flex flex-wrap gap-3 text-body-sm"><li><Badge variant={step === 1 ? "default" : "outline"}>1 · Count details</Badge></li><li><Badge variant={step === 2 ? "default" : "outline"}>2 · Count Items</Badge></li><li><Badge variant="outline">3 · Review</Badge></li></ol><Card><CardHeader><CardTitle>{step === 1 ? "When was the stock counted?" : "What supplies are on hand?"}</CardTitle><CardDescription>{step === 1 ? "Use one starting date for this kitchen count." : "Add everything counted before continuing."}</CardDescription></CardHeader><CardContent>{step === 1 ? details : countEditor(true)}</CardContent></Card></div>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"><p className="text-body-sm text-muted-foreground">{lines.length} Items · Stock moves only after posting</p><div className="flex flex-wrap gap-2">
          {variant === "C" && step === 2 && <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>}
          <Button variant="outline" onClick={() => setMessage("Draft saved for this preview session. Reloading resets the prototype.")}>Save draft</Button>
          {variant === "C" && step === 1 ? <Button disabled={!date} onClick={() => setStep(2)}>Continue to Items<ArrowRight data-icon="inline-end" /></Button> : <Button disabled={!valid} onClick={() => { setScreen("review"); setMessage(""); }}>Review opening stock<ArrowRight data-icon="inline-end" /></Button>}
        </div></div>
        {!valid && <p className="text-body-sm text-muted-foreground">Choose a count date and enter a positive quantity for each selected Item to review.</p>}
      </> : <>
        <div><h2 className="text-heading-2 font-semibold">{posted ? "Opening stock recorded" : "Review opening stock"}</h2><p className="mt-2 text-body-sm text-muted-foreground">{posted ? "This is the completed record in the prototype. No real stock was added." : "Check the physical count. These quantities will become available stock when posted in the finished feature."}</p></div>
        {posted && <Alert><Check /><AlertTitle>OS-0001 · Posting simulated</AlertTitle><AlertDescription>These sample quantities would now be available for issuance, with Opening Stock as their source.</AlertDescription></Alert>}
        <dl className="grid gap-4 text-body-sm sm:grid-cols-3"><div><dt className="text-muted-foreground">Count date</dt><dd>{date}</dd></div><div><dt className="text-muted-foreground">Reference / notes</dt><dd className="wrap-anywhere">{notes || "None provided"}</dd></div><div><dt className="text-muted-foreground">Source</dt><dd>Opening Stock · OS-0001</dd></div></dl>
        <div className="flex flex-col gap-3">{resolved.map((line) => <Card key={line.itemId} size="sm"><CardContent className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium">{line.item.name}</p><p className="text-body-sm text-muted-foreground">{line.quantity} {line.unit}</p></div><p className="font-medium tabular-nums">{showQuantity(line.total)} {line.item.base}</p></CardContent></Card>)}</div>
        <Alert><AlertTitle>Opening costs are unknown</AlertTitle><AlertDescription>This prototype records quantities only. Unknown costs are not ₱0; cost reports would need to identify incomplete costs.</AlertDescription></Alert>
        <div className="flex flex-wrap justify-end gap-2">{posted ? <Button variant="outline" onClick={reset}>Restart prototype</Button> : <><Button variant="outline" onClick={() => setScreen("edit")}>Back to count</Button><Button onClick={() => setScreen("posted")}><Check data-icon="inline-start" />Simulate posting</Button></>}</div>
      </>}
    </div>
  </WorkspaceLayout>{switcher}
  <Dialog open={picker} onOpenChange={setPicker}><DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>Add items</DialogTitle><DialogDescription>Choose from the sample catalog, or create a missing Item without losing your count.</DialogDescription></DialogHeader>
    <FieldGroup><Field><FieldLabel htmlFor="opening-item-search">Search Items</FieldLabel><Input autoFocus id="opening-item-search" value={search} placeholder="Search by Item name" onChange={(event) => setSearch(event.target.value)} /></Field></FieldGroup>
    <div className="flex max-h-60 flex-col gap-2 overflow-y-auto">{catalog.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())).map((item) => {
      const added = lines.some((line) => line.itemId === item.id);
      return <Button key={item.id} variant="outline" disabled={added} className="h-auto justify-between gap-3 py-3 whitespace-normal" onClick={() => addItem(item)}><span className="text-left">{item.name}<span className="block text-body-sm font-normal text-muted-foreground">{item.category} · {item.base}</span></span>{added ? "Added" : <Plus />}</Button>;
    })}{!catalog.some((item) => item.name.toLowerCase().includes(search.toLowerCase())) && <p className="py-4 text-body-sm text-muted-foreground">No matching Items. Create one below.</p>}</div><Separator /><Button variant="outline" onClick={() => { setPicker(false); setEditor("create"); }}><Plus data-icon="inline-start" />Create Item{search ? `: ${search}` : ""}</Button>
  </DialogContent></Dialog>
  {editor && <SampleItemEditor key={typeof editor === "string" ? "create" : editor.id} item={editor === "create" ? undefined : editor} initialName={search} catalog={catalog} onClose={() => setEditor(null)} onSave={(item) => {
    setCatalog((current) => current.some((entry) => entry.id === item.id) ? current.map((entry) => entry.id === item.id ? item : entry) : [...current, item]);
    if (editor === "create") addItem(item);
    setEditor(null); setMessage(`${item.name} ${editor === "create" ? "created and added to the count" : "units updated"} in this preview.`);
  }} />}
  </>;
}

function SampleItemEditor({ item, initialName, catalog, onClose, onSave }: { item?: SampleItem; initialName: string; catalog: SampleItem[]; onClose: () => void; onSave: (item: SampleItem) => void }) {
  const [name, setName] = useState(item?.name ?? initialName);
  const [category, setCategory] = useState(item?.category ?? "Staples & dry goods");
  const [base, setBase] = useState(item?.base ?? "kg");
  const [alternates, setAlternates] = useState<Unit[]>(item?.units.filter((unit) => unit.name !== item.base) ?? []);
  const [reorder, setReorder] = useState("10");
  const [policy, setPolicy] = useState("Allow decimals");
  const [error, setError] = useState("");
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !(Number(reorder) > 0) || alternates.some((unit) => !unit.name || unit.name === base || !(unit.factor > 0) || !Number.isFinite(unit.factor))) { setError("Complete the Item name, positive Reorder level, and each alternate unit conversion."); return; }
    if (!item && catalog.some((entry) => entry.name.toLowerCase() === name.trim().toLowerCase())) { setError("An Item with this name already exists. Select it from Add items."); return; }
    const units = [{ name: base, factor: 1 }, ...alternates.map((unit) => ({ name: item ? unit.name : `${unit.name} (${unit.factor} ${base})`, factor: unit.factor }))];
    if (new Set(units.map((unit) => unit.name)).size !== units.length) { setError("Choose each alternate unit only once."); return; }
    onSave({ id: item?.id ?? crypto.randomUUID(), name: name.trim(), category, base, units });
  }
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{item ? `Manage units for ${item.name}` : "Create Item"}</DialogTitle><DialogDescription>{item ? "Add a reusable conversion, then return to your count." : "Define the Item and optional alternate units together. Your opening count stays in place."}</DialogDescription></DialogHeader>
    <form onSubmit={save} className="flex flex-col gap-5">
      {error && <Alert variant="destructive"><AlertTitle>Review Item details</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      <FieldGroup>
        {!item && <><Field><FieldLabel htmlFor="sample-name" required>Item name</FieldLabel><Input autoFocus id="sample-name" value={name} onChange={(event) => setName(event.target.value)} required /></Field><FieldGroup className="grid gap-4 sm:grid-cols-2"><Field><FieldLabel htmlFor="sample-category">Category</FieldLabel><Choice id="sample-category" label="Category" value={category} options={["Staples & dry goods", "Fresh supplies", "Condiments & seasonings", "Kitchen supplies"]} onChange={setCategory} /></Field><Field><FieldLabel htmlFor="sample-base">Base Unit</FieldLabel><Choice id="sample-base" label="Base Unit" value={base} options={["kg", "L", "piece"]} onChange={setBase} /></Field><Field><FieldLabel htmlFor="sample-reorder" required>Reorder level ({base})</FieldLabel><Input id="sample-reorder" inputMode="decimal" value={reorder} onChange={(event) => setReorder(event.target.value)} required /></Field><Field><FieldLabel htmlFor="sample-policy">Issuance quantities</FieldLabel><Choice id="sample-policy" label="Issuance quantities" value={policy} options={["Allow decimals", "Whole numbers only"]} onChange={setPolicy} /></Field></FieldGroup><Field><FieldLabel htmlFor="sample-note">Item note (optional)</FieldLabel><Textarea id="sample-note" placeholder="Details about this supply" /></Field></>}
        <Field><FieldLabel>Alternate units <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel><FieldDescription>Define how much of this Item one package contains. Base Unit: {base}.</FieldDescription>
          {alternates.map((unit, index) => <FieldGroup key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2"><Field><FieldLabel htmlFor={`alternate-${index}`}>1 alternate unit</FieldLabel>{item && unit.name.includes("(") ? <Input id={`alternate-${index}`} value={unit.name} readOnly /> : <Choice id={`alternate-${index}`} label={`Alternate unit ${index + 1}`} value={unit.name} options={unitNames.filter((entry) => entry !== base)} onChange={(name) => setAlternates((current) => current.map((entry, i) => i === index ? { ...entry, name } : entry))} />}</Field><Field><FieldLabel htmlFor={`factor-${index}`}>Equals ({base})</FieldLabel><Input id={`factor-${index}`} inputMode="decimal" value={unit.factor || ""} readOnly={Boolean(item && unit.name.includes("("))} onChange={(event) => setAlternates((current) => current.map((entry, i) => i === index ? { ...entry, factor: Number(event.target.value) } : entry))} /></Field><Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove alternate unit ${index + 1}`} onClick={() => setAlternates((current) => current.filter((_, i) => i !== index))}><Trash2 /></Button></FieldGroup>)}
          <Button type="button" variant="outline" className="w-fit" onClick={() => setAlternates((current) => [...current, { name: "", factor: 0 }])}><Plus data-icon="inline-start" />Add alternate unit</Button>
        </Field>
      </FieldGroup>
      <p className="text-body-sm text-muted-foreground">{item ? "Updating units does not add stock." : "Creating the Item does not add stock. Enter its counted quantity next."} This prototype saves only in memory.</p>
      <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit">{item ? "Save units" : "Create Item and add to count"}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
