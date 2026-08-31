-- SQLite stores Prisma Int and BigInt values as INTEGER. Rebuild the table so
-- the Prisma schema's exact BigInt contract is recorded without losing rows.
PRAGMA defer_foreign_keys = ON;
PRAGMA foreign_keys = OFF;

CREATE TABLE "new_activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityDesignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "particulars" TEXT,
    "scheduledDate" DATETIME NOT NULL,
    "venue" TEXT,
    "plannedParticipantCount" INTEGER,
    "plannedBudgetCentavos" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "activity_activityDesignId_fkey" FOREIGN KEY ("activityDesignId") REFERENCES "activity_design" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_activity" (
    "id",
    "activityDesignId",
    "name",
    "particulars",
    "scheduledDate",
    "venue",
    "plannedParticipantCount",
    "plannedBudgetCentavos",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "activityDesignId",
    "name",
    "particulars",
    "scheduledDate",
    "venue",
    "plannedParticipantCount",
    "plannedBudgetCentavos",
    "createdAt",
    "updatedAt"
FROM "activity";

DROP TABLE "activity";
ALTER TABLE "new_activity" RENAME TO "activity";

CREATE INDEX "activity_activityDesignId_idx" ON "activity"("activityDesignId");

PRAGMA foreign_keys = ON;
