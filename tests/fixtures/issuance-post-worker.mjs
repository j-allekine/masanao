import { register } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Run the real feature DB seam in a separate Node event loop and SQLite
// connection. No SQL mock, HTTP test endpoint, or global Prisma singleton race.
const sourceUrl = pathToFileURL(resolve(process.cwd(), "src") + "/").href;
const loader = `
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: "data:text/javascript,export {}", shortCircuit: true };
  if (specifier.startsWith("@/")) specifier = ${JSON.stringify(sourceUrl)} + specifier.slice(2);
  try { return await nextResolve(specifier, context); }
  catch (error) {
    if (error.code !== "ERR_MODULE_NOT_FOUND" || (!specifier.startsWith(".") && !specifier.startsWith("file:"))) throw error;
    return nextResolve(specifier + ".ts", context);
  }
}`;
register(`data:text/javascript,${encodeURIComponent(loader)}`, import.meta.url);
const { PrismaClient } = await import("../../src/prisma/generated/client.ts");
const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
const { postIssuanceRecord } = await import("../../src/features/issuance/server/db/post.ts");
const database = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL, timeout: Number(process.env.POST_TEST_TIMEOUT ?? 2000) }) });
await database.$connect();
const nextMessage = () => new Promise((resolve) => process.once("message", resolve));
process.send({ state: "ready" });
const { context, hold } = await nextMessage();
try {
  const hooks = hold ? { afterFirstMovement: async () => { process.send({ state: "locked" }); await nextMessage(); } } : {};
  const result = await postIssuanceRecord({ id: "race-staff", name: "Staff", username: "racestaff" }, context, 1, database, hooks);
  process.send({ state: "result", result });
} catch (error) {
  process.send({ state: "error", message: error.stack ?? String(error) });
} finally {
  await database.$disconnect();
  process.disconnect();
}
