import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { listVendors } from "@/features/master-data/server";
import { canManagePurchaseOrders, getPurchaseOrder, listItems } from "@/features/supply-operations/server";
import { DeliveryReceiptDialog, PurchaseOrderDetailContent } from "@/features/supply-operations/ui";
import WorkspaceShell from "@/components/workspace/workspace-shell";
import { auth } from "@/server/auth";

export default async function RecordDeliveryRoute({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const { id } = await params;
  const [purchaseOrder, items] = await Promise.all([getPurchaseOrder(id), listItems()]);
  if (!purchaseOrder) notFound();

  const canManage = await canManagePurchaseOrders({ id: session.user.id, name: session.user.name, username: session.user.username ?? null });
  const vendors = canManage ? await listVendors() : [];

  return <WorkspaceShell user={{
    name: session.user.name ?? session.user.username ?? "Municipal staff",
    username: session.user.username ?? "staff account",
  }} activeSection="purchase-orders">
    <PurchaseOrderDetailContent purchaseOrder={purchaseOrder} canManage={canManage} vendors={vendors} />
    <DeliveryReceiptDialog
      purchaseOrderId={purchaseOrder.id}
      vendorName={purchaseOrder.vendor.name}
      items={items.filter((item) => item.isActive)}
    />
  </WorkspaceShell>;
}
