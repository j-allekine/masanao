PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- Office belongs to an Activity. Existing Activities inherit the Office from
-- their containing Activity Design so the migration preserves current data.
CREATE TABLE "new_activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityDesignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "officeName" TEXT NOT NULL,
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
    "id", "activityDesignId", "name", "officeName", "particulars",
    "scheduledDate", "venue", "plannedParticipantCount",
    "plannedBudgetCentavos", "createdAt", "updatedAt"
)
SELECT
    activity."id", activity."activityDesignId", activity."name",
    activity_design."officeName", activity."particulars",
    activity."scheduledDate", activity."venue",
    activity."plannedParticipantCount", activity."plannedBudgetCentavos",
    activity."createdAt", activity."updatedAt"
FROM "activity"
INNER JOIN "activity_design"
    ON activity_design."id" = activity."activityDesignId";

DROP TABLE "activity";
ALTER TABLE "new_activity" RENAME TO "activity";
CREATE INDEX "activity_activityDesignId_idx" ON "activity"("activityDesignId");

CREATE TABLE "new_activity_design" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityDesignNo" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "aipReferenceCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_activity_design" (
    "id", "activityDesignNo", "fiscalYear", "title",
    "aipReferenceCode", "createdAt", "updatedAt"
)
SELECT
    "id", "activityDesignNo", "fiscalYear", "title",
    "aipReferenceCode", "createdAt", "updatedAt"
FROM "activity_design";

DROP TABLE "activity_design";
ALTER TABLE "new_activity_design" RENAME TO "activity_design";
CREATE UNIQUE INDEX "activity_design_activityDesignNo_key" ON "activity_design"("activityDesignNo");
CREATE UNIQUE INDEX "activity_design_activityDesignNo_normalized_key" ON "activity_design"(lower(trim("activityDesignNo")));

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
