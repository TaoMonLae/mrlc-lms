CREATE TABLE "PlacementTestSubmission" (
    "id" TEXT NOT NULL,
    "referenceNo" TEXT NOT NULL,
    "attemptNonce" TEXT,
    "formId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "contactKey" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "age" INTEGER,
    "highestGrade" TEXT,
    "answers" JSONB NOT NULL,
    "writingSample" TEXT,
    "sectionScores" JSONB NOT NULL,
    "totalCorrect" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "recommendedLevel" TEXT NOT NULL,
    "flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "testVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "finalLevel" TEXT,
    "writingRating" TEXT NOT NULL DEFAULT 'NOT_RATED',
    "reviewNotes" TEXT,
    "reviewedById" TEXT,
    "reviewedByName" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "receiptEmailOutboxId" TEXT,
    "decisionEmailOutboxId" TEXT,
    "decisionEmailedAt" TIMESTAMP(3),
    "decisionEmailedByName" TEXT,
    "decisionEmailedLevel" TEXT,
    "admissionApplicationId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacementTestSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlacementTestSubmission_referenceNo_key" ON "PlacementTestSubmission"("referenceNo");
CREATE UNIQUE INDEX "PlacementTestSubmission_attemptNonce_key" ON "PlacementTestSubmission"("attemptNonce");
CREATE INDEX "PlacementTestSubmission_status_idx" ON "PlacementTestSubmission"("status");
CREATE INDEX "PlacementTestSubmission_recommendedLevel_idx" ON "PlacementTestSubmission"("recommendedLevel");
CREATE INDEX "PlacementTestSubmission_submittedAt_idx" ON "PlacementTestSubmission"("submittedAt");
CREATE INDEX "PlacementTestSubmission_contactKey_idx" ON "PlacementTestSubmission"("contactKey");
CREATE INDEX "PlacementTestSubmission_email_idx" ON "PlacementTestSubmission"("email");
