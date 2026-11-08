import { spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { hashPassword } from "better-auth/crypto";

export function runtimeEnvironment(dataDirectory, url) {
  mkdirSync(dataDirectory, { recursive: true });
  const secretPath = join(dataDirectory, "auth-secret.txt");
  if (!existsSync(secretPath)) {
    writeFileSync(secretPath, randomBytes(32).toString("hex"), { flag: "wx" });
  }
  const secret = readFileSync(secretPath, "utf8").trim();
  if (!/^[a-f0-9]{64}$/.test(secret)) throw new Error("Invalid local authentication secret.");

  return {
    ...process.env,
    NODE_ENV: "production",
    NODE_OPTIONS: "",
    NEXT_DIST_DIR: ".next-build-windows",
    NEXT_TELEMETRY_DISABLED: "1",
    BETTER_AUTH_URL: url,
    BETTER_AUTH_SECRET: secret,
    DATABASE_URL: `file:${join(dataDirectory, "masanao.db").replaceAll("\\", "/")}`,
  };
}

export async function prepareDatabase(root, dataDirectory, env) {
  const databasePath = join(dataDirectory, "masanao.db");
  if (existsSync(databasePath)) {
    const database = new Database(databasePath, { readonly: true, fileMustExist: true });
    try {
      const migrations = readdirSync(join(root, "src", "prisma", "migrations"), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
      const hasHistory = database.prepare("SELECT 1 FROM sqlite_master WHERE name = '_prisma_migrations'").get();
      const history = hasHistory ? database.prepare("SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations").all() : [];
      const applied = history.filter((row) => !row.rolled_back_at);
      if (applied.some((row) => !row.finished_at || !migrations.includes(row.migration_name))) {
        throw new Error("This database belongs to a newer Masanao version or has an incomplete update. Contact the person who installed Masanao.");
      }
      const completed = new Set(applied.map((row) => row.migration_name));
      if (migrations.every((migration) => completed.has(migration))) return;

      const backups = join(dataDirectory, "backups");
      mkdirSync(backups, { recursive: true });
      const stamp = new Date().toISOString().replaceAll(":", "-");
      await database.backup(join(backups, `before-update-${stamp}-${randomUUID()}.db`));
    } finally {
      database.close();
    }
  } else {
    // The Prisma engine can migrate an existing SQLite file at an absolute Windows path.
    // Create the empty file here so the engine doesn't have to create it from a file URL.
    new Database(databasePath).close();
  }

  const result = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy", "--config", "prisma7.config.ts"], {
    cwd: root,
    env: {
      ...env,
      CHECKPOINT_DISABLE: "1",
      PRISMA_SCHEMA_ENGINE_BINARY: join(root, "node_modules", "@prisma", "engines", "schema-engine-windows.exe"),
    },
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("Database setup failed. Contact the person who installed Masanao before retrying.");
}

export async function createFirstAdmin(dataDirectory, { username, password }) {
  if (typeof username !== "string" || !/^[a-zA-Z0-9_.]{3,30}$/.test(username) ||
      typeof password !== "string" || password.length < 8 || password.length > 128) {
    throw new Error("Use a 3–30 character username (letters, numbers, dots or underscores) and an 8–128 character password.");
  }
  username = username.toLowerCase();
  const passwordHash = await hashPassword(password);
  const database = new Database(join(dataDirectory, "masanao.db"), { fileMustExist: true });
  try {
    database.transaction(() => {
      if (database.prepare('SELECT 1 FROM "user" LIMIT 1').get()) {
        throw new Error("This installation already has a user account.");
      }
      const id = randomUUID();
      database.prepare(`INSERT INTO "user"
        ("id", "name", "email", "username", "role", "emailVerified", "createdAt", "updatedAt")
        VALUES (?, ?, ?, ?, 'admin', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
        .run(id, username, `${username}@internal.masanao`, username);
      database.prepare(`INSERT INTO "account"
        ("id", "issuer", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
        VALUES (?, 'local:credential', ?, 'credential', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
        .run(randomUUID(), id, id, passwordHash);
    }).immediate();
  } finally {
    database.close();
  }
}
