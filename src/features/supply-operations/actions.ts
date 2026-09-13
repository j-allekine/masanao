"use server";

import { executeCreateItem } from "./server/actions/create-item";
import { executeDeleteItem } from "./server/actions/delete-item";
import { executeSetItemActive } from "./server/actions/set-item-active";
import { executeUpdateItem } from "./server/actions/update-item";
import type { ItemDeleteActionState, ItemFormActionState, ItemLifecycleActionState } from "./types";

export async function createItemAction(formData: FormData): Promise<ItemFormActionState> {
  return executeCreateItem(formData);
}

export async function updateItemAction(formData: FormData): Promise<ItemFormActionState> {
  return executeUpdateItem(formData);
}

export async function setItemActiveAction(id: string, isActive: boolean): Promise<ItemLifecycleActionState> {
  return executeSetItemActive(id, isActive);
}

export async function deleteItemAction(id: string): Promise<ItemDeleteActionState> {
  return executeDeleteItem(id);
}
