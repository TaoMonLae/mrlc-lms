CREATE TABLE IF NOT EXISTS "HomeworkSubmissionAttachment" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HomeworkSubmissionAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HomeworkSubmissionAttachment_url_key"
  ON "HomeworkSubmissionAttachment"("url");
CREATE INDEX IF NOT EXISTS "HomeworkSubmissionAttachment_submissionId_idx"
  ON "HomeworkSubmissionAttachment"("submissionId");

DO $$ BEGIN
  ALTER TABLE "HomeworkSubmissionAttachment"
    ADD CONSTRAINT "HomeworkSubmissionAttachment_submissionId_fkey"
    FOREIGN KEY ("submissionId") REFERENCES "HomeworkSubmission"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
