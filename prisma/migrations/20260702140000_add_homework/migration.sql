-- Homework assignments + student submissions (optional scoring). Idempotent.
CREATE TABLE IF NOT EXISTS "Homework" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "instructions" TEXT,
  "attachmentUrl" TEXT,
  "classId" TEXT NOT NULL,
  "subjectId" TEXT,
  "teacherId" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "maxMarks" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "gradeItemId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Homework_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Homework_classId_idx" ON "Homework"("classId");
CREATE INDEX IF NOT EXISTS "Homework_teacherId_idx" ON "Homework"("teacherId");
CREATE INDEX IF NOT EXISTS "Homework_dueDate_idx" ON "Homework"("dueDate");

CREATE TABLE IF NOT EXISTS "HomeworkSubmission" (
  "id" TEXT NOT NULL,
  "homeworkId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "text" TEXT,
  "attachmentUrl" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
  "score" DOUBLE PRECISION,
  "feedback" TEXT,
  "markedAt" TIMESTAMP(3),
  "markedById" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HomeworkSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HomeworkSubmission_homeworkId_studentId_key" ON "HomeworkSubmission"("homeworkId", "studentId");
CREATE INDEX IF NOT EXISTS "HomeworkSubmission_studentId_idx" ON "HomeworkSubmission"("studentId");

DO $$ BEGIN
  ALTER TABLE "Homework" ADD CONSTRAINT "Homework_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Homework" ADD CONSTRAINT "Homework_subjectId_fkey"
    FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Homework" ADD CONSTRAINT "Homework_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_homeworkId_fkey"
    FOREIGN KEY ("homeworkId") REFERENCES "Homework"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
