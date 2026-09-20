import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import WorkspaceShell from "@/components/workspace/workspace-shell";
import { getPurchaseOrder } from "@/features/supply-operations/server";
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

  const purchaseOrder = await getPurchaseOrder(id);
  if (!purchaseOrder) notFound();

  return (
    <WorkspaceShell
      user={{
        name: session.user.name ?? session.user.username ?? "Municipal staff",
        username: session.user.username ?? "staff account",
      }}
      activeSection="purchase-orders"
    >
      <PurchaseOrderDetailContent purchaseOrder={purchaseOrder} />
    </WorkspaceShell>
  );
}
