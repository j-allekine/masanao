import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import Database from "better-sqlite3";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { createFirstAdmin, ensureDefaultAdmin } from "../scripts/windows/local-data.mjs";

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), "masanao-accounts-"));
  const database = new Database(join(directory, "masanao.db"));
  const migrations = fileURLToPath(new URL("../src/prisma/migrations/", import.meta.url));
  for (const entry of readdirSync(migrations, { withFileTypes: true }).filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    database.exec(readFileSync(join(migrations, entry.name, "migration.sql"), "utf8"));
  }
  t.after(() => {
    database.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return { directory, database };
}

test("fresh installation creates one admin with a hashed initial password", async (t) => {
  const { directory, database } = fixture(t);
  assert.equal(await ensureDefaultAdmin(directory), true);
  const user = database.prepare('SELECT * FROM "user"').get();
  assert.equal(user.username, "admin");
  assert.equal(user.role, "admin");
  const account = database.prepare('SELECT * FROM "account" WHERE "userId" = ?').get(user.id);
  assert.equal(account.issuer, "local:credential");
  assert.equal(account.providerId, "credential");
  assert.notEqual(account.password, "password123");
  assert.equal(await verifyPassword({ hash: account.password, password: "password123" }), true);
  assert.equal(await ensureDefaultAdmin(directory), false);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM "user"').get().count, 1);
});

test("startup preserves a changed admin password and disabled state", async (t) => {
  const { directory, database } = fixture(t);
  await ensureDefaultAdmin(directory);
  const changed = await hashPassword("a-changed-initial-password");
  database.prepare('UPDATE "account" SET "password" = ?').run(changed);
  database.exec('UPDATE "user" SET "disabled" = 1');
  const users = database.prepare('SELECT * FROM "user"').all();
  const accounts = database.prepare('SELECT * FROM "account"').all();
  assert.equal(await ensureDefaultAdmin(directory), false);
  assert.deepEqual(database.prepare('SELECT * FROM "user"').all(), users);
  assert.deepEqual(database.prepare('SELECT * FROM "account"').all(), accounts);
});

test("an existing custom account prevents default account creation", async (t) => {
  const { directory, database } = fixture(t);
  await createFirstAdmin(directory, { username: "custom.admin", password: "custom-initial-password" });
  assert.equal(await ensureDefaultAdmin(directory), false);
  assert.equal(database.prepare('SELECT "username" FROM "user"').get().username, "custom.admin");
  await assert.rejects(createFirstAdmin(directory, { username: "admin", password: "password123" }), /already has a user account/);
});

test("concurrent bootstrap requests create a single account", async (t) => {
  const { directory, database } = fixture(t);
  const created = await Promise.all([ensureDefaultAdmin(directory), ensureDefaultAdmin(directory)]);
  assert.equal(created.filter(Boolean).length, 1);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM "user"').get().count, 1);
  assert.equal(database.prepare('SELECT COUNT(*) AS count FROM "account"').get().count, 1);
});
