import Database from "better-sqlite3";
import { readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { hashPassword } from "better-auth/crypto";

export default async function globalSetup() {
  const databasePath = process.env.MASANAO_E2E_DATABASE_PATH;
  if (!databasePath) {
    throw new Error("MASANAO_E2E_DATABASE_PATH is not set");
  }
  const resolvedDatabasePath = databasePath;

  for (const entry of readdirSync(process.cwd(), { withFileTypes: true })) {
    if (
      entry.isDirectory() &&
      entry.name !== process.env.NEXT_DIST_DIR &&
      /^\.next-e2e-[a-f0-9-]+$/.test(entry.name)
    ) {
      rmSync(join(process.cwd(), entry.name), { force: true, recursive: true });
    }
  }
  for (const entry of readdirSync(tmpdir(), { withFileTypes: true })) {
    if (entry.isFile() && /^masanao-e2e-[a-f0-9-]+\.db$/.test(entry.name)) {
      rmSync(join(tmpdir(), entry.name), { force: true });
    }
  }
  rmSync(resolvedDatabasePath, { force: true });

  const migrationDirectory = join(process.cwd(), "src", "prisma", "migrations");
  const migrationNames = readdirSync(migrationDirectory, {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const database = new Database(resolvedDatabasePath);
  for (const migrationName of migrationNames) {
    database.exec(
      readFileSync(
        join(migrationDirectory, migrationName, "migration.sql"),
        "utf8",
      ),
    );
  }

  const password = await hashPassword("correct-horse-battery-staple");

  database
    .prepare(
      `INSERT INTO "user"
       ("id", "name", "email", "username", "role", "disabled", "emailVerified", "createdAt", "updatedAt")
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    )
    .run(
      "e2e-staff-user",
      "Kitchen Staff",
      "kitchen.staff@internal.masanao",
      "kitchen.staff",
      "staff",
      0,
      0,
    );
  database
    .prepare(
      `INSERT INTO "account"
       ("id", "issuer", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    )
    .run(
      "e2e-staff-credential-account",
      "local:credential",
      "e2e-staff-user",
      "credential",
      "e2e-staff-user",
      password,
    );
  database.close();
}
