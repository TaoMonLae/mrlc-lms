-- Server-authoritative English vocabulary board games for students and teachers.

CREATE TABLE "WordTrailGame" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activeKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "position" INTEGER NOT NULL DEFAULT 0,
    "hearts" INTEGER NOT NULL DEFAULT 4,
    "score" INTEGER NOT NULL DEFAULT 0,
    "turnCount" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "wrongCount" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastRoll" INTEGER,
    "questionDeck" JSONB NOT NULL,
    "pendingTurn" JSONB,
    "answerHistory" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WordTrailGame_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WordTrailGame_activeKey_key" ON "WordTrailGame"("activeKey");
CREATE INDEX "WordTrailGame_userId_status_idx" ON "WordTrailGame"("userId", "status");
CREATE INDEX "WordTrailGame_status_score_idx" ON "WordTrailGame"("status", "score");
CREATE INDEX "WordTrailGame_completedAt_idx" ON "WordTrailGame"("completedAt");

ALTER TABLE "WordTrailGame"
ADD CONSTRAINT "WordTrailGame_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
