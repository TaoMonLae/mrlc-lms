// Shared helpers for adding grammar/cloze/reorder/odd-one-out practice
// challenges to the Language Quest course generator scripts. Every helper
// here reuses data the caller has already validated (a real word, a real
// example sentence, a real part-of-speech tag) rather than inventing new
// language content, so the risk profile matches the rest of these scripts:
// generated-but-correct-by-construction.

export function option(text, correct, opts = {}) {
  const clean = String(text).trim();
  return { text: clean, correct, emoji: opts.emoji ?? null, audioText: opts.audioText ?? clean };
}

// Blanks the first whole-word (case-insensitive) occurrence of `word` inside
// `sentence`. Returns null if the word isn't actually present as a whole
// word, so callers can fall back instead of silently shipping a blanked
// sentence that doesn't actually test the target word.
export function blankWord(sentence, word) {
  const escaped = String(word).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`\\b${escaped}\\b`, "i");
  if (!pattern.test(sentence)) return null;
  return sentence.replace(pattern, "_____");
}

// Splits a whitespace-delimited sentence into REORDER tiles. Returns null
// when there are fewer than 2 tokens, since reordering a single tile tests
// nothing.
export function tokenizeWords(sentence) {
  const tokens = String(sentence).trim().split(/\s+/).filter(Boolean);
  return tokens.length >= 2 ? tokens : null;
}

// Splits a CJK string into individual-character REORDER tiles (there's no
// whitespace to split on). Returns null when there are fewer than 2
// characters.
export function tokenizeCharacters(text) {
  const tokens = [...String(text).trim()].filter((ch) => ch.trim().length > 0);
  return tokens.length >= 2 ? tokens : null;
}

// Builds an ODD_ONE_OUT challenge: up to 3 items that share a category plus
// one item that doesn't. Selecting the item that doesn't belong is the right
// answer, so the odd item is the one marked `correct: true`. Returns null
// when there aren't at least 3 distinct in-group items or no odd item was
// supplied, so callers can skip rather than force a degenerate challenge.
export function buildOddOneOut(question, groupItems, oddItem, explanation) {
  const inGroup = [...new Set(groupItems)].filter((item) => item !== oddItem).slice(0, 3);
  if (inGroup.length < 3 || !oddItem) return null;
  const options = inGroup.map((text) => option(text, false));
  options.splice(inGroup.length % 3, 0, option(oddItem, true));
  return { type: "ODD_ONE_OUT", question, explanation, options };
}

// Maps a WordNet-style single-letter part-of-speech code to a friendly
// English label used in ODD_ONE_OUT/grammar question text.
export function posLabel(pos) {
  switch (pos) {
    case "n": return "noun";
    case "v": return "verb";
    case "a":
    case "s": return "adjective";
    case "r": return "adverb";
    default: return null;
  }
}
