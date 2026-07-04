-- Full-article HTML, only populated when the source's own RSS feed includes it
-- (content:encoded). Never backfilled by scraping the source page.
ALTER TABLE "NewsArticle" ADD COLUMN IF NOT EXISTS "content" TEXT;
