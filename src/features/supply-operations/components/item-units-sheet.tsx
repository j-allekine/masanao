"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { Plus, Save, XIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { createItemUnitConversionAction } from "../actions";
import type { ItemListItem, ItemUnitConversionFieldErrors, ItemUnitConversionListItem, UnitListItem } from "../types";

export default function ItemUnitsSheet({ item, units, canManage, open, onOpenChange, onSaved }: { item: ItemListItem | null; units: UnitListItem[]; canManage: boolean; open: boolean; onOpenChange: (open: boolean) => void; onSaved: (conversion: ItemUnitConversionListItem) => void }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const addAlternateUnitButtonRef = useRef<HTMLButtonElement>(null);
  const [alternateUnitId, setAlternateUnitId] = useState("");
  const [baseUnitQuantity, setBaseUnitQuantity] = useState("");
  const [errors, setErrors] = useState<ItemUnitConversionFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const selectedItem = item;
  if (!selectedItem) return null;
  const itemId = selectedItem.id;
  const conversions = selectedItem.unitConversions ?? [];
  const eligibleUnits = units.filter((unit) => unit.active && unit.id !== selectedItem.baseUnit.id);
  const selectedUnit = eligibleUnits.find((unit) => unit.id === alternateUnitId);
  const preview = selectedUnit && baseUnitQuantity.trim() ? `${selectedUnit.name} (${baseUnitQuantity.trim()} ${selectedItem.baseUnit.abbreviation})` : null;

  function closeDialog() {
    setDialogOpen(false); setErrors({}); setFormError(null); setAlternateUnitId(""); setBaseUnitQuantity("");
    window.setTimeout(() => addAlternateUnitButtonRef.current?.focus(), 0);
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setErrors({}); setFormError(null);
    const formData = new FormData(); formData.set("itemId", itemId); formData.set("alternateUnitId", alternateUnitId); formData.set("baseUnitQuantity", baseUnitQuantity);
    startSaving(async () => {
      const result = await createItemUnitConversionAction(formData);
      if (result.status === "error") { setErrors(result.fields); setFormError(result.error); return; }
      closeDialog(); onSaved(result.conversion);
    });
  }
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" showCloseButton={false} className="w-full gap-0 p-0 sm:max-w-lg">
      <SheetHeader className="border-b px-6 py-5 pr-14">
        <SheetTitle>Units for {selectedItem.name}</SheetTitle>
        <SheetDescription>Base Unit: {selectedItem.baseUnit.name} ({selectedItem.baseUnit.abbreviation})</SheetDescription>
      </SheetHeader>
      <SheetClose
        render={<Button type="button" variant="ghost" size="icon-lg" className="absolute top-2 right-2 size-10" aria-label="Close Units panel" />}
      >
        <XIcon aria-hidden="true" />
      </SheetClose>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto bg-muted/20 px-6 py-5">
        {conversions.length ? (
          <div className="flex flex-col gap-3" aria-label="Alternate Units">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-body font-semibold">Alternate units</h3>
                <p className="text-body-sm text-muted-foreground">
                  Package quantities configured for this Item.
                </p>
              </div>
              <Badge variant="outline">{conversions.length}</Badge>
            </div>
            {conversions.map((conversion) => (
              <Card key={conversion.id} size="sm" className="gap-1.5 bg-card shadow-none">
                <CardHeader className="px-3">
                  <CardTitle className="text-body font-semibold">{conversion.label}</CardTitle>
                </CardHeader>
                <CardContent className="px-3">
                  <CardDescription className="text-body-sm">
                    1 {conversion.alternateUnit.name} = {conversion.baseUnitQuantity} {selectedItem.baseUnit.abbreviation}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Empty className="min-h-44 border bg-card">
            <EmptyHeader>
              <EmptyTitle>No alternate Units yet.</EmptyTitle>
              <EmptyDescription>
                Base Unit quantities remain authoritative until package sizes are configured.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        {canManage && !selectedItem.isActive ? (
          <Alert>
            <AlertTitle>Item is inactive</AlertTitle>
            <AlertDescription>Reactivate this Item before adding alternate Units.</AlertDescription>
          </Alert>
        ) : null}
      </div>
      {canManage && selectedItem.isActive ? (
        <SheetFooter className="border-t bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
          <Button
            ref={addAlternateUnitButtonRef}
            type="button"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => setDialogOpen(true)}
          >
            <Plus data-icon="inline-start" />
            Add alternate Unit
          </Button>
        </SheetFooter>
      ) : null}
    </SheetContent>
    <Dialog open={dialogOpen} onOpenChange={(next) => next ? setDialogOpen(true) : closeDialog()}>
      <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Add alternate Unit</DialogTitle><DialogDescription>Set how many Base Units one package represents.</DialogDescription></DialogHeader>
      <form onSubmit={save} noValidate aria-busy={isSaving}><FieldGroup>
        {formError ? <Alert variant="destructive"><AlertTitle>Could not save alternate Unit</AlertTitle><AlertDescription>{formError}</AlertDescription></Alert> : null}
        <Field data-invalid={Boolean(errors.alternateUnitId?.length)}><FieldLabel htmlFor="alternate-unit">Alternate Unit</FieldLabel><Select items={eligibleUnits.map((unit) => ({ value: unit.id, label: `${unit.name} (${unit.abbreviation})` }))} value={alternateUnitId || null} onValueChange={(value) => setAlternateUnitId(value ?? "")}><SelectTrigger id="alternate-unit" aria-invalid={Boolean(errors.alternateUnitId?.length)}><SelectValue placeholder="Select a Unit" /></SelectTrigger><SelectContent><SelectGroup>{eligibleUnits.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name} ({unit.abbreviation})</SelectItem>)}</SelectGroup></SelectContent></Select>{errors.alternateUnitId?.length ? <FieldError errors={errors.alternateUnitId.map((message) => ({ message }))} /> : null}</Field>
        <Field data-invalid={Boolean(errors.baseUnitQuantity?.length)}><FieldLabel htmlFor="base-unit-quantity">Base Unit quantity</FieldLabel><Input id="base-unit-quantity" inputMode="decimal" value={baseUnitQuantity} onChange={(event) => setBaseUnitQuantity(event.target.value)} aria-invalid={Boolean(errors.baseUnitQuantity?.length)} placeholder={`e.g. 25 ${item.baseUnit.abbreviation}`} />{errors.baseUnitQuantity?.length ? <FieldError errors={errors.baseUnitQuantity.map((message) => ({ message }))} /> : null}</Field>
        {preview ? <p className="text-body-sm text-muted-foreground">Label preview: <span className="font-medium text-foreground">{preview}</span></p> : null}
      </FieldGroup><DialogFooter><Button type="button" variant="outline" disabled={isSaving} onClick={closeDialog}>Cancel</Button><Button type="submit" disabled={isSaving}>{isSaving ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}Save alternate Unit</Button></DialogFooter></form>
      </DialogContent>
    </Dialog>
  </Sheet>;
}
