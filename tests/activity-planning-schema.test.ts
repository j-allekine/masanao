import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma } from "@/prisma/client";

const planningMigrationName = "20260829090000_add_activity_planning";
const officeOwnershipMigrationName = "20260901090000_move_office_to_activity";
const budgetMigrationName =
  "20260831090000_migrate_activity_budget_to_bigint";

describe("activity planning database foundation", () => {
  beforeEach(async () => {
    await prisma.mealSchedule.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.activityDesign.deleteMany();
  });

  it("enforces normalized Activity Design No. uniqueness at the database boundary", async () => {
    await prisma.activityDesign.create({
      data: {
        id: "normalized-design-one",
        activityDesignNo: "  AD-RAW-001  ",
        fiscalYear: 2026,
        title: "First design",
      },
    });

    await expect(
      prisma.activityDesign.create({
        data: {
          id: "normalized-design-two",
          activityDesignNo: "ad-raw-001",
          fiscalYear: 2026,
          title: "Second design",
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
    expect(await prisma.activityDesign.count()).toBe(1);
  });

  it("keeps empty child collections valid and restricts deleting parents with children", async () => {
    const design = await prisma.activityDesign.create({
      data: {
        id: "schema-design",
        activityDesignNo: "schema-design",
        fiscalYear: 2026,
        title: "Schema verification",
      },
      include: { activities: { include: { mealSchedules: true } } },
    });

    expect(design.activities).toEqual([]);
    expect(design.createdAt).toBeInstanceOf(Date);
    expect(design.updatedAt).toBeInstanceOf(Date);

    const activity = await prisma.activity.create({
      data: {
        id: "schema-activity",
        activityDesignId: design.id,
        name: "Schema activity",
        officeName: "Municipal Kitchen",
        scheduledDate: new Date("2026-09-01T00:00:00.000Z"),
      },
      include: { mealSchedules: true },
    });

    expect(activity.mealSchedules).toEqual([]);
    await expect(
      prisma.activityDesign.delete({ where: { id: design.id } }),
    ).rejects.toBeDefined();
    expect(await prisma.activityDesign.count()).toBe(1);

    await prisma.mealSchedule.create({
      data: {
        id: "schema-meal-schedule",
        activityId: activity.id,
        label: "Lunch",
        mealTime: "12:00",
      },
    });

    await expect(
      prisma.activity.delete({ where: { id: activity.id } }),
    ).rejects.toBeDefined();
    expect(await prisma.activity.count()).toBe(1);
  });

  it("stores timestamps on every planning model and permits leaf-first deletion", async () => {
    const design = await prisma.activityDesign.create({
      data: {
        id: "timestamp-design",
        activityDesignNo: "timestamp-design",
        fiscalYear: 2026,
        title: "Timestamp verification",
      },
    });
    const activity = await prisma.activity.create({
      data: {
        id: "timestamp-activity",
        activityDesignId: design.id,
        name: "Timestamp activity",
        officeName: "Municipal Kitchen",
        scheduledDate: new Date("2026-09-01T00:00:00.000Z"),
      },
    });
    const mealSchedule = await prisma.mealSchedule.create({
      data: {
        id: "timestamp-meal-schedule",
        activityId: activity.id,
        label: "Lunch",
        mealTime: "12:00",
      },
    });

    for (const record of [design, activity, mealSchedule]) {
      expect(record.createdAt).toBeInstanceOf(Date);
      expect(record.updatedAt).toBeInstanceOf(Date);
    }

    await prisma.mealSchedule.delete({ where: { id: mealSchedule.id } });
    await prisma.activity.delete({ where: { id: activity.id } });
    await prisma.activityDesign.delete({ where: { id: design.id } });

    await expect(
      prisma.mealSchedule.findUnique({ where: { id: mealSchedule.id } }),
    ).resolves.toBeNull();
    await expect(
      prisma.activity.findUnique({ where: { id: activity.id } }),
    ).resolves.toBeNull();
    await expect(
      prisma.activityDesign.findUnique({ where: { id: design.id } }),
    ).resolves.toBeNull();
  });

  it("applies the planning migration without removing existing authentication data", () => {
    const directory = mkdtempSync(join(tmpdir(), "masanao-planning-migration-"));
    const databasePath = join(directory, "migration.db");
    const database = new Database(databasePath);
    const migrationDirectory = join(process.cwd(), "src", "prisma", "migrations");

    const migrationNames = readdirSync(migrationDirectory, {
      withFileTypes: true,
    })
      .filter(
        (entry) =>
          entry.isDirectory() && entry.name < planningMigrationName,
      )
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));

    for (const migrationName of migrationNames) {
      database.exec(
        readFileSync(
          join(migrationDirectory, migrationName, "migration.sql"),
          "utf8",
        ),
      );
    }

    database
      .prepare(
        `INSERT INTO "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      )
      .run(
        "migration-user",
        "Migration User",
        "migration-user@internal.masanao",
        0,
      );

    database.exec(
      readFileSync(
        join(migrationDirectory, planningMigrationName, "migration.sql"),
        "utf8",
      ),
    );

    expect(
      database
        .prepare('SELECT "name" FROM "user" WHERE "id" = ?')
        .get("migration-user"),
    ).toEqual({ name: "Migration User" });
    expect(
      database
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('activity_design', 'activity', 'meal_schedule') ORDER BY name",
        )
        .all(),
    ).toEqual([
      { name: "activity" },
      { name: "activity_design" },
      { name: "meal_schedule" },
    ]);

    database.close();
    rmSync(directory, { force: true, recursive: true });
  });

  it("moves each existing design Office onto its Activities without losing planning data", () => {
    const directory = mkdtempSync(join(tmpdir(), "masanao-office-migration-"));
    const databasePath = join(directory, "migration.db");
    const database = new Database(databasePath);
    const migrationDirectory = join(process.cwd(), "src", "prisma", "migrations");

    database.exec(
      readFileSync(
        join(migrationDirectory, planningMigrationName, "migration.sql"),
        "utf8",
      ),
    );
    database
      .prepare(
        `INSERT INTO "activity_design"
          ("id", "activityDesignNo", "fiscalYear", "title", "officeName", "updatedAt")
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      )
      .run("design-one", "ad-001", 2026, "Nutrition Month", "CSWDO");
    database
      .prepare(
        `INSERT INTO "activity"
          ("id", "activityDesignId", "name", "scheduledDate", "updatedAt")
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      )
      .run("activity-one", "design-one", "Community Feeding", "2026-09-01");

    database.exec(
      readFileSync(
        join(
          migrationDirectory,
          officeOwnershipMigrationName,
          "migration.sql",
        ),
        "utf8",
      ),
    );

    expect(
      database
        .prepare('SELECT "officeName" FROM "activity" WHERE "id" = ?')
        .get("activity-one"),
    ).toEqual({ officeName: "CSWDO" });
    expect(
      database
        .prepare('PRAGMA table_info("activity_design")')
        .all()
        .some((column) => (column as { name: string }).name === "officeName"),
    ).toBe(false);
    expect(database.pragma("foreign_key_check")).toEqual([]);

    database.close();
    rmSync(directory, { force: true, recursive: true });
  });

  it("preserves authentication and Activity Planning data through the budget migration", () => {
    const directory = mkdtempSync(join(tmpdir(), "masanao-budget-migration-"));
    const databasePath = join(directory, "migration.db");
    const database = new Database(databasePath);
    const migrationDirectory = join(process.cwd(), "src", "prisma", "migrations");

    const migrationNames = readdirSync(migrationDirectory, {
      withFileTypes: true,
    })
      .filter(
        (entry) =>
          entry.isDirectory() && entry.name < budgetMigrationName,
      )
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));

    for (const migrationName of migrationNames) {
      database.exec(
        readFileSync(
          join(migrationDirectory, migrationName, "migration.sql"),
          "utf8",
        ),
      );
    }

    database
      .prepare(
        `INSERT INTO "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      )
      .run(
        "budget-migration-user",
        "Budget Migration User",
        "budget-migration-user@internal.masanao",
        0,
      );
    database
      .prepare(
        `INSERT INTO "activity_design" ("id", "activityDesignNo", "fiscalYear", "title", "officeName", "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      )
      .run(
        "budget-migration-design",
        "AD-MIGRATION-001",
        2026,
        "Budget migration design",
        "Municipal Kitchen",
      );
    database
      .prepare(
        `INSERT INTO "activity" ("id", "activityDesignId", "name", "scheduledDate", "plannedBudgetCentavos", "createdAt", "updatedAt")
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      )
      .run(
        "budget-migration-activity",
        "budget-migration-design",
        "Budget migration activity",
        "2026-09-01T00:00:00.000Z",
        2_147_483_648,
      );

    database.exec(
      readFileSync(
        join(migrationDirectory, budgetMigrationName, "migration.sql"),
        "utf8",
      ),
    );

    expect(
      database
        .prepare('SELECT "name" FROM "user" WHERE "id" = ?')
        .get("budget-migration-user"),
    ).toEqual({ name: "Budget Migration User" });
    expect(
      database
        .prepare(
          'SELECT "activityDesignId", "plannedBudgetCentavos" FROM "activity" WHERE "id" = ?',
        )
        .get("budget-migration-activity"),
    ).toEqual({
      activityDesignId: "budget-migration-design",
      plannedBudgetCentavos: 2_147_483_648,
    });

    database.close();
    rmSync(directory, { force: true, recursive: true });
  });
});
