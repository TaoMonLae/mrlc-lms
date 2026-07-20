-- Social Space: multi-photo posts (SocialMediaAsset) and FB/IG-style
-- reactions (SocialReaction on SocialLike). Backward compatible --
-- existing likes default to LIKE, the denormalised imageUrl cover on
-- SocialPost keeps the old feed query + /uploads/social auth gate working.

DO $$ BEGIN
  CREATE TYPE "SocialReaction" AS ENUM ('LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add reaction to existing likes; default LIKE so the unique(postId, userId)
-- row that represents "this user has reacted" keeps its prior meaning.
ALTER TABLE "SocialLike"
  ADD COLUMN IF NOT EXISTS "reaction" "SocialReaction" NOT NULL DEFAULT 'LIKE';

CREATE INDEX IF NOT EXISTS "SocialLike_postId_reaction_idx"
  ON "SocialLike"("postId", "reaction");

-- Ordered media attachments for a post.
CREATE TABLE IF NOT EXISTS "SocialMediaAsset" (
    "id"        TEXT NOT NULL,
    "postId"    TEXT NOT NULL,
    "url"       TEXT NOT NULL,
    "position"  INTEGER NOT NULL DEFAULT 0,
    "width"     INTEGER,
    "height"    INTEGER,
    "mime"      TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialMediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SocialMediaAsset_postId_position_idx"
  ON "SocialMediaAsset"("postId", "position");

DO $$ BEGIN
  ALTER TABLE "SocialMediaAsset" ADD CONSTRAINT "SocialMediaAsset_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
