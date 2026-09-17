import PurchaseOrdersTable from "./purchase-orders-table";
import type { PurchaseOrderListItem } from "../types";

export default function PurchaseOrdersWorkspace({
  purchaseOrders,
}: {
  purchaseOrders: PurchaseOrderListItem[];
}) {
  return (
    <main className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-3 border-b pb-5">
        <div className="min-w-0">
          <h1 className="text-heading-1 font-semibold">Purchase Orders</h1>
          <p className="text-body text-muted-foreground">
            View the orders under which supplies are expected and received.
          </p>
        </div>
      </div>
      <PurchaseOrdersTable purchaseOrders={purchaseOrders} />
    </main>
  );
}
