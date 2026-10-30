import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import WorkspaceShell from "@/components/workspace/workspace-shell";
import { listVendors } from "@/features/master-data/server";
import { canManagePurchaseOrders, getPurchaseOrder } from "@/features/supply-operations/server";
import { PurchaseOrderDetailContent } from "@/features/supply-operations/ui";
import { auth } from "@/server/auth";

export const metadata: Metadata = {
  title: "Purchase Order | Masanao",
  description: "Review a municipal kitchen Purchase Order and its Delivery Receipts.",
};

export default async function PurchaseOrderDetailRoute(
  props: PageProps<"/purchase-orders/[id]">,
) {
  const [{ id }, session] = await Promise.all([
    props.params,
    auth.api.getSession({ headers: await headers() }),
  ]);

  if (!session) {
    redirect("/");
  }

  const [purchaseOrder, canManage] = await Promise.all([getPurchaseOrder(id), canManagePurchaseOrders({ id: session.user.id, name: session.user.name, username: session.user.username ?? null })]);
  const vendors = canManage ? await listVendors() : [];
  if (!purchaseOrder) notFound();

  return (
    <WorkspaceShell
      user={{
        name: session.user.name ?? session.user.username ?? "Municipal staff",
        username: session.user.username ?? "staff account",
      }}
      activeSection="purchase-orders"
    >
      <PurchaseOrderDetailContent purchaseOrder={purchaseOrder} canManage={canManage} vendors={vendors} />
    </WorkspaceShell>
  );
}
