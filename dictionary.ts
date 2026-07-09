import express from "express";
// @ts-ignore -- wordpos (and its wordnet-db data dependency) ship without
// TypeScript types; every exported member is used loosely as `any` below.
import WordPOS from "wordpos";

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

export function registerDictionaryRoutes(deps: Deps): void {
  const { app, prisma, authMiddleware, logger } = deps;

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

  app.get("/api/dictionary/lookup", authMiddleware, async (req, res) => {
    const word = (req.query.word ?? "").toString().trim().toLowerCase().slice(0, 60);
    if (!word) { res.status(400).json({ error: "A word is required" }); return; }
    if (!/^[a-z][a-z '-]*$/.test(word)) { res.status(400).json({ error: "Enter a single English word" }); return; }
    try {
      const [raw, translations]: [any[], Translation[]] = await Promise.all([
        new Promise<any[]>((resolve) => wordpos.lookup(word, resolve)),
        lookupTranslations(word),
      ]);
      const entries = normalizeResults(raw, word);
      if (entries.length === 0 && translations.length === 0) {
        res.status(404).json({ error: `No definition found for "${word}".` });
        return;
      }
      res.json({ word, entries, translations });
    } catch (err) {
      logger.error("Error looking up dictionary word:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // "Word of the Day" style random pick for the Dictionary page's landing state.
  app.get("/api/dictionary/random", authMiddleware, async (_req, res) => {
    try {
      const word: string = await new Promise((resolve, reject) => {
        wordpos.rand({ count: 1 }, (words: string[]) => {
          if (words && words[0]) resolve(words[0]);
          else reject(new Error("No word returned"));
        });
      });
      const [raw, translations]: [any[], Translation[]] = await Promise.all([
        new Promise<any[]>((resolve) => wordpos.lookup(word, resolve)),
        lookupTranslations(word),
      ]);
      const entries = normalizeResults(raw, word);
      if (entries.length === 0) { res.status(404).json({ error: "Try again" }); return; }
      res.json({ word, entries, translations });
    } catch (err) {
      logger.error("Error fetching random dictionary word:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
}
