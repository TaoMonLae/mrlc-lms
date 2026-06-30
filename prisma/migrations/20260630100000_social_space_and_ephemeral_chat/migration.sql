-- Ephemeral chat photos + Social Space (replaces Work Snaps). Idempotent.

-- Ephemeral marker on chat messages (camera photos disappear after 24h).
ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

-- Drop the old Work Snaps table (superseded by Social Space).
DROP TABLE IF EXISTS "WorkSnap";

-- Social Space tables.
CREATE TABLE IF NOT EXISTS "SocialPost" (
  "id"        TEXT NOT NULL,
  "authorId"  TEXT NOT NULL,
  "body"      TEXT,
  "imageUrl"  TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SocialPost_authorId_idx" ON "SocialPost"("authorId");
CREATE INDEX IF NOT EXISTS "SocialPost_expiresAt_idx" ON "SocialPost"("expiresAt");

CREATE TABLE IF NOT EXISTS "SocialLike" (
  "id"        TEXT NOT NULL,
  "postId"    TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SocialLike_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SocialLike_postId_userId_key" ON "SocialLike"("postId","userId");
CREATE INDEX IF NOT EXISTS "SocialLike_postId_idx" ON "SocialLike"("postId");

CREATE TABLE IF NOT EXISTS "SocialComment" (
  "id"        TEXT NOT NULL,
  "postId"    TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "body"      TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SocialComment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SocialComment_postId_idx" ON "SocialComment"("postId");

DO $$ BEGIN
  ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "SocialLike" ADD CONSTRAINT "SocialLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "SocialLike" ADD CONSTRAINT "SocialLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "SocialComment" ADD CONSTRAINT "SocialComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "SocialComment" ADD CONSTRAINT "SocialComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
