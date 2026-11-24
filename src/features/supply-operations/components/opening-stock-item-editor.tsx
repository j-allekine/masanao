"use client";

import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CategoryListItem, ItemListItem, UnitListItem } from "../types";
import ItemCreationForm from "./item-creation-form";

export default function OpeningStockItemEditor({ initialName, categories, units, onClose, onSuccess }: {
  initialName: string; categories: CategoryListItem[]; units: UnitListItem[]; onClose: () => void; onSuccess: (item: ItemListItem) => void;
}) {
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  function requestClose() {
    if (pending) return;
    if (dirty) setDiscardOpen(true);
    else onClose();
  }
  return <><Dialog open onOpenChange={(open) => { if (!open) requestClose(); }}><DialogContent showCloseButton={!pending} className="max-h-[calc(100svh-2rem)] grid-rows-[auto_minmax(0,1fr)] sm:max-w-lg"><DialogHeader><DialogTitle>Create Item</DialogTitle><DialogDescription>Add a supply and optional alternate units without losing your count.</DialogDescription></DialogHeader>
    <ItemCreationForm initialName={initialName} categories={categories} units={units} onCancel={requestClose} onSuccess={onSuccess} onDirtyChange={setDirty} onPendingChange={setPending} />
  </DialogContent></Dialog><AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Discard new Item changes?</AlertDialogTitle><AlertDialogDescription>Your opening count stays in place. This unsaved Item and its conversions will not be created.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep editing</AlertDialogCancel><AlertDialogAction onClick={onClose}>Discard Item changes</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
}
