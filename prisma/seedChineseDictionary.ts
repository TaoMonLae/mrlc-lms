// One-time loader for the Chinese (Mandarin) dictionary table.
//
// Data provenance: CC-CEDICT (https://cc-cedict.org), the community-maintained
// Chinese-English dictionary published by MDBG -- the same underlying dataset
// used by Syng (https://github.com/sotch-pr35mac/syng) and most other open
// Chinese dictionary apps. CC-CEDICT is licensed under a Creative Commons
// Attribution-Share Alike license (https://creativecommons.org/licenses/by-sa/).
//
// MDBG's own download page for the latest release prohibits automated/scripted
// access, so this snapshot was instead pulled via `git clone` from a public
// GitHub mirror of the CC-CEDICT text file (a legitimate, non-scripted-access
// redistribution of the same CC-BY-SA data). That mirror carried a
// 2013-08-28 dated snapshot (107,619 entries) rather than the current
// ~124,700-entry release -- reload prisma/seed-data/chinese-dictionary.json
// from a fresher CC-CEDICT export if that gap matters later.
//
// Every line of the raw `cedict_ts.u8` file (format: "traditional simplified
// [pinyin] /definition/definition/.../") was parsed as-is into
// prisma/seed-data/chinese-dictionary.json -- one JSON object per CEDICT
// entry, no further editing. This script does a straight bulk insert of that
// JSON. Per CC-BY-SA's share-alike term, any redistribution of this data (or
// this JSON file) outside this school app should keep the same attribution
// and license.
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
  traditional: string;
  simplified: string;
  pinyin: string;
  definitions: string[];
}

async function main() {
  const existing = await (prisma as any).chineseDictionaryEntry.count();
  if (existing > 0) {
    console.log(`ChineseDictionaryEntry already has ${existing} rows -- skipping (delete them first to reload).`);
    await prisma.$disconnect();
    return;
  }

  const dataPath = path.join(process.cwd(), "prisma", "seed-data", "chinese-dictionary.json");
  const entries: SourceEntry[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  console.log(`Loaded ${entries.length} CC-CEDICT entries from ${dataPath}`);

  const rows = entries.map((e) => ({
    traditional: e.traditional,
    simplified: e.simplified,
    pinyin: e.pinyin,
    definitions: e.definitions,
  }));

  const BATCH = 2000;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await (prisma as any).chineseDictionaryEntry.createMany({ data: batch });
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
