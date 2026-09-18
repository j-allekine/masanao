import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import WorkspaceShell from "@/components/workspace/workspace-shell";
import { listVendors } from "@/features/master-data/server";
import {
  canManagePurchaseOrders,
  listPurchaseOrders,
} from "@/features/supply-operations/server";
import { PurchaseOrdersContent } from "@/features/supply-operations/ui";
import { auth } from "@/server/auth";

export const metadata: Metadata = {
  title: "Purchase Orders | Masanao",
  description: "Browse municipal kitchen purchase order references.",
};

export default async function PurchaseOrdersRoute() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  const actor = {
    id: session.user.id,
    name: session.user.name ?? session.user.username ?? "Municipal staff",
    username: session.user.username ?? null,
  };
  const [purchaseOrders, vendors, canManagePurchaseOrdersResult] =
    await Promise.all([
      listPurchaseOrders(),
      listVendors(),
      canManagePurchaseOrders(actor),
    ]);

  return (
    <WorkspaceShell
      user={{
        name: session.user.name ?? session.user.username ?? "Municipal staff",
        username: session.user.username ?? "staff account",
      }}
      activeSection="purchase-orders"
    >
      <PurchaseOrdersContent
        purchaseOrders={purchaseOrders}
        vendors={vendors}
        canManagePurchaseOrders={canManagePurchaseOrdersResult}
      />
    </WorkspaceShell>
  );
}
