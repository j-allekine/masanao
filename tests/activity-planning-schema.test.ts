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
import { prisma } from "@/lib/prisma";

const planningMigrationName = "20260829090000_add_activity_planning";

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
        officeName: "Municipal Kitchen",
      },
    });

    await expect(
      prisma.activityDesign.create({
        data: {
          id: "normalized-design-two",
          activityDesignNo: "ad-raw-001",
          fiscalYear: 2026,
          title: "Second design",
          officeName: "Municipal Kitchen",
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
        officeName: "Municipal Kitchen",
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

  it("applies the planning migration without removing existing authentication data", () => {
    const directory = mkdtempSync(join(tmpdir(), "masanao-planning-migration-"));
    const databasePath = join(directory, "migration.db");
    const database = new Database(databasePath);
    const migrationDirectory = join(process.cwd(), "prisma", "migrations");

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
});
