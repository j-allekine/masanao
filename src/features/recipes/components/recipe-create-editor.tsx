"use client";

import { WorkspaceRecordBreadcrumbs } from "@/components/workspace/record-presentation";
import { recipeEditorReturn, recipeSaveHref } from "./recipe-return-context";
import { useSearchParams, useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUnsavedNavigation } from "@/components/workspace/navigation-guard";
import WorkspaceTableFrame from "@/components/workspace/table-frame";
import { WorkspaceFormActionButtons } from "@/components/workspace/form-actions";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  isPositiveExactDecimal,
  multiplyExactPositiveDecimals,
} from "@/features/supply-operations/domain/delivery-receipt";

import { createRecipeAction, updateRecipeAction } from "../actions";
import type { RecipeDetailItem, RecipeFieldErrors, RecipeIngredientField, RecipeIngredientOption } from "../types";

type IngredientDraft = {
  id: string;
  itemId: string;
  itemUnitConversionId: string | null;
  quantity: string;
};

function createIngredientDraft(): IngredientDraft {
  return {
    id: crypto.randomUUID(),
    itemId: "",
    itemUnitConversionId: null,
    quantity: "",
  };
}

function FieldMessages({ id, errors }: { id?: string; errors?: string[] }) {
  if (!errors?.length) return null;

  return <FieldError id={id} errors={errors.map((message) => ({ message }))} />;
}

function getDraftSignature(name: string, preparationNote: string, baselinePax: string, ingredients: IngredientDraft[]) {
  return JSON.stringify({
    name,
    preparationNote,
    baselinePax,
    ingredients: ingredients.map(({ itemId, itemUnitConversionId, quantity }) => ({
      itemId,
      itemUnitConversionId,
      quantity,
    })),
  });
}

