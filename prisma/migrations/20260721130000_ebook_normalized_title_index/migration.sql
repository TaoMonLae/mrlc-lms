-- E-Library duplicate detection: store a normalized title/seriesName column
-- so duplicate lookups are an indexed lookup instead of a full-table scan.
-- Normalization mirrors lib/ebookTitles.ts: NFKC + trim + collapse whitespace
-- to a single space + lowercase. Existing rows are backfilled from title /
-- seriesName so the index is usable immediately.

ALTER TABLE "Ebook" ADD COLUMN IF NOT EXISTS "titleLower" TEXT;
ALTER TABLE "Ebook" ADD COLUMN IF NOT EXISTS "seriesNameLower" TEXT;

UPDATE "Ebook"
  SET "titleLower" = lower(btrim(regexp_replace(normalize("title", NFKC), '\s+', ' ', 'g')))
  WHERE "titleLower" IS NULL AND "title" IS NOT NULL;

UPDATE "Ebook"
  SET "seriesNameLower" = lower(btrim(regexp_replace(normalize("seriesName", NFKC), '\s+', ' ', 'g')))
  WHERE "seriesNameLower" IS NULL AND "seriesName" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Ebook_titleLower_idx" ON "Ebook"("titleLower");
CREATE INDEX IF NOT EXISTS "Ebook_seriesNameLower_seriesNumber_idx"
  ON "Ebook"("seriesNameLower", "seriesNumber");
