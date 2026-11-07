import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { getPurchaseOrder, listItems } from "@/features/supply-operations/server";
import { DeliveryReceiptDialog, PurchaseOrderDetailContent } from "@/features/supply-operations/ui";
import WorkspaceShell from "@/components/workspace/workspace-shell";
import { auth } from "@/server/auth";

export default async function RecordDeliveryRoute({
  params,
  searchParams,
}: PageProps<"/purchase-orders/[id]/record-delivery">) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const [{ id }, catalogQuery] = await Promise.all([params, searchParams]);
  const [purchaseOrder, items] = await Promise.all([getPurchaseOrder(id), listItems()]);
  if (!purchaseOrder) notFound();

  return <WorkspaceShell user={{
    name: session.user.name ?? session.user.username ?? "Municipal staff",
    username: session.user.username ?? "staff account",
  }} activeSection="purchase-orders">
    <PurchaseOrderDetailContent purchaseOrder={purchaseOrder} searchParams={catalogQuery} />
    <DeliveryReceiptDialog
      purchaseOrderId={purchaseOrder.id}
      purchaseOrderNo={purchaseOrder.purchaseOrderNo}
      vendorName={purchaseOrder.vendor.name}
      searchParams={catalogQuery}
      items={items.filter((item) => item.isActive)}
    />
  </WorkspaceShell>;
}
