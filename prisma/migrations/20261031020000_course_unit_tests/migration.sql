CREATE TABLE "CourseQuizAttempt" (
  "id" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3),
  "answers" JSONB,
  "score" INTEGER,
  "total" INTEGER NOT NULL,
  "passed" BOOLEAN,
  CONSTRAINT "CourseQuizAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CourseQuizAttempt_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "CourseEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CourseQuizAttempt_enrollmentId_itemId_attemptNumber_key" ON "CourseQuizAttempt"("enrollmentId", "itemId", "attemptNumber");
CREATE INDEX "CourseQuizAttempt_enrollmentId_itemId_submittedAt_idx" ON "CourseQuizAttempt"("enrollmentId", "itemId", "submittedAt");
