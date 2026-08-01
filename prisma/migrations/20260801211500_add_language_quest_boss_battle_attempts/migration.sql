CREATE TABLE "LanguageQuestBossBattleAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "challengeIds" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LanguageQuestBossBattleAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LanguageQuestBossBattleAttempt_userId_courseId_idx"
ON "LanguageQuestBossBattleAttempt"("userId", "courseId");

CREATE INDEX "LanguageQuestBossBattleAttempt_expiresAt_idx"
ON "LanguageQuestBossBattleAttempt"("expiresAt");

ALTER TABLE "LanguageQuestBossBattleAttempt"
ADD CONSTRAINT "LanguageQuestBossBattleAttempt_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LanguageQuestBossBattleAttempt"
ADD CONSTRAINT "LanguageQuestBossBattleAttempt_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "LanguageQuestCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
