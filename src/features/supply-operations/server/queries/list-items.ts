import "server-only";

import { listItemRecords } from "../db/items";

export async function listItems() {
  return listItemRecords();
}
