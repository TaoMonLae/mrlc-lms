CREATE TABLE "LanguageQuestHeartRefillAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "challengeIds" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LanguageQuestHeartRefillAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LanguageQuestSurpriseCardUnlock" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "cardId" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'HEART_REFILL',
  "dayKey" TEXT NOT NULL,
  "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LanguageQuestSurpriseCardUnlock_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LanguageQuestHeartRefillAttempt_userId_createdAt_idx" ON "LanguageQuestHeartRefillAttempt"("userId", "createdAt");
CREATE INDEX "LanguageQuestHeartRefillAttempt_expiresAt_idx" ON "LanguageQuestHeartRefillAttempt"("expiresAt");
CREATE UNIQUE INDEX "LanguageQuestSurpriseCardUnlock_userId_cardId_key" ON "LanguageQuestSurpriseCardUnlock"("userId", "cardId");
CREATE UNIQUE INDEX "LanguageQuestSurpriseCardUnlock_userId_source_dayKey_key" ON "LanguageQuestSurpriseCardUnlock"("userId", "source", "dayKey");
CREATE INDEX "LanguageQuestSurpriseCardUnlock_userId_unlockedAt_idx" ON "LanguageQuestSurpriseCardUnlock"("userId", "unlockedAt");

ALTER TABLE "LanguageQuestHeartRefillAttempt"
  ADD CONSTRAINT "LanguageQuestHeartRefillAttempt_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LanguageQuestSurpriseCardUnlock"
  ADD CONSTRAINT "LanguageQuestSurpriseCardUnlock_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
