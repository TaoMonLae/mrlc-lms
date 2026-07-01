-- Captions + required-viewing / due-date for video lessons. Idempotent.
ALTER TABLE "VideoLesson" ADD COLUMN IF NOT EXISTS "captionsUrl" TEXT;
ALTER TABLE "VideoLesson" ADD COLUMN IF NOT EXISTS "isRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "VideoLesson" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);
