-- Class description + status, used by the class forms and list UI. Idempotent.
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Class" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';
