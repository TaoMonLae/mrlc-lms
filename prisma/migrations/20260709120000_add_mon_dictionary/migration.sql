-- Mon dictionary (Mon-keyed, with English/Burmese/Thai definitions per word).
-- Static reference data, populated separately by
-- `npm run seed:mon-dictionary` from prisma/seed-data/mon-dictionary.json --
-- this migration only creates the tables.

CREATE TABLE IF NOT EXISTS "MonWord" (
  "id"        TEXT NOT NULL,
  "word"      TEXT NOT NULL,
  "ipa"       TEXT,
  "thaiGloss" TEXT,
  CONSTRAINT "MonWord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MonWord_word_idx" ON "MonWord"("word");

CREATE TABLE IF NOT EXISTS "MonDefinition" (
  "id"         TEXT NOT NULL,
  "wordId"     TEXT NOT NULL,
  "lang"       TEXT NOT NULL,
  "pos"        TEXT,
  "definition" TEXT NOT NULL,
  "example"    TEXT,
  CONSTRAINT "MonDefinition_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MonDefinition_wordId_idx" ON "MonDefinition"("wordId");
CREATE INDEX IF NOT EXISTS "MonDefinition_lang_idx" ON "MonDefinition"("lang");

DO $$ BEGIN
  ALTER TABLE "MonDefinition" ADD CONSTRAINT "MonDefinition_wordId_fkey"
    FOREIGN KEY ("wordId") REFERENCES "MonWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
