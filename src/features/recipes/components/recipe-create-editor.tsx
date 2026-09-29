"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants, Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

export default function RecipeCreateEditor({
  items,
  recipe,
}: {
  items: RecipeIngredientOption[];
  recipe?: RecipeDetailItem;
}) {
  const router = useRouter();
  const [name, setName] = useState(recipe?.name ?? "");
  const [preparationNote, setPreparationNote] = useState(recipe?.preparationNote ?? "");
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(() => recipe?.ingredients.map((ingredient) => ({ id: ingredient.id, itemId: ingredient.itemId, itemUnitConversionId: ingredient.itemUnitConversionId, quantity: ingredient.enteredQuantity })) ?? [createIngredientDraft()]);
  const [fieldErrors, setFieldErrors] = useState<RecipeFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();

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
  }

  function removeIngredient(id: string) {
    setIngredients((currentIngredients) =>
      currentIngredients.length === 1
        ? currentIngredients
        : currentIngredients.filter((ingredient) => ingredient.id !== id),
    );
    clearFieldError("ingredients");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("preparationNote", preparationNote);
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
        router.push(recipe ? `/recipes/${recipe.id}` : "/recipes");
      } catch {
        setFormError("The Recipe could not be saved. Check your connection and try again.");
      }
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-heading-1 font-semibold">{recipe ? "Edit Recipe" : "New Recipe"}</h1>
          <p className="text-body text-muted-foreground">
            Add a reusable food template using each Item&apos;s Base Unit or configured alternate Unit.
          </p>
        </div>
        <Link href="/recipes" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Cancel
        </Link>
      </div>

      <form aria-label="Create Recipe" aria-busy={isSubmitting} noValidate onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
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
                Select active Items and enter each usual quantity in its Base Unit or a configured alternate Unit.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="overflow-x-auto">
                <Table>
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
                      const selectedItem = items.find((item) => item.id === ingredient.itemId);
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
                          <TableCell className="min-w-56 align-top">
                            <Field data-invalid={Boolean(itemErrors?.length)}>
                            <Select
                              items={items.map((item) => ({ value: item.id, label: item.name }))}
                              value={ingredient.itemId || null}
                              onValueChange={(value) => updateIngredient(ingredient.id, "itemId", value ?? "")}
                            >
                              <SelectTrigger
                                id={itemInputId}
                                className="w-full"
                                aria-label={`Ingredient ${index + 1} Item`}
                                aria-invalid={Boolean(itemErrors?.length)}
                                aria-describedby={itemErrors?.length ? `${itemInputId}-error` : undefined}
                              >
                                <SelectValue placeholder="Select an Item" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {items.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                            <FieldMessages id={`${itemInputId}-error`} errors={itemErrors} />
                            </Field>
                          </TableCell>
                          <TableCell className="align-top">
                            <Field data-invalid={Boolean(quantityErrors?.length)}>
                            <Input
                              id={quantityInputId}
                              className="min-w-28"
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
                          <TableCell className="align-top text-muted-foreground">
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
                              value={ingredient.itemUnitConversionId ?? "base-unit"}
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
                                <SelectValue placeholder="Select an Item first" />
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
                          <TableCell className="align-top text-muted-foreground">
                            {selectedItem
                              ? calculatedBaseUnitQuantity
                                ? `${calculatedBaseUnitQuantity} ${selectedItem.baseUnit.abbreviation}`
                                : `${selectedItem.baseUnit.name} (${selectedItem.baseUnit.abbreviation})`
                              : "—"}
                          </TableCell>
                          <TableCell className="align-top text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
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
                </Table>
              </div>
              <Field data-invalid={Boolean(fieldErrors.ingredients?.length)}>
                <FieldMessages id="recipe-ingredients-error" errors={fieldErrors.ingredients} />
              </Field>
              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setIngredients((currentIngredients) => [...currentIngredients, createIngredientDraft()])}>
                  <Plus data-icon="inline-start" />
                  Add Ingredient
                </Button>
                <Button type="submit" disabled={isSubmitting || items.length === 0}>
                  {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
                  {isSubmitting ? "Saving..." : recipe ? "Save Recipe" : "Create Recipe"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </main>
  );
}
