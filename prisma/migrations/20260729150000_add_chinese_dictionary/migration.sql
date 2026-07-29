-- Chinese (Mandarin) dictionary, sourced from CC-CEDICT (one row per CEDICT
-- entry -- see prisma/seedChineseDictionary.ts for provenance/license
-- notes). Static reference data, populated separately by
-- `npm run seed:chinese-dictionary` from
-- prisma/seed-data/chinese-dictionary.json -- this migration only creates
-- the table.

CREATE TABLE IF NOT EXISTS "ChineseDictionaryEntry" (
  "id"          TEXT NOT NULL,
  "simplified"  TEXT NOT NULL,
  "traditional" TEXT NOT NULL,
  "pinyin"      TEXT NOT NULL,
  "definitions" TEXT[] NOT NULL,
  CONSTRAINT "ChineseDictionaryEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ChineseDictionaryEntry_simplified_idx" ON "ChineseDictionaryEntry"("simplified");
CREATE INDEX IF NOT EXISTS "ChineseDictionaryEntry_traditional_idx" ON "ChineseDictionaryEntry"("traditional");
