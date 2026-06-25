-- Phase 2 — Advanced Exam System
-- Hand-authored migration. Safe/idempotent-ish: uses IF NOT EXISTS where possible.

-- ── Enums ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "StimulusType" AS ENUM ('TEXT','IMAGE','AUDIO','VIDEO','TABLE','CHART','DOCUMENT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "AttemptState" AS ENUM ('NOT_STARTED','IN_PROGRESS','PAUSED','SUBMITTED','AUTO_SUBMITTED','PENDING_GRADING','FINALIZED','RELEASED','INVALIDATED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Exam: scheduling + delivery/scoring options ──────────────────────────────
ALTER TABLE "Exam"
  ADD COLUMN IF NOT EXISTS "availableFrom" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "availableUntil" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "resultReleaseAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "attemptLimit" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "gracePeriodMinutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "allowLateStart" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "requiresAccessCode" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "accessCodeHash" TEXT,
  ADD COLUMN IF NOT EXISTS "requiresInvigilator" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "shuffleOptions" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "negativeMarking" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "passMark" DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS "Exam_status_idx" ON "Exam"("status");
CREATE INDEX IF NOT EXISTS "Exam_availableFrom_idx" ON "Exam"("availableFrom");
CREATE INDEX IF NOT EXISTS "Exam_availableUntil_idx" ON "Exam"("availableUntil");

-- ── Question: structure + partial-credit config ──────────────────────────────
ALTER TABLE "Question"
  ADD COLUMN IF NOT EXISTS "explanation" TEXT,
  ADD COLUMN IF NOT EXISTS "orderIndex" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "sectionId" TEXT,
  ADD COLUMN IF NOT EXISTS "groupId" TEXT,
  ADD COLUMN IF NOT EXISTS "stimulusId" TEXT,
  ADD COLUMN IF NOT EXISTS "correctAnswers" JSONB,
  ADD COLUMN IF NOT EXISTS "optionWeights" JSONB,
  ADD COLUMN IF NOT EXISTS "negativePoints" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "minScore" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "numericTolerance" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "caseSensitive" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "partialCredit" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "requiresManualGrading" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Question_sectionId_idx" ON "Question"("sectionId");
CREATE INDEX IF NOT EXISTS "Question_groupId_idx" ON "Question"("groupId");
CREATE INDEX IF NOT EXISTS "Question_stimulusId_idx" ON "Question"("stimulusId");

-- ── ExamAttempt: lifecycle state machine + server timing + session guard ─────
ALTER TABLE "ExamAttempt"
  ADD COLUMN IF NOT EXISTS "state" "AttemptState" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN IF NOT EXISTS "attemptNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "serverDeadline" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "effectiveDurationMinutes" INTEGER,
  ADD COLUMN IF NOT EXISTS "pausedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "accumulatedPauseSeconds" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastSavedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "gradedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "releasedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "invalidatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "gradingStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "sessionToken" TEXT,
  ADD COLUMN IF NOT EXISTS "questionOrder" JSONB,
  ADD COLUMN IF NOT EXISTS "ipAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "userAgent" TEXT,
  ADD COLUMN IF NOT EXISTS "deviceInfo" JSONB,
  ADD COLUMN IF NOT EXISTS "assignmentId" TEXT,
  ADD COLUMN IF NOT EXISTS "accommodationId" TEXT;

-- Existing rows backfilled to a sensible state.
UPDATE "ExamAttempt" SET "state" = 'FINALIZED' WHERE "isCompleted" = true AND "state" = 'NOT_STARTED';
UPDATE "ExamAttempt" SET "state" = 'IN_PROGRESS' WHERE "isCompleted" = false AND "completedAt" IS NULL AND "state" = 'NOT_STARTED';

-- Replace single-attempt unique with per-attempt-number unique.
ALTER TABLE "ExamAttempt" DROP CONSTRAINT IF EXISTS "ExamAttempt_studentId_examId_key";
DO $$ BEGIN
  CREATE UNIQUE INDEX "ExamAttempt_studentId_examId_attemptNumber_key" ON "ExamAttempt"("studentId","examId","attemptNumber");
EXCEPTION WHEN duplicate_table THEN null; END $$;

CREATE INDEX IF NOT EXISTS "ExamAttempt_state_idx" ON "ExamAttempt"("state");
CREATE INDEX IF NOT EXISTS "ExamAttempt_assignmentId_idx" ON "ExamAttempt"("assignmentId");

-- ── ExamAnswer: partial-credit detail + timing ───────────────────────────────
ALTER TABLE "ExamAnswer"
  ADD COLUMN IF NOT EXISTS "selectedOptions" JSONB,
  ADD COLUMN IF NOT EXISTS "autoScore" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "manualScore" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "maxPoints" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "flaggedForReview" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "timeSpentSeconds" INTEGER,
  ADD COLUMN IF NOT EXISTS "gradingState" TEXT;

-- ── ExamSection ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ExamSection" (
  "id" TEXT NOT NULL,
  "examId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "instructions" TEXT,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "timeLimitMinutes" INTEGER,
  "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
  "questionsToPick" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExamSection_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ExamSection_examId_idx" ON "ExamSection"("examId");
CREATE INDEX IF NOT EXISTS "ExamSection_orderIndex_idx" ON "ExamSection"("orderIndex");

-- ── Stimulus ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Stimulus" (
  "id" TEXT NOT NULL,
  "examId" TEXT NOT NULL,
  "type" "StimulusType" NOT NULL DEFAULT 'TEXT',
  "title" TEXT,
  "content" TEXT,
  "mediaUrl" TEXT,
  "caption" TEXT,
  "data" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Stimulus_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Stimulus_examId_idx" ON "Stimulus"("examId");
CREATE INDEX IF NOT EXISTS "Stimulus_type_idx" ON "Stimulus"("type");

-- ── QuestionGroup ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "QuestionGroup" (
  "id" TEXT NOT NULL,
  "examId" TEXT NOT NULL,
  "sectionId" TEXT,
  "stimulusId" TEXT,
  "title" TEXT,
  "instructions" TEXT,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuestionGroup_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "QuestionGroup_examId_idx" ON "QuestionGroup"("examId");
CREATE INDEX IF NOT EXISTS "QuestionGroup_sectionId_idx" ON "QuestionGroup"("sectionId");
CREATE INDEX IF NOT EXISTS "QuestionGroup_stimulusId_idx" ON "QuestionGroup"("stimulusId");

-- ── ExamAccommodation ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ExamAccommodation" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "examId" TEXT,
  "extraTimePercent" DOUBLE PRECISION,
  "extraTimeMinutes" INTEGER,
  "largerText" BOOLEAN NOT NULL DEFAULT false,
  "highContrast" BOOLEAN NOT NULL DEFAULT false,
  "screenReader" BOOLEAN NOT NULL DEFAULT false,
  "reducedDistraction" BOOLEAN NOT NULL DEFAULT false,
  "calculatorAllowed" BOOLEAN NOT NULL DEFAULT false,
  "additionalBreaks" BOOLEAN NOT NULL DEFAULT false,
  "separateRoom" BOOLEAN NOT NULL DEFAULT false,
  "readerSupport" BOOLEAN NOT NULL DEFAULT false,
  "scribeSupport" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExamAccommodation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ExamAccommodation_studentId_idx" ON "ExamAccommodation"("studentId");
CREATE INDEX IF NOT EXISTS "ExamAccommodation_examId_idx" ON "ExamAccommodation"("examId");

-- ── ExamAssignment ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ExamAssignment" (
  "id" TEXT NOT NULL,
  "examId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "accommodationId" TEXT,
  "availableFromOverride" TIMESTAMP(3),
  "availableUntilOverride" TIMESTAMP(3),
  "attemptLimitOverride" INTEGER,
  "accessCodeOverride" TEXT,
  "invigilatorId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExamAssignment_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  CREATE UNIQUE INDEX "ExamAssignment_examId_studentId_key" ON "ExamAssignment"("examId","studentId");
EXCEPTION WHEN duplicate_table THEN null; END $$;
CREATE INDEX IF NOT EXISTS "ExamAssignment_examId_idx" ON "ExamAssignment"("examId");
CREATE INDEX IF NOT EXISTS "ExamAssignment_studentId_idx" ON "ExamAssignment"("studentId");
CREATE INDEX IF NOT EXISTS "ExamAssignment_invigilatorId_idx" ON "ExamAssignment"("invigilatorId");

-- ── GradingRubric ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "GradingRubric" (
  "id" TEXT NOT NULL,
  "examId" TEXT,
  "questionId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GradingRubric_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "GradingRubric_examId_idx" ON "GradingRubric"("examId");
CREATE INDEX IF NOT EXISTS "GradingRubric_questionId_idx" ON "GradingRubric"("questionId");

-- ── RubricCriterion ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "RubricCriterion" (
  "id" TEXT NOT NULL,
  "rubricId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "levels" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RubricCriterion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "RubricCriterion_rubricId_idx" ON "RubricCriterion"("rubricId");

-- ── ManualGrade ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ManualGrade" (
  "id" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "answerId" TEXT,
  "rubricId" TEXT,
  "assignedGraderId" TEXT,
  "graderId" TEXT,
  "criterionScores" JSONB,
  "score" DOUBLE PRECISION,
  "inlineFeedback" JSONB,
  "overallComment" TEXT,
  "scoreOverride" DOUBLE PRECISION,
  "overrideReason" TEXT,
  "secondMarkerId" TEXT,
  "secondMarkerScore" DOUBLE PRECISION,
  "moderationComment" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "isFinalized" BOOLEAN NOT NULL DEFAULT false,
  "finalizedAt" TIMESTAMP(3),
  "finalizedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManualGrade_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ManualGrade_attemptId_idx" ON "ManualGrade"("attemptId");
CREATE INDEX IF NOT EXISTS "ManualGrade_questionId_idx" ON "ManualGrade"("questionId");
CREATE INDEX IF NOT EXISTS "ManualGrade_answerId_idx" ON "ManualGrade"("answerId");
CREATE INDEX IF NOT EXISTS "ManualGrade_assignedGraderId_idx" ON "ManualGrade"("assignedGraderId");
CREATE INDEX IF NOT EXISTS "ManualGrade_status_idx" ON "ManualGrade"("status");

-- ── AttemptEvent (append-only) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AttemptEvent" (
  "id" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "actorId" TEXT,
  "actorRole" TEXT,
  "payload" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AttemptEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AttemptEvent_attemptId_idx" ON "AttemptEvent"("attemptId");
CREATE INDEX IF NOT EXISTS "AttemptEvent_type_idx" ON "AttemptEvent"("type");
CREATE INDEX IF NOT EXISTS "AttemptEvent_createdAt_idx" ON "AttemptEvent"("createdAt");

-- ── AttemptSnapshot (immutable) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AttemptSnapshot" (
  "id" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "answers" JSONB NOT NULL,
  "questionOrder" JSONB,
  "remainingSeconds" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AttemptSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AttemptSnapshot_attemptId_idx" ON "AttemptSnapshot"("attemptId");
CREATE INDEX IF NOT EXISTS "AttemptSnapshot_createdAt_idx" ON "AttemptSnapshot"("createdAt");

-- ── ExamResultPolicy ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ExamResultPolicy" (
  "id" TEXT NOT NULL,
  "examId" TEXT NOT NULL,
  "showScore" BOOLEAN NOT NULL DEFAULT true,
  "showPassFail" BOOLEAN NOT NULL DEFAULT true,
  "showCorrectAnswers" BOOLEAN NOT NULL DEFAULT false,
  "showExplanations" BOOLEAN NOT NULL DEFAULT false,
  "showTeacherFeedback" BOOLEAN NOT NULL DEFAULT true,
  "releaseMode" TEXT NOT NULL DEFAULT 'IMMEDIATE',
  "releaseAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExamResultPolicy_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  CREATE UNIQUE INDEX "ExamResultPolicy_examId_key" ON "ExamResultPolicy"("examId");
EXCEPTION WHEN duplicate_table THEN null; END $$;

-- ── QuestionStatistic ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "QuestionStatistic" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "examId" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "correctCount" INTEGER NOT NULL DEFAULT 0,
  "incorrectCount" INTEGER NOT NULL DEFAULT 0,
  "blankCount" INTEGER NOT NULL DEFAULT 0,
  "avgResponseSeconds" DOUBLE PRECISION,
  "difficultyIndex" DOUBLE PRECISION,
  "discriminationIndex" DOUBLE PRECISION,
  "distractorRates" JSONB,
  "avgScore" DOUBLE PRECISION,
  "medianScore" DOUBLE PRECISION,
  "stdDev" DOUBLE PRECISION,
  "passRate" DOUBLE PRECISION,
  "scoreDistribution" JSONB,
  "flags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionStatistic_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  CREATE UNIQUE INDEX "QuestionStatistic_questionId_key" ON "QuestionStatistic"("questionId");
EXCEPTION WHEN duplicate_table THEN null; END $$;
CREATE INDEX IF NOT EXISTS "QuestionStatistic_examId_idx" ON "QuestionStatistic"("examId");

-- ── Foreign keys ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE "Question" ADD CONSTRAINT "Question_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ExamSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "Question" ADD CONSTRAINT "Question_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "QuestionGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "Question" ADD CONSTRAINT "Question_stimulusId_fkey" FOREIGN KEY ("stimulusId") REFERENCES "Stimulus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ExamAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_accommodationId_fkey" FOREIGN KEY ("accommodationId") REFERENCES "ExamAccommodation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ExamSection" ADD CONSTRAINT "ExamSection_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "Stimulus" ADD CONSTRAINT "Stimulus_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "QuestionGroup" ADD CONSTRAINT "QuestionGroup_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "QuestionGroup" ADD CONSTRAINT "QuestionGroup_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ExamSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "QuestionGroup" ADD CONSTRAINT "QuestionGroup_stimulusId_fkey" FOREIGN KEY ("stimulusId") REFERENCES "Stimulus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ExamAccommodation" ADD CONSTRAINT "ExamAccommodation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ExamAccommodation" ADD CONSTRAINT "ExamAccommodation_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ExamAssignment" ADD CONSTRAINT "ExamAssignment_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ExamAssignment" ADD CONSTRAINT "ExamAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ExamAssignment" ADD CONSTRAINT "ExamAssignment_accommodationId_fkey" FOREIGN KEY ("accommodationId") REFERENCES "ExamAccommodation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "GradingRubric" ADD CONSTRAINT "GradingRubric_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "GradingRubric" ADD CONSTRAINT "GradingRubric_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "RubricCriterion" ADD CONSTRAINT "RubricCriterion_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "GradingRubric"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ManualGrade" ADD CONSTRAINT "ManualGrade_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ManualGrade" ADD CONSTRAINT "ManualGrade_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ManualGrade" ADD CONSTRAINT "ManualGrade_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "ExamAnswer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "ManualGrade" ADD CONSTRAINT "ManualGrade_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "GradingRubric"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "AttemptEvent" ADD CONSTRAINT "AttemptEvent_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "AttemptSnapshot" ADD CONSTRAINT "AttemptSnapshot_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "ExamResultPolicy" ADD CONSTRAINT "ExamResultPolicy_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "QuestionStatistic" ADD CONSTRAINT "QuestionStatistic_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "QuestionStatistic" ADD CONSTRAINT "QuestionStatistic_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
