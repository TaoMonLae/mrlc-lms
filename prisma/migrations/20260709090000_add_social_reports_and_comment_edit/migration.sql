-- Social Space: reporting (mirrors the existing ChatMessageReport
-- moderation pattern, but with a real FK to User so it cleans up via
-- cascade instead of needing manual deleteMany calls on user deletion),
-- comment editing, and a createdAt index on SocialPost for pagination.

DO $$ BEGIN CREATE TYPE "SocialReportStatus" AS ENUM ('OPEN','REVIEWED','ACTIONED','DISMISSED'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── SocialComment: edit tracking ────────────────────────────────────────────
ALTER TABLE "SocialComment" ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP(3);

-- ── SocialPost: pagination index ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "SocialPost_createdAt_idx" ON "SocialPost"("createdAt");

-- ── SocialReport ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SocialReport" (
  "id"           TEXT NOT NULL,
  "postId"       TEXT,
  "commentId"    TEXT,
  "reportedById" TEXT NOT NULL,
  "reason"       TEXT,
  "status"       "SocialReportStatus" NOT NULL DEFAULT 'OPEN',
  "reviewedById" TEXT,
  "reviewedAt"   TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SocialReport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SocialReport_postId_reportedById_key" ON "SocialReport"("postId", "reportedById");
CREATE UNIQUE INDEX IF NOT EXISTS "SocialReport_commentId_reportedById_key" ON "SocialReport"("commentId", "reportedById");
CREATE INDEX IF NOT EXISTS "SocialReport_status_idx" ON "SocialReport"("status");
CREATE INDEX IF NOT EXISTS "SocialReport_postId_idx" ON "SocialReport"("postId");
CREATE INDEX IF NOT EXISTS "SocialReport_commentId_idx" ON "SocialReport"("commentId");

DO $$ BEGIN
  ALTER TABLE "SocialReport" ADD CONSTRAINT "SocialReport_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SocialReport" ADD CONSTRAINT "SocialReport_commentId_fkey"
    FOREIGN KEY ("commentId") REFERENCES "SocialComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SocialReport" ADD CONSTRAINT "SocialReport_reportedById_fkey"
    FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
