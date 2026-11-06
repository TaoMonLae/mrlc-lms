// These marks are optional in typed flashcard answers, including smart quotes
// and typographic dashes. Keep letters, accents, digits and other symbols intact.
const SEPARATORS = /[\s:,.!;?"'’‘“”\-‐‑‒–—―_+]+/gu;

function normalize(value: string): string {
  return value.normalize('NFC').trim().toLowerCase().replace(/\s+/gu, ' ');
}

function answerParts(value: string) {
  let content = '';
  let end = 0;
  const boundaries = new Map<number, boolean>();
  for (const match of value.matchAll(SEPARATORS)) {
    content += value.slice(end, match.index);
    // A plain word space is required; a punctuation boundary is optional.
    boundaries.set(content.length, /^\s+$/u.test(match[0]));
    end = match.index! + match[0].length;
  }
  content += value.slice(end);
  boundaries.delete(0);
  boundaries.delete(content.length);
  return { content, boundaries };
}

/** Accept punctuation omissions without accepting wrong words or missing word spaces. */
export function matchesFlashcardAnswer(typed: string, expected: string): boolean {
  const input = normalize(typed);
  const answer = normalize(expected);
  if (!input || !answer) return false;
  const actual = answerParts(input);
  const correct = answerParts(answer);
  // Punctuation-only cards still require their actual symbol, not an empty match.
  if (!actual.content || !correct.content) return input === answer;
  if (actual.content !== correct.content) return false;
  for (const [position, required] of actual.boundaries) {
    if (required && !correct.boundaries.has(position)) return false;
  }
  for (const [position, required] of correct.boundaries) {
    if (required && !actual.boundaries.has(position)) return false;
  }
  return true;
}
