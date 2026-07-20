-- Social Space product design: curated class snapshots, video highlights,
-- audience scoping, publish state, and durable moderation history.

DO $$ BEGIN
  CREATE TYPE "SocialPostType" AS ENUM ('POST', 'CLASS_SNAPSHOT', 'VIDEO_HIGHLIGHT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SocialAudience" AS ENUM ('SCHOOL', 'CLASS', 'STAFF');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SocialPublishStatus" AS ENUM ('DRAFT', 'PUBLISHED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "SocialPost"
  ADD COLUMN IF NOT EXISTS "type" "SocialPostType" NOT NULL DEFAULT 'POST',
  ADD COLUMN IF NOT EXISTS "audience" "SocialAudience" NOT NULL DEFAULT 'SCHOOL',
  ADD COLUMN IF NOT EXISTS "publishStatus" "SocialPublishStatus" NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN IF NOT EXISTS "classId" TEXT,
  ADD COLUMN IF NOT EXISTS "videoLessonId" TEXT,
  ADD COLUMN IF NOT EXISTS "featuredUntil" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Curated content can use a longer retention window or remain until explicitly
-- archived. Existing posts keep their original 24-hour expiry.
ALTER TABLE "SocialPost" ALTER COLUMN "expiresAt" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "SocialPost_type_publishStatus_createdAt_idx"
  ON "SocialPost"("type", "publishStatus", "createdAt");
CREATE INDEX IF NOT EXISTS "SocialPost_audience_classId_idx"
  ON "SocialPost"("audience", "classId");
CREATE INDEX IF NOT EXISTS "SocialPost_videoLessonId_idx"
  ON "SocialPost"("videoLessonId");

DO $$ BEGIN
  ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_videoLessonId_fkey"
    FOREIGN KEY ("videoLessonId") REFERENCES "VideoLesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Reports must survive removal of the reported content so an action can be
-- audited and the resolver no longer tries to update a row deleted by CASCADE.
ALTER TABLE "SocialReport" DROP CONSTRAINT IF EXISTS "SocialReport_postId_fkey";
ALTER TABLE "SocialReport" DROP CONSTRAINT IF EXISTS "SocialReport_commentId_fkey";

ALTER TABLE "SocialReport" ADD CONSTRAINT "SocialReport_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SocialReport" ADD CONSTRAINT "SocialReport_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "SocialComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
