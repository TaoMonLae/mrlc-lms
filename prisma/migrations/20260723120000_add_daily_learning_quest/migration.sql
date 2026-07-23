-- One mixed language/GED retrieval session per user and Kuala Lumpur day.

CREATE TABLE "DailyQuestSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'STANDARD',
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "items" JSONB NOT NULL,
    "answers" JSONB,
    "currentIndex" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyQuestSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyQuestSession_userId_dayKey_key" ON "DailyQuestSession"("userId", "dayKey");
CREATE INDEX "DailyQuestSession_userId_status_idx" ON "DailyQuestSession"("userId", "status");
CREATE INDEX "DailyQuestSession_dayKey_status_idx" ON "DailyQuestSession"("dayKey", "status");
CREATE INDEX "DailyQuestSession_pointsEarned_idx" ON "DailyQuestSession"("pointsEarned");

ALTER TABLE "DailyQuestSession"
ADD CONSTRAINT "DailyQuestSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
