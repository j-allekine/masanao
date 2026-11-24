"use client";

import { useState, type RefObject } from "react";
import { Plus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { CategoryListItem, ItemListItem, UnitListItem } from "../types";
import ItemCreationForm from "./item-creation-form";

export default function OpeningStockItemPicker({ items, addedItemIds, categories, units, returnFocusRef, onClose, onItemsAdded, onItemCreated }: {
  items: ItemListItem[];
  addedItemIds: string[];
  categories: CategoryListItem[];
  units: UnitListItem[];
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onItemsAdded: (items: ItemListItem[]) => void;
  onItemCreated: (item: ItemListItem) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [creationDirty, setCreationDirty] = useState(false);
  const [creationPending, setCreationPending] = useState(false);
  const [discardCreation, setDiscardCreation] = useState(false);
  const [message, setMessage] = useState("");
  const selected = items.filter(item => selectedIds.includes(item.id) && !addedItemIds.includes(item.id));
  const visible = items.filter(item => item.name.toLowerCase().includes(search.trim().toLowerCase()));

  function backToItems() {
    if (creationPending) return;
    if (creationDirty) setDiscardCreation(true);
    else setCreating(false);
  }
  function created(item: ItemListItem) {
    onItemCreated(item);
    setSelectedIds(current => [...current, item.id]);
    setCreating(false);
    setCreationDirty(false);
    setMessage(`${item.name} created and selected. Add selected to include it in your count.`);
  }
  return <>
    <Dialog open onOpenChange={open => { if (!open) { if (creating) backToItems(); else onClose(); } }}>
      <DialogContent finalFocus={returnFocusRef} showCloseButton={!creationPending} className="max-h-[calc(100svh-2rem)] grid-rows-[auto_minmax(0,1fr)] sm:max-w-lg">
        <DialogHeader className="pr-7">
          <DialogTitle>{creating ? "Create Item" : "Add items"}</DialogTitle>
          <DialogDescription>{creating ? "Save the Item and alternate units to the catalog, then return to your selections." : "Select Items to add together. Quantities and opening costs are entered in the count."}</DialogDescription>
        </DialogHeader>
        {creating ? <ItemCreationForm initialName={search} categories={categories} units={units} onCancel={backToItems} cancelLabel="Back to items" onSuccess={created} onDirtyChange={setCreationDirty} onPendingChange={setCreationPending} /> :
          <div className="flex min-h-0 flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="opening-search">Search Items</FieldLabel>
              <Input autoFocus id="opening-search" value={search} onChange={event => setSearch(event.target.value)} />
            </Field>
            {message && <p role="status" className="text-body-sm text-muted-foreground">{message}</p>}
            <FieldSet className="min-h-0 flex-1 overflow-y-auto pb-1">
              <FieldLegend className="sr-only w-px!">Choose Items for the count</FieldLegend>
              <FieldGroup className="gap-2">
                {visible.map(item => {
                  const added = addedItemIds.includes(item.id);
                  return <FieldLabel key={item.id} htmlFor={`opening-pick-${item.id}`} className="w-full">
                    <Field orientation="horizontal" data-disabled={added || undefined}>
                      <Checkbox id={`opening-pick-${item.id}`} aria-labelledby={`opening-pick-label-${item.id}`} checked={added || selectedIds.includes(item.id)} disabled={added} onCheckedChange={checked => setSelectedIds(current => checked ? current.includes(item.id) ? current : [...current, item.id] : current.filter(id => id !== item.id))} />
                      <FieldContent className="min-w-0">
                        <FieldTitle id={`opening-pick-label-${item.id}`} className="min-w-0 w-full break-words"><span className="sr-only">Select </span>{item.name}</FieldTitle>
                        <FieldDescription className="break-words">{item.category.name} · {item.baseUnit.abbreviation}</FieldDescription>
                      </FieldContent>
                      {added && <Badge variant="secondary" className="shrink-0">In count</Badge>}
                    </Field>
                  </FieldLabel>;
                })}
                {!visible.length && <p className="text-body-sm text-muted-foreground">No matching active Items. Create the missing Item below.</p>}
              </FieldGroup>
            </FieldSet>
            <DialogFooter className="shrink-0 flex-col sm:flex-col">
              <p aria-live="polite" className="text-body-sm text-muted-foreground">{selected.length} new {selected.length === 1 ? "Item" : "Items"} selected</p>
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                <Button type="button" variant="outline" className="sm:mr-auto" onClick={() => { setCreationDirty(false); setCreating(true); }}><Plus data-icon="inline-start" />Create Item</Button>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                  <Button type="button" disabled={!selected.length} onClick={() => onItemsAdded(selected)}>Add selected ({selected.length})</Button>
                </div>
              </div>
            </DialogFooter>
          </div>}
      </DialogContent>
    </Dialog>
    <AlertDialog open={discardCreation} onOpenChange={setDiscardCreation}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Discard new Item changes?</AlertDialogTitle><AlertDialogDescription>Your selected Items and search stay in place. The unsaved Item and alternate units will be discarded.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction onClick={() => { setDiscardCreation(false); setCreating(false); setCreationDirty(false); }}>Discard Item changes</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
