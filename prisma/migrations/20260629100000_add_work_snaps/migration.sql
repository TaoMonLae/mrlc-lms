-- Ephemeral 24h "work snaps" posted by students, visible to staff. Idempotent.
CREATE TABLE IF NOT EXISTS "WorkSnap" (
  "id"        TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "imageUrl"  TEXT NOT NULL,
  "caption"   TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkSnap_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "WorkSnap_studentId_idx" ON "WorkSnap"("studentId");
CREATE INDEX IF NOT EXISTS "WorkSnap_expiresAt_idx" ON "WorkSnap"("expiresAt");

DO $$ BEGIN
  ALTER TABLE "WorkSnap" ADD CONSTRAINT "WorkSnap_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
