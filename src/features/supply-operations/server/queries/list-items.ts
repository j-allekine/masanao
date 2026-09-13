import "server-only";

import { listItemCategoryLookups, listItemRecords, listItemUnitLookups } from "../db/items";

export async function listItems() {
  return listItemRecords();
}

export async function listItemCategories() {
  return listItemCategoryLookups();
}

export async function listItemUnits() {
  return listItemUnitLookups();
}
