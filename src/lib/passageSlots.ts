/**
 * Drop-down markers inside reading passages.
 *
 * A passage marks a drop-down blank as "[Select 13]". The number points at the
 * drop-down question it belongs to: first the question whose own text starts
 * with "13." (so shuffled exams still match), otherwise the 13th question.
 * Only DROPDOWN questions that show the same passage can be linked.
 */
export const SELECT_MARKER = /\[Select(?:\s+(\d+))?\]/g;

export type SlotQuestion = { type: string; text: string; passageText?: string | null };

/** Map each marker number in `passage` to the index of its drop-down question. */
export function mapSelectSlots(passage: string, questions: SlotQuestion[]): Record<string, number> {
  const slots: Record<string, number> = {};
  if (!passage) return slots;
  const candidates = questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => question.type === 'DROPDOWN' && (question.passageText || '') === passage);
  if (!candidates.length) return slots;
  for (const match of passage.matchAll(SELECT_MARKER)) {
    const number = match[1];
    if (!number || slots[number] !== undefined) continue;
    const byText = candidates.find(({ question }) => new RegExp(`^\\s*${number}[.)]\\s`).test(question.text || ''));
    const byPosition = candidates.find(({ index }) => index === Number(number) - 1);
    const found = byText ?? byPosition;
    if (found) slots[number] = found.index;
  }
  return slots;
}

export type PassagePiece =
  | { kind: 'text'; text: string; start: number }
  | { kind: 'slot'; number: string; raw: string };

/** Split a passage into text pieces (with their offsets) and linked drop-down slots. */
export function splitPassage(passage: string, linked: Record<string, unknown>): PassagePiece[] {
  const pieces: PassagePiece[] = [];
  let last = 0;
  for (const match of passage.matchAll(SELECT_MARKER)) {
    const number = match[1];
    if (!number || linked[number] === undefined) continue;
    const at = match.index ?? 0;
    if (at > last) pieces.push({ kind: 'text', text: passage.slice(last, at), start: last });
    pieces.push({ kind: 'slot', number, raw: match[0] });
    last = at + match[0].length;
  }
  if (last < passage.length) pieces.push({ kind: 'text', text: passage.slice(last), start: last });
  return pieces;
}

export type HighlightRange = { start: number; end: number };

/** Add a range, merging any it overlaps or touches. */
export function addHighlight(ranges: HighlightRange[], next: HighlightRange): HighlightRange[] {
  if (next.end <= next.start) return ranges;
  const all = [...ranges, next].sort((a, b) => a.start - b.start);
  const merged: HighlightRange[] = [];
  for (const range of all) {
    const prev = merged[merged.length - 1];
    if (prev && range.start <= prev.end) prev.end = Math.max(prev.end, range.end);
    else merged.push({ ...range });
  }
  return merged;
}

/** Cut a text piece into plain and highlighted runs, keeping absolute offsets. */
export function highlightRuns(text: string, start: number, ranges: HighlightRange[]) {
  const end = start + text.length;
  const runs: { text: string; start: number; mark?: HighlightRange }[] = [];
  let at = start;
  for (const range of ranges) {
    if (range.end <= at || range.start >= end) continue;
    const from = Math.max(range.start, at);
    const to = Math.min(range.end, end);
    if (from > at) runs.push({ text: text.slice(at - start, from - start), start: at });
    runs.push({ text: text.slice(from - start, to - start), start: from, mark: range });
    at = to;
  }
  if (at < end) runs.push({ text: text.slice(at - start), start: at });
  return runs;
}

/** Short stable key for a passage (for storing highlights). */
export function passageHash(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}

const WORD_CHAR = /[\p{L}\p{N}'’-]/u;

/**
 * Widen a selection to whole words and trim surrounding spaces, so a drag
 * that stops one letter short still highlights the full word.
 */
export function snapToWords(text: string, start: number, end: number): HighlightRange {
  let s = Math.max(0, Math.min(start, text.length));
  let e = Math.max(s, Math.min(end, text.length));
  while (s < e && /\s/.test(text[s])) s += 1;
  while (e > s && /\s/.test(text[e - 1])) e -= 1;
  if (e <= s) return { start: s, end: s };
  while (s > 0 && WORD_CHAR.test(text[s - 1]) && WORD_CHAR.test(text[s])) s -= 1;
  while (e < text.length && WORD_CHAR.test(text[e]) && WORD_CHAR.test(text[e - 1])) e += 1;
  return { start: s, end: e };
}
