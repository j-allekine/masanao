import "server-only";

import type { CurrentActor } from "@/server/auth";
import { isCurrentActorAdministrator } from "@/server/current-actor-role";

import { createItemCommand } from "./server/commands/create-item";
import { deleteItemCommand } from "./server/commands/delete-item";
import { setItemActiveCommand } from "./server/commands/set-item-active";
import { updateItemCommand } from "./server/commands/update-item";
import { createItemUnitConversionCommand } from "./server/commands/create-item-unit-conversion";
import { listItems as listItemsQuery } from "./server/queries/list-items";
import { listPurchaseOrders as listPurchaseOrdersQuery } from "./server/queries/list-purchase-orders";
import type {
  ItemCreateResult,
  ItemDeleteResult,
  ItemLifecycleResult,
  ItemUpdateResult,
  ItemUnitConversionCreateResult,
} from "./types";

export type {
  ItemListItem,
  ItemLookupCategory,
  ItemLookupUnit,
  PurchaseOrderListItem,
} from "./types";

export async function listItems() {
  return listItemsQuery();
}

export async function listPurchaseOrders() {
  return listPurchaseOrdersQuery();
}

export async function canManageItems(actor: CurrentActor) {
  return isCurrentActorAdministrator(actor.id);
}

async function authorizeAdministrator(actor: CurrentActor) {
  if (await canManageItems(actor)) return null;

  return {
    ok: false as const,
    kind: "forbidden" as const,
    error: "Administrator access required",
  };
}

export async function createItem(actor: CurrentActor, input: unknown): Promise<ItemCreateResult> {
  const authorizationFailure = await authorizeAdministrator(actor);
  return authorizationFailure ? { ...authorizationFailure, fields: {} } : createItemCommand(input);
}

export async function updateItem(actor: CurrentActor, id: string, input: unknown): Promise<ItemUpdateResult> {
  const authorizationFailure = await authorizeAdministrator(actor);
  return authorizationFailure ? { ...authorizationFailure, fields: {} } : updateItemCommand(id, input);
}

export async function setItemActive(actor: CurrentActor, id: string, isActive: boolean): Promise<ItemLifecycleResult> {
  const authorizationFailure = await authorizeAdministrator(actor);
  return authorizationFailure ?? setItemActiveCommand(id, isActive);
}

export async function deleteItem(actor: CurrentActor, id: string): Promise<ItemDeleteResult> {
  const authorizationFailure = await authorizeAdministrator(actor);
  return authorizationFailure ?? deleteItemCommand(id);
}

export async function createItemUnitConversion(actor: CurrentActor, itemId: string, input: unknown): Promise<ItemUnitConversionCreateResult> {
  const authorizationFailure = await authorizeAdministrator(actor);
  return authorizationFailure
    ? { ...authorizationFailure, fields: {} }
    : createItemUnitConversionCommand(itemId, input);
}