export default function RecipeCreateEditor({
  items,
  recipe,
}: {
  items: RecipeIngredientOption[];
  recipe?: RecipeDetailItem;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = recipeEditorReturn(searchParams.get("returnTo"), recipe?.id);
  const [name, setName] = useState(recipe?.name ?? "");
  const [preparationNote, setPreparationNote] = useState(recipe?.preparationNote ?? "");
  const [baselinePax, setBaselinePax] = useState(recipe?.baselinePax?.toString() ?? "");
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(() => recipe?.ingredients.map((ingredient) => ({ id: ingredient.id, itemId: ingredient.itemId, itemUnitConversionId: ingredient.itemUnitConversionId, quantity: ingredient.enteredQuantity })) ?? [createIngredientDraft()]);
  const [fieldErrors, setFieldErrors] = useState<RecipeFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();
  const [initialDraftSignature] = useState(() =>
    getDraftSignature(
      recipe?.name ?? "",
      recipe?.preparationNote ?? "",
      recipe?.baselinePax?.toString() ?? "",
      recipe?.ingredients.map((ingredient) => ({
        id: ingredient.id,
        itemId: ingredient.itemId,
        itemUnitConversionId: ingredient.itemUnitConversionId,
        quantity: ingredient.enteredQuantity,
      })) ?? [createIngredientDraft()],
    ),
  );
  const itemOptions = useMemo(
    () => items.map((item) => ({ value: item.id, label: item.name, item })),
    [items],
  );
  const itemById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );
  const isDirty = useMemo(
    () => getDraftSignature(name, preparationNote, baselinePax, ingredients) !== initialDraftSignature,
    [baselinePax, ingredients, initialDraftSignature, name, preparationNote],
  );

  const navigation = useUnsavedNavigation({ dirty: isDirty, pending: isSubmitting });

  function clearFieldError(field: keyof RecipeFieldErrors) {
    setFieldErrors((currentErrors) => {
      if (!currentErrors[field]) return currentErrors;
      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
    setFormError(null);
  }

  function updateIngredient(
    id: string,
    field: "itemId" | "itemUnitConversionId" | "quantity",
    value: string | null,
  ) {
    setIngredients((currentIngredients) =>
      currentIngredients.map((ingredient) =>
        ingredient.id === id
          ? {
              ...ingredient,
              [field]: value,
              ...(field === "itemId" ? { itemUnitConversionId: null } : {}),
            }
          : ingredient,
      ),
    );
    const index = ingredients.findIndex((ingredient) => ingredient.id === id);
    clearFieldError(`ingredients.${index}.${field}` as RecipeIngredientField);
    clearFieldError("ingredients");
    if (field === "itemId") clearFieldError(`ingredients.${index}.itemUnitConversionId` as RecipeIngredientField);
  }

  function removeIngredient(id: string) {
    if (ingredients.length === 1 || isSubmitting) return;
    const removedIndex = ingredients.findIndex(ingredient => ingredient.id === id);
    setIngredients(current => current.filter(ingredient => ingredient.id !== id));
    setFieldErrors(current => {
      const next: RecipeFieldErrors = {};
      for (const [key, errors] of Object.entries(current)) {
        const match = /^ingredients\.(\d+)\.(.+)$/.exec(key);
        if (!match) { if (key !== "ingredients") next[key as keyof RecipeFieldErrors] = errors; continue; }
        const index = Number(match[1]);
        if (index !== removedIndex) next[`ingredients.${index > removedIndex ? index - 1 : index}.${match[2]}` as RecipeIngredientField] = errors;
      }
      return next;
    });
    requestAnimationFrame(() => document.getElementById(`recipe-ingredient-${Math.min(removedIndex, ingredients.length - 2)}-item`)?.focus());
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setFieldErrors({});
    setFormError(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("preparationNote", preparationNote);
    formData.set("baselinePax", baselinePax);
    formData.set(
      "ingredients",
      JSON.stringify(
        ingredients.map(({ itemId, itemUnitConversionId, quantity }) => ({
          itemId,
          itemUnitConversionId,
          quantity,
        })),
      ),
    );

    startTransition(async () => {
      try {
        const result = recipe ? await updateRecipeAction(recipe.id, formData) : await createRecipeAction(formData);
        if (result.status === "error") {
          setFormError(result.error);
          setFieldErrors(result.fields);
          return;
        }

        toast.success(`Recipe “${result.recipe.name}” ${recipe ? "updated" : "created"}`);
        navigation.complete(() => router.push(recipeSaveHref(result.recipe.id, returnTo)));
      } catch {
        setFormError("The Recipe could not be saved. Check your connection and try again.");
      }
    });
  }

  function cancelEditor() {
    navigation.requestLeave(() => router.push(returnTo));
  }

  return (
    <div className="workspace-pane flex h-[calc(100dvh-var(--workspace-header-height,4rem))] min-h-0 flex-col"><div className="workspace-content mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col gap-4 py-4 [&_[data-slot=input]]:min-h-10 [&_[data-slot=select-trigger]]:min-h-10 [&_[data-slot=button]]:min-h-10 lg:[&_[data-slot=input]]:min-h-9 lg:[&_[data-slot=select-trigger]]:min-h-9 lg:[&_[data-slot=button]]:min-h-9">
      <form aria-label={recipe ? "Edit Recipe" : "Create Recipe"} aria-busy={isSubmitting} className="flex min-h-0 flex-1 flex-col" noValidate onSubmit={handleSubmit}>
        <div data-recipe-editor-body className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain pb-4">
      <WorkspaceRecordBreadcrumbs ancestors={[{ label: recipe?.name ?? "Recipes", href: returnTo }]} currentLabel={recipe ? "Edit Recipe" : "New Recipe"} />
      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-heading-1 font-semibold">{recipe ? "Edit Recipe" : "New Recipe"}</h1>
          <p className="text-body text-muted-foreground">
            Add a reusable food template using each Item&apos;s Base Unit or configured alternate Unit.
          </p>
        </div>
      </div>

          <fieldset disabled={isSubmitting} className="flex min-w-0 flex-col gap-6">
          {formError ? (
            <Alert variant="destructive">
              <AlertTitle>Could not save Recipe</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Recipe details</CardTitle>
              <CardDescription>
                Give this food template a clear name. The preparation note is optional.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={Boolean(fieldErrors.name?.length)}>
                  <FieldLabel htmlFor="recipe-name">Recipe name <span className="text-destructive" aria-hidden="true">*</span></FieldLabel>
                  <Input
                    id="recipe-name"
                    value={name}
                    required
                    maxLength={100}
                    aria-invalid={Boolean(fieldErrors.name?.length)}
                    aria-describedby={fieldErrors.name?.length ? "recipe-name-error" : undefined}
                    onChange={(event) => {
                      setName(event.target.value);
                      clearFieldError("name");
                    }}
                  />
                  <FieldMessages id="recipe-name-error" errors={fieldErrors.name} />
                </Field>
                <Field data-invalid={Boolean(fieldErrors.preparationNote?.length)}>
                  <FieldLabel htmlFor="recipe-preparation-note">Preparation note <span className="text-muted-foreground">(optional)</span></FieldLabel>
                  <Textarea
                    id="recipe-preparation-note"
                    value={preparationNote}
                    rows={5}
                    maxLength={1_000}
                    aria-invalid={Boolean(fieldErrors.preparationNote?.length)}
                    aria-describedby={fieldErrors.preparationNote?.length ? "recipe-preparation-note-error" : undefined}
                    onChange={(event) => {
                      setPreparationNote(event.target.value);
                      clearFieldError("preparationNote");
                    }}
                  />
                  <FieldMessages id="recipe-preparation-note-error" errors={fieldErrors.preparationNote} />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ingredients</CardTitle>
              <CardDescription>
                Select active Items and enter the quantity for the reference batch in its Base Unit or a configured alternate Unit.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field data-invalid={Boolean(fieldErrors.baselinePax?.length)}>
                <FieldLabel htmlFor="recipe-baseline-pax">Recipe Baseline Pax <span className="text-destructive" aria-hidden="true">*</span></FieldLabel>
                <Input id="recipe-baseline-pax" className="max-w-48" inputMode="numeric" pattern="[1-9][0-9]*" required value={baselinePax} aria-invalid={Boolean(fieldErrors.baselinePax?.length)} aria-describedby={fieldErrors.baselinePax?.length ? "recipe-baseline-pax-error recipe-baseline-pax-help" : "recipe-baseline-pax-help"} onChange={(event) => { setBaselinePax(event.target.value); clearFieldError("baselinePax"); }} />
                <p id="recipe-baseline-pax-help" className="text-body-sm text-muted-foreground">The entered ingredient quantities serve this many people. Changing the baseline redefines this batch; it does not multiply or change ingredient quantities.</p>
                <FieldMessages id="recipe-baseline-pax-error" errors={fieldErrors.baselinePax} />
              </Field>
              {recipe?.baselinePax === null ? <Alert><AlertTitle>Baseline pax not set</AlertTitle><AlertDescription>Supply a baseline when saving this Recipe.</AlertDescription></Alert> : null}
              <WorkspaceTableFrame responsive caption="Recipe ingredient controls">
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">Item</TableHead>
                      <TableHead scope="col" className="w-36">Quantity</TableHead>
                      <TableHead scope="col" className="w-52">Unit</TableHead>
                      <TableHead scope="col" className="w-44">Base Unit reference</TableHead>
                      <TableHead scope="col"><span className="sr-only">Remove</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ingredients.map((ingredient, index) => {
                      const selectedItem = itemById.get(ingredient.itemId);
                      const originalIngredient = recipe?.ingredients.find(row => row.itemId === ingredient.itemId);
                      const unavailable = originalIngredient && (originalIngredient.item.isActive === false || originalIngredient.item.baseUnit.active === false || originalIngredient.itemUnitConversion?.alternateUnit.active === false);
                      const retainedUnit = originalIngredient?.itemUnitConversion?.alternateUnit ?? originalIngredient?.item.baseUnit;
                      const selectedConversion = selectedItem?.unitConversions.find(
                        (conversion) => conversion.id === ingredient.itemUnitConversionId,
                      );
                      const calculatedBaseUnitQuantity =
                        selectedItem &&
                        selectedConversion &&
                        isPositiveExactDecimal(ingredient.quantity)
                          ? multiplyExactPositiveDecimals(
                              ingredient.quantity,
                              selectedConversion.baseUnitQuantity,
                            )
                          : null;
                      const itemInputId = `recipe-ingredient-${index}-item`;
                      const quantityInputId = `recipe-ingredient-${index}-quantity`;
                      const unitInputId = `recipe-ingredient-${index}-unit`;
                      const itemErrors = fieldErrors[`ingredients.${index}.itemId` as RecipeIngredientField];
                      const quantityErrors = fieldErrors[`ingredients.${index}.quantity` as RecipeIngredientField];
                      const unitErrors = fieldErrors[`ingredients.${index}.itemUnitConversionId` as RecipeIngredientField];
                      return (
                        <TableRow key={ingredient.id}>
                          <TableCell data-primary className="align-top">
                            <Field className="w-full" data-invalid={Boolean(itemErrors?.length)}>
                            <FieldLabel htmlFor={itemInputId}>Ingredient {index + 1} Item</FieldLabel>
                            <Combobox items={itemOptions}
                              value={selectedItem ? { value: selectedItem.id, label: selectedItem.name } : originalIngredient ? { value: ingredient.itemId, label: `${originalIngredient.item.name} (unavailable)` } : null}
                              onValueChange={(option) => {
                                const itemId = typeof option === "string"
                                  ? option
                                  : option && typeof option === "object" && "value" in option && typeof option.value === "string"
                                    ? option.value
                                    : "";
                                if (itemId) updateIngredient(ingredient.id, "itemId", itemId);
                              }}>
                              <ComboboxInput
                                id={itemInputId}
                                className="w-full"
                                aria-label={`Ingredient ${index + 1} Item`}
                                aria-invalid={Boolean(itemErrors?.length)}
                                aria-describedby={itemErrors?.length ? `${itemInputId}-error` : undefined}
                                placeholder="Search active Items" />
                              <ComboboxContent><ComboboxList>{(option: { value: string; label: string; item: RecipeIngredientOption }) => <ComboboxItem key={option.value} value={option}>{option.label}</ComboboxItem>}</ComboboxList><ComboboxEmpty>No active Items match your search.</ComboboxEmpty></ComboboxContent>
                            </Combobox>
                            {unavailable ? <p className="text-body-sm text-destructive">This Item or Unit is inactive. Select an available Item and Unit before saving.</p> : null}
                            <FieldMessages id={`${itemInputId}-error`} errors={itemErrors} />
                            </Field>
                          </TableCell>
                          <TableCell data-label="Quantity" className="align-top">
                            <Field data-invalid={Boolean(quantityErrors?.length)}>
                            <Input
                              id={quantityInputId}
                              className="w-full min-w-0"
                              inputMode="decimal"
                              aria-label={`Ingredient ${index + 1} quantity`}
                              aria-invalid={Boolean(quantityErrors?.length)}
                              aria-describedby={quantityErrors?.length ? `${quantityInputId}-error` : undefined}
                              value={ingredient.quantity}
                              onChange={(event) => updateIngredient(ingredient.id, "quantity", event.target.value)}
                            />
                            <FieldMessages id={`${quantityInputId}-error`} errors={quantityErrors} />
                            </Field>
                          </TableCell>
                          <TableCell data-label="Unit" className="align-top text-muted-foreground">
                            <Field data-invalid={Boolean(unitErrors?.length)}>
                            <Select
                              items={selectedItem ? [
                                {
                                  value: "base-unit",
                                  label: `Base Unit — ${selectedItem.baseUnit.name} (${selectedItem.baseUnit.abbreviation})`,
                                },
                                ...selectedItem.unitConversions.map((conversion) => ({
                                  value: conversion.id,
                                  label: conversion.label,
                                })),
                              ] : []}
                              value={selectedItem ? ingredient.itemUnitConversionId ?? "base-unit" : null}
                              disabled={!selectedItem}
                              onValueChange={(value) =>
                                updateIngredient(
                                  ingredient.id,
                                  "itemUnitConversionId",
                                  value === "base-unit" || !value ? null : value,
                                )
                              }
                            >
                              <SelectTrigger
                                id={unitInputId}
                                className="w-full"
                                aria-label={`Ingredient ${index + 1} Unit`}
                                aria-invalid={Boolean(unitErrors?.length)}
                                aria-describedby={unitErrors?.length ? `${unitInputId}-error` : undefined}
                              >
                                <SelectValue placeholder="Select an Item first">{!selectedItem && retainedUnit ? `${retainedUnit.name} (${retainedUnit.abbreviation}) — unavailable` : undefined}</SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {selectedItem ? (
                                    <>
                                      <SelectItem value="base-unit">
                                        Base Unit — {selectedItem.baseUnit.name} ({selectedItem.baseUnit.abbreviation})
                                      </SelectItem>
                                      {selectedItem.unitConversions.map((conversion) => (
                                        <SelectItem key={conversion.id} value={conversion.id}>
                                          {conversion.label}
                                        </SelectItem>
                                      ))}
                                    </>
                                  ) : null}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                            <FieldMessages id={`${unitInputId}-error`} errors={unitErrors} />
                            </Field>
                          </TableCell>
                          <TableCell data-label="Base Unit reference" className="align-top text-muted-foreground">
                            {selectedItem
                              ? calculatedBaseUnitQuantity
                                ? `${calculatedBaseUnitQuantity} ${selectedItem.baseUnit.abbreviation}`
                                : `${selectedItem.baseUnit.name} (${selectedItem.baseUnit.abbreviation})`
                              : "—"}
                          </TableCell>
                          <TableCell data-actions className="align-top text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="size-10 lg:size-9"
                              aria-label={`Remove Ingredient ${index + 1}`}
                              disabled={ingredients.length === 1 || isSubmitting}
                              onClick={() => removeIngredient(ingredient.id)}
                            >
                              <Trash2 />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
              </WorkspaceTableFrame>
              <Field data-invalid={Boolean(fieldErrors.ingredients?.length)}>
                <FieldMessages id="recipe-ingredients-error" errors={fieldErrors.ingredients} />
              </Field>
              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setIngredients((currentIngredients) => [...currentIngredients, createIngredientDraft()])}>
                  <Plus data-icon="inline-start" />
                  Add Ingredient
                </Button>

              </div>
            </CardContent>
          </Card>
          </fieldset>
        </div>
        <div data-recipe-editor-actions className="flex shrink-0 flex-wrap justify-end gap-2 border-t bg-card py-3">                <div className="flex flex-wrap items-center gap-2">
                  <WorkspaceFormActionButtons
                    onCancel={cancelEditor}
                    isPending={isSubmitting}
                    submitDisabled={items.length === 0}
                    pendingLabel="Saving..."
                    compactSubmitLabel={recipe ? "Save" : "Create"}
                    submitLabel={recipe ? "Save Recipe" : "Create Recipe"}
                    submitIcon={
                      recipe ? undefined : <Plus data-icon="inline-start" />
                    }
                  />
                </div>
        </div>
      </form>
      <AlertDialog open={navigation.open} onOpenChange={(open) => { if (!open) navigation.onStay(); }}>
        <AlertDialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md [&_[data-slot=button]]:h-auto [&_[data-slot=button]]:min-h-10 [&_[data-slot=button]]:whitespace-normal">
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your Recipe changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={navigation.onDiscard}>
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div></div>
  );
}
