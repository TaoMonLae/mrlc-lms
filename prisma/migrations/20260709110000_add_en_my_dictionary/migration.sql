-- English -> Burmese dictionary. Static reference data (no FK/ownership),
-- populated separately by `npm run seed:en-my-dictionary` from
-- prisma/seed-data/en-my-dictionary.json -- this migration only creates the table.

CREATE TABLE IF NOT EXISTS "EnMyDictionaryEntry" (
  "id"         TEXT NOT NULL,
  "word"       TEXT NOT NULL,
  "wordLower"  TEXT NOT NULL,
  "pos"        TEXT,
  "definition" TEXT NOT NULL,
  CONSTRAINT "EnMyDictionaryEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "EnMyDictionaryEntry_wordLower_idx" ON "EnMyDictionaryEntry"("wordLower");
