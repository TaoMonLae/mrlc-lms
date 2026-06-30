-- Add persisted profile photo URLs for users and linked student/teacher records.
-- Idempotent (IF NOT EXISTS) so it can be safely re-run after a partial/failed apply.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profilePhotoUrl" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "profilePhotoUrl" TEXT,
ADD COLUMN IF NOT EXISTS "contactNumber" TEXT,
ADD COLUMN IF NOT EXISTS "country" TEXT,
ADD COLUMN IF NOT EXISTS "identityType" TEXT,
ADD COLUMN IF NOT EXISTS "identityNumber" TEXT,
ADD COLUMN IF NOT EXISTS "address" TEXT,
ADD COLUMN IF NOT EXISTS "emergencyContact" TEXT,
ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "profilePhotoUrl" TEXT;
