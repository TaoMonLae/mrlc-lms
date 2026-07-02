-- Contact/HR fields the teacher edit form always had but never persisted. Idempotent.
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "employmentType" TEXT NOT NULL DEFAULT 'FULL_TIME';
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "notes" TEXT;
