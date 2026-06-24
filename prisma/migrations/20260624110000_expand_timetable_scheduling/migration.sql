ALTER TABLE "TimetableEntry"
  ALTER COLUMN "classId" DROP NOT NULL,
  ALTER COLUMN "subjectId" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "substituteTeacherId" TEXT,
  ADD COLUMN IF NOT EXISTS "substituteTeacherName" TEXT,
  ADD COLUMN IF NOT EXISTS "academicYear" TEXT,
  ADD COLUMN IF NOT EXISTS "term" TEXT,
  ADD COLUMN IF NOT EXISTS "scheduleType" TEXT NOT NULL DEFAULT 'CLASS',
  ADD COLUMN IF NOT EXISTS "recurrence" TEXT NOT NULL DEFAULT 'WEEKLY',
  ADD COLUMN IF NOT EXISTS "effectiveFrom" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "effectiveUntil" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT,
  ADD COLUMN IF NOT EXISTS "eventDate" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "TimetableEntry_substituteTeacherId_idx" ON "TimetableEntry"("substituteTeacherId");
CREATE INDEX IF NOT EXISTS "TimetableEntry_academicYear_idx" ON "TimetableEntry"("academicYear");
CREATE INDEX IF NOT EXISTS "TimetableEntry_term_idx" ON "TimetableEntry"("term");
CREATE INDEX IF NOT EXISTS "TimetableEntry_room_idx" ON "TimetableEntry"("room");
CREATE INDEX IF NOT EXISTS "TimetableEntry_status_idx" ON "TimetableEntry"("status");
CREATE INDEX IF NOT EXISTS "TimetableEntry_scheduleType_idx" ON "TimetableEntry"("scheduleType");
