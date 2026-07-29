import express from "express";
// @ts-ignore -- wordpos (and its wordnet-db data dependency) ship without
// TypeScript types; every exported member is used loosely as `any` below.
import WordPOS from "wordpos";
import { containsHanCharacters, formatCedictPinyin } from "./shared/languageQuestPinyin";

interface Deps {
  app: express.Express;
  prisma: any;
  authMiddleware: express.RequestHandler;
  logger: { error: (...a: any[]) => void };
}

const POS_LABEL: Record<string, string> = { n: "noun", v: "verb", a: "adjective", r: "adverb", s: "adjective" };

// wordpos wraps the (bundled, offline) Princeton WordNet 3.1 database, so
// lookups need no network access and no database of our own -- the "data" is
// the wordnet-db npm package. WordNet is distributed under a permissive
// license that allows redistribution as-is; see the Acknowledgments section
// added to README.md alongside this feature.
const wordpos = new (WordPOS as any)({ stopwords: false });

interface DictionaryEntry {
  pos: string;
  posLabel: string;
  lemma: string;
  definition: string;
  examples: string[];
  synonyms: string[];
}

function normalizeResults(raw: any[], queryWord: string): DictionaryEntry[] {
  const seen = new Set<string>();
  const entries: DictionaryEntry[] = [];
  for (const r of raw || []) {
    const def = (r.def || "").trim();
    if (!def) continue;
    const key = `${r.pos}:${def}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({
      pos: r.pos,
      posLabel: POS_LABEL[r.pos] || r.pos,
      lemma: r.lemma || queryWord,
      definition: def,
      examples: Array.isArray(r.exp) ? r.exp.slice(0, 3) : [],
      synonyms: Array.isArray(r.synonyms) ? r.synonyms.filter((s: string) => s.toLowerCase() !== queryWord.toLowerCase()).slice(0, 8) : [],
    });
  }
  // Group by part of speech in a stable, dictionary-like order.
  const order = ["n", "v", "a", "s", "r"];
  entries.sort((a, b) => order.indexOf(a.pos) - order.indexOf(b.pos));
  return entries;
}

interface Translation {
  pos: string | null;
  definition: string;
}

interface MonDefinitionOut {
  lang: string;
  pos: string | null;
  definition: string;
  example: string | null;
}

interface MonWordResult {
  word: string;
  ipa: string | null;
  thaiGloss: string | null;
  definitions: MonDefinitionOut[];
}

// Mon (like Burmese) is written in the Myanmar Unicode block, so a query
// containing any character in that range is treated as Mon-script input
// rather than an English word to look up in WordNet.
const MYANMAR_SCRIPT_RE = /[က-႟]/;

interface ChineseWordResult {
  simplified: string;
  traditional: string;
  pinyin: string;
  definitions: string[];
}

const chineseWordSelect = { simplified: true, traditional: true, pinyin: true, definitions: true };

function toChineseWordResult(row: any): ChineseWordResult {
  return {
    simplified: row.simplified,
    traditional: row.traditional,
    pinyin: formatCedictPinyin(row.pinyin),
    definitions: row.definitions,
  };
}

const monWordSelect = {
  word: true,
  ipa: true,
  thaiGloss: true,
  definitions: {
    orderBy: [{ lang: "asc" }, { id: "asc" }],
    select: { lang: true, pos: true, definition: true, example: true },
  },
};

export function registerDictionaryRoutes(deps: Deps): void {
  // authMiddleware is accepted for interface consistency with the other
  // register*Routes functions but intentionally unused: the Dictionary
  // feature is public (no sign-in required).
  const { app, prisma, logger } = deps;

  // Burmese translations for a word, if the (separately, non-WordNet)
  // English->Myanmar dataset has any -- see prisma/seedEnMyDictionary.ts for
  // where this data came from and its licensing caveat.
  async function lookupTranslations(word: string): Promise<Translation[]> {
    try {
      const rows = await prisma.enMyDictionaryEntry.findMany({
        where: { wordLower: word.toLowerCase() },
        select: { pos: true, definition: true },
      });
      return rows;
    } catch (err) {
      logger.error("Error looking up EN-MY translation:", err);
      return [];
    }
  }

  // Mon-script query: look up the Mon headword directly. Partial searches
  // prioritize headwords that begin with the supplied text before broader
  // substring matches.
  async function lookupMonByWord(monWord: string): Promise<MonWordResult[]> {
    try {
      const exact = await (prisma as any).monWord.findMany({ where: { word: monWord }, select: monWordSelect, take: 20 });
      if (exact.length > 0) return exact;
      const prefix = await (prisma as any).monWord.findMany({
        where: { word: { startsWith: monWord } },
        select: monWordSelect,
        take: 20,
      });
      if (prefix.length >= 20) return prefix;
      const contains = await (prisma as any).monWord.findMany({
        where: { word: { contains: monWord, not: { startsWith: monWord } } },
        select: monWordSelect,
        take: 20 - prefix.length,
      });
      return [...prefix, ...contains];
    } catch (err) {
      logger.error("Error looking up Mon word:", err);
      return [];
    }
  }

  // English query: find Mon words whose English definition matches. English
  // definitions in this dataset are often full glosses/phrases rather than
  // single words, so this is a best-effort "contains" match, ranked with
  // exact-gloss matches first.
  async function lookupMonByEnglish(word: string): Promise<MonWordResult[]> {
    try {
      const candidates: any[] = await (prisma as any).monWord.findMany({
        where: { definitions: { some: { lang: "eng", definition: { contains: word, mode: "insensitive" } } } },
        select: monWordSelect,
        take: 30,
      });
      const isExact = (w: any) =>
        w.definitions.some((d: any) => d.lang === "eng" && d.definition.replace(/\.$/, "").trim().toLowerCase() === word.toLowerCase());
      candidates.sort((a, b) => Number(isExact(b)) - Number(isExact(a)));
      return candidates.slice(0, 12);
    } catch (err) {
      logger.error("Error looking up Mon-by-English:", err);
      return [];
    }
  }

  // Chinese-script query: look up the Hanzi headword directly, in either
  // script variant CC-CEDICT tracks. Exact matches on either simplified or
  // traditional form come first, then prefix, then substring matches --
  // mirrors the Mon-by-word ranking above.
  async function lookupChineseByHanzi(word: string): Promise<ChineseWordResult[]> {
    try {
      const exact = await (prisma as any).chineseDictionaryEntry.findMany({
        where: { OR: [{ simplified: word }, { traditional: word }] },
        select: chineseWordSelect,
        take: 20,
      });
      if (exact.length > 0) return exact.map(toChineseWordResult);
      const prefix = await (prisma as any).chineseDictionaryEntry.findMany({
        where: { OR: [{ simplified: { startsWith: word } }, { traditional: { startsWith: word } }] },
        select: chineseWordSelect,
        take: 20,
      });
      if (prefix.length >= 20) return prefix.map(toChineseWordResult);
      const contains = await (prisma as any).chineseDictionaryEntry.findMany({
        where: {
          AND: [
            { OR: [{ simplified: { contains: word } }, { traditional: { contains: word } }] },
            { NOT: { OR: [{ simplified: { startsWith: word } }, { traditional: { startsWith: word } }] } },
          ],
        },
        select: chineseWordSelect,
        take: 20 - prefix.length,
      });
      return [...prefix, ...contains].map(toChineseWordResult);
    } catch (err) {
      logger.error("Error looking up Chinese word:", err);
      return [];
    }
  }

  // English query: find Chinese entries with a matching English gloss.
  // Definitions are stored as a Postgres text[] per CC-CEDICT entry (one
  // array per headword+pronunciation, not a joined table like Mon's), so
  // this needs a raw query to search inside each entry's array of glosses.
  async function lookupChineseByEnglish(word: string): Promise<ChineseWordResult[]> {
    try {
      const escaped = word.replace(/[\\%_]/g, (c) => `\\${c}`);
      const rows: any[] = await prisma.$queryRaw`
        SELECT "simplified", "traditional", "pinyin", "definitions"
        FROM "ChineseDictionaryEntry"
        WHERE EXISTS (
          SELECT 1 FROM unnest("definitions") AS gloss WHERE gloss ILIKE ${"%" + escaped + "%"} ESCAPE '\'
        )
        LIMIT 30
      `;
      const isExact = (row: any) =>
        row.definitions.some((d: string) => d.replace(/\.$/, "").trim().toLowerCase() === word.toLowerCase());
      rows.sort((a, b) => Number(isExact(b)) - Number(isExact(a)));
      return rows.slice(0, 12).map(toChineseWordResult);
    } catch (err) {
      logger.error("Error looking up Chinese-by-English:", err);
      return [];
    }
  }

  // Public endpoints -- the Dictionary page is usable without signing in, so
  // these intentionally do NOT use authMiddleware. They're still covered by
  // the app-wide per-IP rate limiter registered in server.ts.
  app.get("/api/dictionary/lookup", async (req, res) => {
    const rawWord = (req.query.word ?? "").toString().normalize("NFC").trim().slice(0, 60);
    if (!rawWord) { res.status(400).json({ error: "A word is required" }); return; }

    if (MYANMAR_SCRIPT_RE.test(rawWord)) {
      try {
        const monMatches = await lookupMonByWord(rawWord);
        if (monMatches.length === 0) {
          res.status(404).json({ error: `No Mon dictionary entry found for "${rawWord}".` });
          return;
        }
        res.json({ word: rawWord, entries: [], translations: [], monMatches, chineseMatches: [] });
      } catch (err) {
        logger.error("Error looking up dictionary word:", err);
        res.status(500).json({ error: "Internal Server Error" });
      }
      return;
    }

    if (containsHanCharacters(rawWord)) {
      try {
        const chineseMatches = await lookupChineseByHanzi(rawWord.slice(0, 20));
        if (chineseMatches.length === 0) {
          res.status(404).json({ error: `No Chinese dictionary entry found for "${rawWord}".` });
          return;
        }
        res.json({ word: rawWord, entries: [], translations: [], monMatches: [], chineseMatches });
      } catch (err) {
        logger.error("Error looking up dictionary word:", err);
        res.status(500).json({ error: "Internal Server Error" });
      }
      return;
    }

    const word = rawWord.toLowerCase();
    if (!/^[a-z][a-z '-]*$/.test(word)) { res.status(400).json({ error: "Enter a single English word, or paste a Mon or Chinese word" }); return; }
    try {
      const [raw, translations, monMatches, chineseMatches]: [any[], Translation[], MonWordResult[], ChineseWordResult[]] = await Promise.all([
        new Promise<any[]>((resolve) => wordpos.lookup(word, resolve)),
        lookupTranslations(word),
        lookupMonByEnglish(word),
        lookupChineseByEnglish(word),
      ]);
      const entries = normalizeResults(raw, word);
      if (entries.length === 0 && translations.length === 0 && monMatches.length === 0 && chineseMatches.length === 0) {
        res.status(404).json({ error: `No definition found for "${word}".` });
        return;
      }
      res.json({ word, entries, translations, monMatches, chineseMatches });
    } catch (err) {
      logger.error("Error looking up dictionary word:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // "Word of the Day" style random pick for the Dictionary page's landing state.
  app.get("/api/dictionary/random", async (_req, res) => {
    try {
      const word: string = await new Promise((resolve, reject) => {
        wordpos.rand({ count: 1 }, (words: string[]) => {
          if (words && words[0]) resolve(words[0]);
          else reject(new Error("No word returned"));
        });
      });
      const [raw, translations, monMatches, chineseMatches]: [any[], Translation[], MonWordResult[], ChineseWordResult[]] = await Promise.all([
        new Promise<any[]>((resolve) => wordpos.lookup(word, resolve)),
        lookupTranslations(word),
        lookupMonByEnglish(word),
        lookupChineseByEnglish(word),
      ]);
      const entries = normalizeResults(raw, word);
      if (entries.length === 0) { res.status(404).json({ error: "Try again" }); return; }
      res.json({ word, entries, translations, monMatches, chineseMatches });
    } catch (err) {
      logger.error("Error fetching random dictionary word:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
}
