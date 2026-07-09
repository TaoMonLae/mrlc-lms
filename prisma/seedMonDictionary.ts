// One-time loader for the Mon dictionary (MonWord + MonDefinition tables).
//
// Data provenance: parsed from the "MonDictDB" project
// (https://github.com/Barnista/MonDictDB, MIT License, Copyright (c)
// Barnista) -- a purpose-built, contributor-authored multilingual Mon
// dictionary (not scraped from a commercial product, unlike the
// EnMyDictionaryEntry data -- see prisma/seedEnMyDictionary.ts for that
// caveat, which does not apply here).
//
// Source was a set of MySQL dump files under sql/ (WordROW*.sql for the
// 26,194 Mon headwords with IPA + a short Thai gloss, and
// Definition{ENG,MYA,THA}ROW*.sql for 77,617 per-language sense
// definitions). Those were parsed and joined into
// prisma/seed-data/mon-dictionary.json (21,086 words that have at least one
// definition); this script does a straight bulk insert of that JSON, no
// further text processing.
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface SourceDefinition {
  lang: string;
  pos: string | null;
  definition: string;
  example: string | null;
}

interface SourceWord {
  word: string;
  ipa: string | null;
  th: string | null;
  definitions: SourceDefinition[];
}

async function main() {
  const existing = await (prisma as any).monWord.count();
  if (existing > 0) {
    console.log(`MonWord already has ${existing} rows -- skipping (delete them first to reload).`);
    await prisma.$disconnect();
    return;
  }

  const dataPath = path.join(process.cwd(), "prisma", "seed-data", "mon-dictionary.json");
  const words: SourceWord[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  console.log(`Loaded ${words.length} Mon words from ${dataPath}`);

  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < words.length; i += BATCH) {
    const batch = words.slice(i, i + BATCH);
    await prisma.$transaction(
      batch.map((w) =>
        (prisma as any).monWord.create({
          data: {
            word: w.word,
            ipa: w.ipa || null,
            thaiGloss: w.th || null,
            definitions: {
              create: w.definitions.map((d) => ({
                lang: d.lang,
                pos: d.pos || null,
                definition: d.definition,
                example: d.example || null,
              })),
            },
          },
        })
      )
    );
    inserted += batch.length;
    console.log(`  ${inserted} / ${words.length}`);
  }

  console.log("Done.");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
