-- Phase 3 — Reusable Question Bank
-- NON-DESTRUCTIVE: existing Question/Exam/ExamAttempt rows are preserved.
-- Question.examId is relaxed to nullable; legacy rows keep their examId and are
-- backfilled to status = APPROVED so historic exams keep working.

-- ── Enums ────────────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE "QuestionDifficulty" AS ENUM ('EASY','MEDIUM','HARD'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "QuestionStatus" AS ENUM ('DRAFT','UNDER_REVIEW','APPROVED','RETIRED','ARCHIVED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "ExamQuestionSource" AS ENUM ('FIXED','RANDOM'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Question: relax ownership + add bank fields ──────────────────────────────
ALTER TABLE "Question" ALTER COLUMN "examId" DROP NOT NULL;
ALTER TABLE "Question"
  ADD COLUMN IF NOT EXISTS "bankId" TEXT,
  ADD COLUMN IF NOT EXISTS "subjectId" TEXT,
  ADD COLUMN IF NOT EXISTS "topicId" TEXT,
  ADD COLUMN IF NOT EXISTS "subtopic" TEXT,
  ADD COLUMN IF NOT EXISTS "difficulty" "QuestionDifficulty",
  ADD COLUMN IF NOT EXISTS "defaultPoints" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "estimatedTimeSeconds" INTEGER,
  ADD COLUMN IF NOT EXISTS "status" "QuestionStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "language" TEXT,
  ADD COLUMN IF NOT EXISTS "createdById" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewedById" TEXT,
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

-- Existing questions are already in active exams → treat them as APPROVED so they
-- remain usable, without altering the text/options shown in historic attempts.
UPDATE "Question" SET "status" = 'APPROVED', "approvedAt" = COALESCE("approvedAt", "createdAt")
  WHERE "examId" IS NOT NULL AND "status" = 'DRAFT';

CREATE INDEX IF NOT EXISTS "Question_bankId_idx" ON "Question"("bankId");
CREATE INDEX IF NOT EXISTS "Question_subjectId_idx" ON "Question"("subjectId");
CREATE INDEX IF NOT EXISTS "Question_topicId_idx" ON "Question"("topicId");
CREATE INDEX IF NOT EXISTS "Question_status_idx" ON "Question"("status");
CREATE INDEX IF NOT EXISTS "Question_difficulty_idx" ON "Question"("difficulty");

-- ── Exam: clone provenance ───────────────────────────────────────────────────
ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "clonedFromId" TEXT;

-- ── ExamAttempt: frozen randomized-selection fields ──────────────────────────
ALTER TABLE "ExamAttempt"
  ADD COLUMN IF NOT EXISTS "selectedQuestionIds" JSONB,
  ADD COLUMN IF NOT EXISTS "optionOrder" JSONB,
  ADD COLUMN IF NOT EXISTS "randomSeed" TEXT,
  ADD COLUMN IF NOT EXISTS "frozenContent" JSONB;

-- ── QuestionBank ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "QuestionBank" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subjectId" TEXT,
  "description" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuestionBank_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "QuestionBank_subjectId_idx" ON "QuestionBank"("subjectId");

-- ── QuestionTopic ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "QuestionTopic" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "subjectId" TEXT,
  "parentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuestionTopic_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "QuestionTopic_parentId_idx" ON "QuestionTopic"("parentId");
CREATE INDEX IF NOT EXISTS "QuestionTopic_subjectId_idx" ON "QuestionTopic"("subjectId");

-- ── QuestionOption ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "QuestionOption" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "isCorrect" BOOLEAN NOT NULL DEFAULT false,
  "weight" DOUBLE PRECISION,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "QuestionOption_questionId_idx" ON "QuestionOption"("questionId");

-- ── ExamQuestion ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ExamQuestion" (
  "id" TEXT NOT NULL,
  "examId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "sectionId" TEXT,
  "pointsOverride" DOUBLE PRECISION,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "sourceType" "ExamQuestionSource" NOT NULL DEFAULT 'FIXED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExamQuestion_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN CREATE UNIQUE INDEX "ExamQuestion_examId_questionId_key" ON "ExamQuestion"("examId","questionId"); EXCEPTION WHEN duplicate_table THEN null; END $$;
CREATE INDEX IF NOT EXISTS "ExamQuestion_examId_idx" ON "ExamQuestion"("examId");
CREATE INDEX IF NOT EXISTS "ExamQuestion_questionId_idx" ON "ExamQuestion"("questionId");
CREATE INDEX IF NOT EXISTS "ExamQuestion_sectionId_idx" ON "ExamQuestion"("sectionId");

-- ── ExamBlueprintRule ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ExamBlueprintRule" (
  "id" TEXT NOT NULL,
  "examId" TEXT NOT NULL,
  "sectionId" TEXT,
  "subjectId" TEXT,
  "topicId" TEXT,
  "difficulty" "QuestionDifficulty",
  "type" "QuestionType",
  "count" INTEGER NOT NULL DEFAULT 1,
  "pointsEach" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExamBlueprintRule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ExamBlueprintRule_examId_idx" ON "ExamBlueprintRule"("examId");
CREATE INDEX IF NOT EXISTS "ExamBlueprintRule_sectionId_idx" ON "ExamBlueprintRule"("sectionId");

-- ── Foreign keys ─────────────────────────────────────────────────────────────
DO $$ BEGIN ALTER TABLE "Question" ADD CONSTRAINT "Question_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "QuestionBank"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "Question" ADD CONSTRAINT "Question_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "QuestionTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "QuestionTopic" ADD CONSTRAINT "QuestionTopic_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "QuestionTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ExamSection"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "ExamBlueprintRule" ADD CONSTRAINT "ExamBlueprintRule_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TABLE "ExamBlueprintRule" ADD CONSTRAINT "ExamBlueprintRule_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ExamSection"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;
