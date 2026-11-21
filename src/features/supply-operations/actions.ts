"use server";

import { executeCreateItem } from "./server/actions/create-item";
import { executeCreateItemWithConversions } from "./server/actions/create-item-with-conversions";

export async function createItemWithConversionsAction(input: unknown) { return executeCreateItemWithConversions(input); }
import { executeOpeningStockAction } from "./server/actions/opening-stock";

export async function beginOpeningStockAction(input: unknown) { return executeOpeningStockAction("begin", input); }
export async function saveOpeningStockDraftAction(input: unknown) { return executeOpeningStockAction("save", input); }
export async function discardOpeningStockDraftAction(input: unknown) { return executeOpeningStockAction("discard", input); }
export async function postOpeningStockAction(input: unknown) { return executeOpeningStockAction("post", input); }
import { executeDeleteItem } from "./server/actions/delete-item";
import { executeSetItemActive } from "./server/actions/set-item-active";
import { executeUpdateItem } from "./server/actions/update-item";
import { executeCreateItemUnitConversion } from "./server/actions/create-item-unit-conversion";
import { executeCreatePurchaseOrder } from "./server/actions/create-purchase-order";
import { executeDeletePurchaseOrder } from "./server/actions/delete-purchase-order";
import { executeUpdatePurchaseOrder } from "./server/actions/update-purchase-order";
import { executePostDeliveryReceipt } from "./server/actions/post-delivery-receipt";
import { executeReadPurchaseOrderDeliverySummaries } from "./server/actions/purchase-order-delivery-summaries";
import type {
  ItemDeleteActionState,
  ItemFormActionState,
  ItemLifecycleActionState,
  PurchaseOrderFormActionState,
  PurchaseOrderDeleteActionState,
} from "./types";
import type { ItemUnitConversionActionState } from "./types";
import type { DeliveryReceiptPostActionState } from "./types";

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

export async function createItemUnitConversionAction(formData: FormData): Promise<ItemUnitConversionActionState> {
  return executeCreateItemUnitConversion(formData);
}

export async function createPurchaseOrderAction(
  formData: FormData,
): Promise<PurchaseOrderFormActionState> {
  return executeCreatePurchaseOrder(formData);
}

export async function updatePurchaseOrderAction(
  formData: FormData,
): Promise<PurchaseOrderFormActionState> {
  return executeUpdatePurchaseOrder(formData);
}

export async function deletePurchaseOrderAction(
  id: string,
): Promise<PurchaseOrderDeleteActionState> {
  return executeDeletePurchaseOrder(id);
}

export async function postDeliveryReceiptAction(formData: FormData): Promise<DeliveryReceiptPostActionState> {
  return executePostDeliveryReceipt(formData);
}

export async function readPurchaseOrderDeliverySummariesAction(ids: string[]) {
  return executeReadPurchaseOrderDeliverySummaries(ids);
}

import { executeOpeningStockCorrectionAction } from "./server/actions/opening-stock-corrections";
export async function beginOpeningStockCorrectionAction(input: unknown) { return executeOpeningStockCorrectionAction("begin", input); }
export async function saveOpeningStockCorrectionAction(input: unknown) { return executeOpeningStockCorrectionAction("save", input); }
export async function postOpeningStockCorrectionAction(input: unknown) { return executeOpeningStockCorrectionAction("post", input); }
export async function discardOpeningStockCorrectionAction(input: unknown) { return executeOpeningStockCorrectionAction("discard", input); }
