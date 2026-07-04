-- News / Daily Digest: admin-managed RSS sources + aggregated article headlines.
-- We only store headline/excerpt + link back to the original source (never
-- full article body), so this stays idempotent and copyright-safe.
CREATE TABLE IF NOT EXISTS "NewsSource" (
  "id"            TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "feedUrl"       TEXT NOT NULL,
  "category"      TEXT,
  "enabled"       BOOLEAN NOT NULL DEFAULT true,
  "lastFetchedAt" TIMESTAMP(3),
  "lastError"     TEXT,
  "createdById"   TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NewsSource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NewsSource_feedUrl_key" ON "NewsSource"("feedUrl");

CREATE TABLE IF NOT EXISTS "NewsArticle" (
  "id"          TEXT NOT NULL,
  "sourceId"    TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "summary"     TEXT,
  "link"        TEXT NOT NULL,
  "imageUrl"    TEXT,
  "author"      TEXT,
  "publishedAt" TIMESTAMP(3),
  "fetchedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NewsArticle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NewsArticle_sourceId_link_key" ON "NewsArticle"("sourceId", "link");
CREATE INDEX IF NOT EXISTS "NewsArticle_publishedAt_idx" ON "NewsArticle"("publishedAt");
CREATE INDEX IF NOT EXISTS "NewsArticle_sourceId_idx" ON "NewsArticle"("sourceId");

DO $$ BEGIN
  ALTER TABLE "NewsArticle" ADD CONSTRAINT "NewsArticle_sourceId_fkey"
    FOREIGN KEY ("sourceId") REFERENCES "NewsSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
