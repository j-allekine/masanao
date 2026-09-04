import { register } from "node:module";
import { access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const generatedClientPath = resolve(
  scriptDirectory,
  "../src/prisma/generated/client.ts",
);

// Prisma's prisma-client generator emits TypeScript files with extensionless
// relative imports. Node can strip their types, but needs this resolver to
// follow those imports when no TypeScript runtime package is installed.
const generatedClientLoader = `
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (error?.code !== "ERR_MODULE_NOT_FOUND" || !specifier.startsWith(".")) {
      throw error;
    }

    return nextResolve(specifier + ".ts", context);
  }
}
`;

register(
  `data:text/javascript,${encodeURIComponent(generatedClientLoader)}`,
  pathToFileURL(`${scriptDirectory}/verify-production-sqlite.mjs`),
);

function errorDetail(error) {
  return error instanceof Error ? error.message : String(error);
}

function nativeRuntimeError(stage, error) {
  return new Error(
    [
      `Production SQLite runtime verification failed while ${stage}.`,
      "The better-sqlite3 native binding is missing or incompatible with this Node.js runtime.",
      "This commonly means the package lifecycle install was skipped or blocked (for example, pnpm install --ignore-scripts), or a binding was built for a different Node.js ABI.",
      "Fix: run pnpm install --frozen-lockfile without --ignore-scripts, keep pnpm-workspace.yaml's better-sqlite3: true allowBuilds entry, then run pnpm rebuild better-sqlite3 if needed.",
      `Node ${process.versions.node} on ${process.platform}-${process.arch}. Original error: ${errorDetail(error)}`,
    ].join("\n"),
    { cause: error },
  );
}

function generatedClientError(error) {
  return new Error(
    [
      "The generated application Prisma client could not be loaded.",
      `Expected: ${generatedClientPath}`,
      "Generate the client before pruning devDependencies: pnpm exec prisma generate --config prisma7.config.ts.",
      `Original error: ${errorDetail(error)}`,
    ].join("\n"),
    { cause: error },
  );
}

async function main() {
  try {
    await access(generatedClientPath);
  } catch (error) {
    throw generatedClientError(error);
  }

  let PrismaBetterSqlite3;
  try {
    ({ PrismaBetterSqlite3 } = await import(
      "@prisma/adapter-better-sqlite3"
    ));
  } catch (error) {
    throw nativeRuntimeError("loading the production SQLite adapter", error);
  }

  let PrismaClient;
  try {
    ({ PrismaClient } = await import(pathToFileURL(generatedClientPath)));
  } catch (error) {
    throw generatedClientError(error);
  }

  let prisma;
  try {
    prisma = new PrismaClient({
      adapter: new PrismaBetterSqlite3({ url: ":memory:" }),
    });

    await prisma.$executeRaw`
      CREATE TABLE production_sqlite_runtime_check (value INTEGER NOT NULL)
    `;
    await prisma.$executeRaw`
      INSERT INTO production_sqlite_runtime_check (value) VALUES (42)
    `;

    const rows = await prisma.$queryRaw`
      SELECT value FROM production_sqlite_runtime_check
    `;

    if (rows.length !== 1 || Number(rows[0].value) !== 42) {
      throw new Error(`Unexpected SQLite query result: ${JSON.stringify(rows)}`);
    }
  } catch (error) {
    throw nativeRuntimeError("executing a Prisma query through SQLite", error);
  } finally {
    await prisma?.$disconnect();
  }

  console.log(
    `Production SQLite runtime verification passed on Node ${process.versions.node}.`,
  );
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
