-- E-Library: per-reader resume position and saved highlights.
-- userId/userName are plain fields (no User relation), matching the
-- loose-coupling convention already used by Ebook.uploadedById -- cleaned
-- up manually in the three user-deletion transaction blocks in server.ts.

CREATE TABLE IF NOT EXISTS "EbookProgress" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "ebookId"   TEXT NOT NULL,
  "location"  TEXT NOT NULL,
  "percent"   DOUBLE PRECISION,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EbookProgress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EbookProgress_userId_ebookId_key" ON "EbookProgress"("userId", "ebookId");
CREATE INDEX IF NOT EXISTS "EbookProgress_userId_idx" ON "EbookProgress"("userId");
CREATE INDEX IF NOT EXISTS "EbookProgress_ebookId_idx" ON "EbookProgress"("ebookId");

DO $$ BEGIN
  ALTER TABLE "EbookProgress" ADD CONSTRAINT "EbookProgress_ebookId_fkey"
    FOREIGN KEY ("ebookId") REFERENCES "Ebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "EbookHighlight" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "userName"  TEXT,
  "ebookId"   TEXT NOT NULL,
  "cfi"       TEXT,
  "page"      INTEGER,
  "text"      TEXT NOT NULL,
  "color"     TEXT NOT NULL DEFAULT 'yellow',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EbookHighlight_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EbookHighlight_userId_idx" ON "EbookHighlight"("userId");
CREATE INDEX IF NOT EXISTS "EbookHighlight_ebookId_idx" ON "EbookHighlight"("ebookId");

DO $$ BEGIN
  ALTER TABLE "EbookHighlight" ADD CONSTRAINT "EbookHighlight_ebookId_fkey"
    FOREIGN KEY ("ebookId") REFERENCES "Ebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
