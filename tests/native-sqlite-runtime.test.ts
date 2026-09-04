import { PrismaClient } from "@/prisma/generated/client";
import { describe, expect, it } from "vitest";

function nativeRuntimeFailure(layer: string, error: unknown) {
  const detail = error instanceof Error ? error.message : String(error);

  return new Error(
    `Native SQLite runtime smoke test failed for ${layer}. ` +
      `The native binding may be missing or incompatible with Node ${process.versions.node}: ${detail}`,
    { cause: error },
  );
}

describe("native SQLite runtime", () => {
  it("executes real in-memory queries through both SQLite entry points", async () => {
    let directDatabase: import("better-sqlite3").Database | undefined;
    let prisma: PrismaClient | undefined;

    try {
      try {
        const { default: Database } = await import("better-sqlite3");

        directDatabase = new Database(":memory:");
        directDatabase.exec(
          "CREATE TABLE native_runtime_smoke (value INTEGER NOT NULL)",
        );
        directDatabase
          .prepare("INSERT INTO native_runtime_smoke (value) VALUES (?)")
          .run(42);

        expect(
          directDatabase
            .prepare("SELECT value FROM native_runtime_smoke")
            .all(),
        ).toEqual([{ value: 42 }]);
      } catch (error) {
        throw nativeRuntimeFailure("direct better-sqlite3", error);
      }

      try {
        const { PrismaBetterSqlite3 } = await import(
          "@prisma/adapter-better-sqlite3"
        );

        prisma = new PrismaClient({
          adapter: new PrismaBetterSqlite3({ url: ":memory:" }),
        });
        await prisma.$executeRaw`
          CREATE TABLE native_runtime_smoke (value INTEGER NOT NULL)
        `;
        await prisma.$executeRaw`
          INSERT INTO native_runtime_smoke (value) VALUES (42)
        `;

        const rows = await prisma.$queryRaw<Array<{ value: number | bigint }>>`
          SELECT value FROM native_runtime_smoke
        `;

        expect(rows.map(({ value }) => Number(value))).toEqual([42]);
      } catch (error) {
        throw nativeRuntimeFailure("Prisma SQLite driver adapter", error);
      }
    } finally {
      directDatabase?.close();
      await prisma?.$disconnect();
    }
  });
});
