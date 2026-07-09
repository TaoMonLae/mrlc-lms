// One-time loader for the English -> Burmese dictionary table.
//
// Data provenance: sourced from the "ornagai-V2" project
// (https://github.com/saturngod/ornagai-V2), a 2010-era MySQL dump
// (sample-database/dictionary2.sql, `dblist` table, approved rows only).
// That project's own README states the word list itself came from a
// separate "MZ dictionary" product, so -- unlike the WordNet-backed English
// dictionary (Acknowledgments in README.md) -- this data does not carry a
// clean open-source license of its own. It's included here as an internal,
// non-commercial school tool with that caveat on record.
//
// The source dump used Zawgyi encoding (the pre-2019 de facto Myanmar font
// encoding), not standard Unicode. Every definition was converted with the
// Z2U ("Zawgyi to Unicode") rule table from Google's myanmar-tools project
// (https://github.com/googlei18n/myanmar-tools, Apache-2.0) before being
// written to prisma/seed-data/en-my-dictionary.json -- that JSON is therefore
// already clean Unicode and this script does no further text processing,
// just a bulk insert. (Lives under seed-data/, not data/, because data/ is
// gitignored for the app's runtime storage directory.)
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

interface SourceEntry {
  word: string;
  entries: { pos: string; definition: string }[];
}

async function main() {
  const existing = await (prisma as any).enMyDictionaryEntry.count();
  if (existing > 0) {
    console.log(`EnMyDictionaryEntry already has ${existing} rows -- skipping (delete them first to reload).`);
    await prisma.$disconnect();
    return;
  }

  const dataPath = path.join(process.cwd(), "prisma", "seed-data", "en-my-dictionary.json");
  const words: SourceEntry[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  console.log(`Loaded ${words.length} words from ${dataPath}`);

  const rows: { word: string; wordLower: string; pos: string | null; definition: string }[] = [];
  for (const w of words) {
    const wordLower = w.word.toLowerCase();
    for (const e of w.entries) {
      rows.push({ word: w.word, wordLower, pos: e.pos || null, definition: e.definition });
    }
  }
  console.log(`Inserting ${rows.length} dictionary entries...`);

  const BATCH = 2000;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await (prisma as any).enMyDictionaryEntry.createMany({ data: batch });
    console.log(`  ${Math.min(i + BATCH, rows.length)} / ${rows.length}`);
  }

  console.log("Done.");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
