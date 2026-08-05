CREATE TABLE "LanguageQuestFinalExamAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "challengeIds" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "submittedAt" TIMESTAMP(3),
  "correctCount" INTEGER,
  "totalQuestions" INTEGER NOT NULL,
  "scorePercent" INTEGER,
  "passPercent" INTEGER NOT NULL DEFAULT 80,
  "violationCount" INTEGER NOT NULL DEFAULT 0,
  "violationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LanguageQuestFinalExamAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LanguageQuestFinalExamAttempt_userId_courseId_status_idx"
  ON "LanguageQuestFinalExamAttempt"("userId", "courseId", "status");
CREATE INDEX "LanguageQuestFinalExamAttempt_userId_createdAt_idx"
  ON "LanguageQuestFinalExamAttempt"("userId", "createdAt");
CREATE INDEX "LanguageQuestFinalExamAttempt_expiresAt_status_idx"
  ON "LanguageQuestFinalExamAttempt"("expiresAt", "status");

ALTER TABLE "LanguageQuestFinalExamAttempt"
  ADD CONSTRAINT "LanguageQuestFinalExamAttempt_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LanguageQuestFinalExamAttempt"
  ADD CONSTRAINT "LanguageQuestFinalExamAttempt_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "LanguageQuestCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
