-- CreateTable
CREATE TABLE "activity_design" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityDesignNo" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "officeName" TEXT NOT NULL,
    "aipReferenceCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "activity" (
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

-- CreateTable
CREATE TABLE "meal_schedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "mealTime" TEXT NOT NULL,
    "plannedServings" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "meal_schedule_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
-- Prisma represents ActivityDesign.activityDesignNo as a declared unique field.
CREATE UNIQUE INDEX "activity_design_activityDesignNo_key" ON "activity_design"("activityDesignNo");

-- CreateIndex
-- Keep database uniqueness aligned with the server's trim-and-lower normalization.
CREATE UNIQUE INDEX "activity_design_activityDesignNo_normalized_key" ON "activity_design"(lower(trim("activityDesignNo")));

-- CreateIndex
CREATE INDEX "activity_activityDesignId_idx" ON "activity"("activityDesignId");

-- CreateIndex
CREATE INDEX "meal_schedule_activityId_idx" ON "meal_schedule"("activityId");
