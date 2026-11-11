import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

export function createActivityOfficeFixture(name: string) {
  const path = process.env.MASANAO_E2E_DATABASE_PATH;
  if (!path) throw new Error("Activity Office fixtures require the E2E database.");
  const id = randomUUID();

  function write(sql: string, ...parameters: string[]) {
    const db = new Database(path!);
    try {
      db.prepare(sql).run(...parameters);
    } finally {
      db.close();
    }
  }

  write(
    "INSERT INTO office (id, name, normalizedName, isActive, createdAt, updatedAt) VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
    id,
    name,
    name.toLowerCase(),
  );

  return {
    remove: () => write("DELETE FROM office WHERE id = ?", id),
    deactivate: () => write("UPDATE office SET isActive = 0 WHERE id = ?", id),
    rename: (nextName: string) => write(
      "UPDATE office SET name = ?, normalizedName = ? WHERE id = ?",
      nextName,
      nextName.toLowerCase(),
      id,
    ),
  };
}
