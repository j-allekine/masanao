// Disposable local preview. Never reads or writes the application's configured database.
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, execFileSync } from "node:child_process";
import Database from "better-sqlite3";
import { hashPassword } from "better-auth/crypto";

const databasePath = join(tmpdir(), `masanao-opening-stock-prototype-${randomUUID()}.db`);
const env = {
  ...process.env,
  DATABASE_URL: `file:${databasePath.replaceAll("\\", "/")}`,
  BETTER_AUTH_SECRET: randomUUID() + randomUUID(),
  BETTER_AUTH_URL: "http://localhost:3118",
  NEXT_DIST_DIR: ".next-debug-login",
  DISABLE_ERD: "true",
};
execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "generate", "--generator", "client", "--config", "prisma7.config.ts"], { env, stdio: "inherit" });
const database = new Database(databasePath);
const migrations = join(process.cwd(), "src/prisma/migrations");
for (const entry of readdirSync(migrations, { withFileTypes: true }).filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
  database.exec(readFileSync(join(migrations, entry.name, "migration.sql"), "utf8"));
}
database.prepare(`INSERT INTO user (id, name, email, username, role, disabled, emailVerified, createdAt, updatedAt)
  VALUES ('opening-stock-demo', 'Prototype Administrator', 'opening-stock@internal.masanao', 'opening.demo', 'admin', 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).run();
database.prepare(`INSERT INTO account (id, issuer, accountId, providerId, userId, password, createdAt, updatedAt)
  VALUES ('opening-demo-account', 'local:credential', 'opening-stock-demo', 'credential', 'opening-stock-demo', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).run(await hashPassword("OpeningStockDemo123!"));
database.close();
console.log("\nOpening Stock prototype: http://localhost:3118/inventory?prototype=opening-stock&variant=A");
console.log("Demo login: opening.demo / OpeningStockDemo123!");
console.log("Uses a new disposable database. All Opening Stock interactions are in memory.\n");
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3118"], { env, stdio: "inherit" });
server.on("exit", (code) => { process.exitCode = code ?? 0; });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));
