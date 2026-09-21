import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPurchaseOrder, listItems } from "@/features/supply-operations/server";
import { DeliveryReceiptForm } from "@/features/supply-operations/ui";
import { cn } from "@/lib/utils";
import { auth } from "@/server/auth";

export default async function RecordDeliveryRoute({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");
  const { id } = await params;
  const [purchaseOrder, items] = await Promise.all([getPurchaseOrder(id), listItems()]);
  if (!purchaseOrder) notFound();
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-6 bg-card px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-3">
        <Link
          href={`/purchase-orders/${purchaseOrder.id}`}
          className={cn(buttonVariants({ variant: "outline" }), "self-start")}
        >
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          Back to Purchase Order
        </Link>
        <div>
          <p className="text-label font-medium uppercase tracking-label text-primary">
            Purchase Order {purchaseOrder.purchaseOrderNo}
          </p>
          <h1 className="text-heading-1 font-semibold">Record delivery</h1>
          <p className="text-body text-muted-foreground">
            Post one or more accepted Items in their Base Unit or a configured alternate Unit.
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Delivery Receipt</CardTitle>
          <CardDescription>Vendor: {purchaseOrder.vendor.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <DeliveryReceiptForm
            purchaseOrderId={purchaseOrder.id}
            items={items.filter((item) => item.isActive)}
          />
        </CardContent>
      </Card>
    </main>
  );
}
