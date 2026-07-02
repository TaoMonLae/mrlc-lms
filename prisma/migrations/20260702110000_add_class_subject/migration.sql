-- Class <-> Subject join table so subjects can be assigned to a class
-- directly (previously they were only inferred from exams). Idempotent.
CREATE TABLE IF NOT EXISTS "ClassSubject" (
  "classId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClassSubject_pkey" PRIMARY KEY ("classId", "subjectId")
);

CREATE INDEX IF NOT EXISTS "ClassSubject_subjectId_idx" ON "ClassSubject"("subjectId");
CREATE INDEX IF NOT EXISTS "ClassSubject_classId_idx" ON "ClassSubject"("classId");

DO $$ BEGIN
  ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_subjectId_fkey"
    FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
