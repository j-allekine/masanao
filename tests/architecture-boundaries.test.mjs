import assert from "node:assert/strict";
import test from "node:test";
import { ESLint } from "eslint";

const eslint = new ESLint({ cwd: process.cwd() });

async function boundaryMessages(filePath, source) {
  const [result] = await eslint.lintText(source, { filePath });

  return result.messages.filter((message) =>
    message.ruleId?.startsWith("boundaries/"),
  );
}

test("allowed architecture dependencies pass", async () => {
  const cases = [
    {
      name: "app to a feature public gateway",
      filePath: "src/app/architecture-fixture.ts",
      source:
        'import { listActivityDesigns } from "@/features/activity-planning/server";',
    },
    {
      name: "same-feature import",
      filePath:
        "src/features/activity-planning/server/commands/architecture-fixture.ts",
      source:
        'import { activityDesignSchema } from "../../schemas/activity-design";',
    },
    {
      name: "feature to shared import",
      filePath:
        "src/features/activity-planning/components/architecture-fixture.tsx",
      source: 'import { Button } from "@/components/ui/button";',
    },
    {
      name: "shared to shared import",
      filePath: "src/components/ui/architecture-fixture.tsx",
      source: 'import { cn } from "@/lib/utils";',
    },
    {
      name: "Prisma infrastructure to shared import",
      filePath: "src/prisma/architecture-fixture.ts",
      source: 'import { cn } from "@/lib/utils";',
    },
    {
      name: "approved shared server Prisma access",
      filePath: "src/server/architecture-fixture.ts",
      source: 'import { prisma } from "@/prisma/client";',
    },
    {
      name: "feature database Prisma access",
      filePath:
        "src/features/activity-planning/server/db/architecture-fixture.ts",
      source: 'import { prisma } from "@/prisma/client";',
    },
  ];

  for (const testCase of cases) {
    assert.deepEqual(
      await boundaryMessages(testCase.filePath, testCase.source),
      [],
      testCase.name,
    );
  }
});

test("forbidden architecture dependencies are rejected", async () => {
  const cases = [
    {
      name: "shared code importing a feature",
      filePath: "src/lib/architecture-fixture.ts",
      source: 'import { listActivityDesigns } from "@/features/activity-planning/server";',
      ruleId: "boundaries/dependencies",
    },
    {
      name: "cross-feature import",
      filePath: "src/features/access-management/architecture-fixture.ts",
      source: 'import { listActivityDesigns } from "@/features/activity-planning/server";',
      ruleId: "boundaries/dependencies",
    },
    {
      name: "app deep import into a feature",
      filePath: "src/app/architecture-fixture.ts",
      source:
        'import { listActivityDesignRecords } from "@/features/activity-planning/server/db/activity-designs";',
      ruleId: "boundaries/dependencies",
    },
    {
      name: "feature command importing Prisma",
      filePath:
        "src/features/activity-planning/server/commands/architecture-fixture.ts",
      source: 'import { prisma } from "@/prisma/client";',
      ruleId: "boundaries/dependencies",
    },
    {
      name: "unknown source placement",
      filePath: "src/unknown/architecture-fixture.ts",
      source: "export const architectureFixture = true;",
      ruleId: "boundaries/no-unknown-files",
    },
    {
      name: "reverse-layer import",
      filePath: "src/server/architecture-fixture.ts",
      source: 'import HomePage from "@/app/page";',
      ruleId: "boundaries/dependencies",
    },
  ];

  for (const testCase of cases) {
    const messages = await boundaryMessages(testCase.filePath, testCase.source);

    assert.ok(
      messages.some((message) => message.ruleId === testCase.ruleId),
      `${testCase.name}: ${JSON.stringify(messages)}`,
    );
  }
});
