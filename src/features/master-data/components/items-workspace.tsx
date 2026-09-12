import type { ItemListItem } from "../types";
import ItemsTable from "./items-table";

export default function ItemsWorkspace({
  items,
  canManageItems,
}: {
  items: ItemListItem[];
  canManageItems: boolean;
}) {
  return (
    <main
      className="flex min-w-0 flex-col gap-6"
      data-can-manage-items={canManageItems ? "true" : "false"}
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-heading-1 font-semibold">Items</h1>
        <p className="text-body text-muted-foreground">
          View the ingredients and supplies available to municipal kitchen operations.
        </p>
      </div>
      <ItemsTable items={items} />
    </main>
  );
}
