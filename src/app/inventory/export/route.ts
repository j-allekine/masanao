import { exportInventory } from "@/features/supply-operations/server";
import { getCurrentActor } from "@/server/auth";

// Intentional download API. Always authorize and read a new snapshot per request.
export async function GET(request: Request) {
  const actor = await getCurrentActor(request);
  const result = await exportInventory(actor, new URL(request.url).searchParams);
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  if (!result.ok) return new Response(result.error, { status: actor ? 403 : 401, headers });
  return new Response(result.csv, { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${result.filename}"` } });
}
