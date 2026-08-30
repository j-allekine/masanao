import Database from "better-sqlite3";
import {
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { hashPassword } from "better-auth/crypto";

export default async function globalSetup() {
  const databasePath = process.env.MASANAO_E2E_DATABASE_PATH;
  if (!databasePath) {
    throw new Error("MASANAO_E2E_DATABASE_PATH is not set");
  }
  const resolvedDatabasePath = databasePath;

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

  function cleanupDatabase() {
    try {
      rmSync(resolvedDatabasePath, { force: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EPERM") {
        throw error;
      }
    }
  }

  process.on("exit", cleanupDatabase);

  return async () => {
    cleanupDatabase();
  };
}
