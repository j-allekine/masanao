import Database from "better-sqlite3";
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll } from "vitest";

const testDatabaseDirectory = mkdtempSync(join(tmpdir(), "masanao-auth-"));
const testDatabasePath = join(testDatabaseDirectory, "test.db").replaceAll(
  "\\",
  "/",
);

process.env.DATABASE_URL = `file:${testDatabasePath}`;
process.env.BETTER_AUTH_SECRET =
  "test-only-secret-that-is-long-enough-for-better-auth";
process.env.BETTER_AUTH_URL = "http://localhost:3000";

const database = new Database(join(testDatabaseDirectory, "test.db"));
const migrationDirectory = join(process.cwd(), "prisma", "migrations");

for (const migration of readdirSync(migrationDirectory, {
  withFileTypes: true,
}).filter((entry) => entry.isDirectory()).sort((a, b) =>
  a.name.localeCompare(b.name),
)) {
  const migrationPath = join(migrationDirectory, migration.name, "migration.sql");

  database.exec(readFileSync(migrationPath, "utf8"));
}

database.close();

afterAll(async () => {
  const { prisma } = await import("../lib/prisma");

  await prisma.$disconnect();
  rmSync(testDatabaseDirectory, { force: true, recursive: true });
});
