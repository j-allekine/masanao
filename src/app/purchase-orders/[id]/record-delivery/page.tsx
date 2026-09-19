import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPurchaseOrder, listItems } from "@/features/supply-operations/server";
import { DeliveryReceiptForm } from "@/features/supply-operations/ui";

export default async function RecordDeliveryRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [purchaseOrder, items] = await Promise.all([getPurchaseOrder(id), listItems()]);
  if (!purchaseOrder) notFound();
  return <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col gap-6 bg-card px-4 py-6 sm:px-6"><div><p className="text-label font-medium uppercase tracking-label text-primary">Purchase Order {purchaseOrder.purchaseOrderNo}</p><h1 className="text-heading-1 font-semibold">Record delivery</h1><p className="text-body text-muted-foreground">Post one accepted Item directly in its Base Unit.</p></div><Card><CardHeader><CardTitle>Delivery Receipt</CardTitle><CardDescription>Vendor: {purchaseOrder.vendor.name}</CardDescription></CardHeader><CardContent><DeliveryReceiptForm purchaseOrderId={purchaseOrder.id} items={items.filter((item) => item.isActive)} /></CardContent></Card></main>;
}
