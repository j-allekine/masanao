import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import globalSetup from "./e2e/global-setup";

const originalDatabasePath = process.env.MASANAO_E2E_DATABASE_PATH;
const originalDistDir = process.env.NEXT_DIST_DIR;
let ownedPaths: string[] = [];

afterEach(() => {
  for (const path of ownedPaths) {
    rmSync(path, { force: true, recursive: true });
  }
  ownedPaths = [];

  if (originalDatabasePath === undefined) {
    delete process.env.MASANAO_E2E_DATABASE_PATH;
  } else {
    process.env.MASANAO_E2E_DATABASE_PATH = originalDatabasePath;
  }

  if (originalDistDir === undefined) {
    delete process.env.NEXT_DIST_DIR;
  } else {
    process.env.NEXT_DIST_DIR = originalDistDir;
  }
});

describe("Playwright isolated E2E setup", () => {
  it("does not delete artifacts owned by a sibling run", async () => {
    const currentDatabasePath = join(
      tmpdir(),
      `masanao-e2e-${randomUUID()}.db`,
    );
    const siblingDatabasePath = join(
      tmpdir(),
      `masanao-e2e-${randomUUID()}.db`,
    );
    const currentDistDir = `.next-e2e-${randomUUID()}`;
    const siblingDistDir = `.next-e2e-${randomUUID()}`;

    ownedPaths = [
      currentDatabasePath,
      siblingDatabasePath,
      join(process.cwd(), currentDistDir),
      join(process.cwd(), siblingDistDir),
    ];

    writeFileSync(siblingDatabasePath, "sibling database");
    mkdirSync(join(process.cwd(), siblingDistDir), { recursive: true });
    writeFileSync(join(process.cwd(), siblingDistDir, "marker"), "sibling");

    process.env.MASANAO_E2E_DATABASE_PATH = currentDatabasePath;
    process.env.NEXT_DIST_DIR = currentDistDir;

    await globalSetup();

    expect(existsSync(siblingDatabasePath)).toBe(true);
    expect(existsSync(join(process.cwd(), siblingDistDir))).toBe(true);
  });
});
