ALTER TABLE "EbookProgress"
  ADD COLUMN IF NOT EXISTS "totalReadingSeconds" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "openCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "firstOpenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "lastOpenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

UPDATE "EbookProgress"
SET "firstOpenedAt" = "updatedAt",
    "lastOpenedAt" = "updatedAt",
    "completedAt" = CASE WHEN "percent" >= 90 THEN "updatedAt" ELSE NULL END;

CREATE INDEX IF NOT EXISTS "EbookProgress_lastOpenedAt_idx"
  ON "EbookProgress"("lastOpenedAt");
