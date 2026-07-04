-- Session-based attendance fields (timetableEntryId, subjectId) were added
-- to the Attendance model in schema.prisma back in commit 25e0f6d ("session-
-- based attendance system"), but no migration file was ever generated for
-- that change — `prisma migrate status` reported "up to date" while the
-- live column never existed, breaking every attendance/class endpoint that
-- reads through the Attendance relation (reports, teacher classes/dashboard,
-- session attendance, analytics). Idempotent so it's safe to re-run.
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "timetableEntryId" TEXT;
ALTER TABLE "Attendance" ADD COLUMN IF NOT EXISTS "subjectId" TEXT;

CREATE INDEX IF NOT EXISTS "Attendance_timetableEntryId_idx" ON "Attendance"("timetableEntryId");
CREATE INDEX IF NOT EXISTS "Attendance_subjectId_idx" ON "Attendance"("subjectId");

-- Optional relation (timetableEntryId is nullable) -> Prisma's default
-- referential action is SET NULL, matching how this schema's other
-- optional-FK columns behave.
DO $$ BEGIN
  ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_timetableEntryId_fkey"
    FOREIGN KEY ("timetableEntryId") REFERENCES "TimetableEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
