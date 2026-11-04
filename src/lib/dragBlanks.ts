/**
 * Wayground-style drag-and-drop authoring helpers.
 *
 * Teachers write the passage with blanked-out words marked using
 * "[[word]]", e.g. "The [[cat]] sat on the [[mat]]." That raw text is
 * parsed into the stored shape — "{{id}}"-token text plus a `blanks` list —
 * which is what the server, the exam player, and the print export all key
 * off (see examBank.ts's dragDropBank()/parseDragBlankText()).
 */

export interface DragBlank {
  id: string;
  answer: string;
}

export function parseDragBlankText(raw: string): { text: string; blanks: DragBlank[] } {
  let i = 0;
  const blanks: DragBlank[] = [];
  const text = String(raw || '').replace(/\[\[(.+?)\]\]/g, (_m, word) => {
    i += 1;
    const id = String(i);
    blanks.push({ id, answer: String(word).trim() });
    return `{{${id}}}`;
  });
  return { text, blanks };
}

/** Reverse of parseDragBlankText — for loading a stored question back into
 *  the editable [[word]] form. */
export function toDragBlankText(text: string, blanks: DragBlank[]): string {
  const byId: Record<string, string> = {};
  for (const b of blanks) byId[b.id] = b.answer;
  return String(text || '').replace(/\{\{([^{}]+)\}\}/g, (_m, id) => `[[${byId[id] ?? ''}]]`);
}

/** Split "{{id}}"-token text into alternating plain-text and blank segments,
 *  for rendering the passage inline (used by both the exam player and the
 *  teacher preview/print views). */
export type DragTextSegment = { kind: 'text'; text: string } | { kind: 'blank'; blankId: string };

export function splitDragText(text: string): DragTextSegment[] {
  const segments: DragTextSegment[] = [];
  const re = /\{\{([^{}]+)\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) segments.push({ kind: 'text', text: text.slice(last, m.index) });
    segments.push({ kind: 'blank', blankId: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ kind: 'text', text: text.slice(last) });
  return segments;
}

const BLANK_MARKER = /\{\{[^{}]+\}\}|_{2,}/;

/**
 * Separate a drag-and-drop question's instructions from its blanks so the
 * player can show the instructions once as the question heading and the
 * blanks once in the answer area. The lead is every opening paragraph that
 * has no blank; `body` is the rest. When the first paragraph already holds a
 * blank (a one-sentence cloze), there is no lead and the body is the whole text.
 */
export function splitDragPrompt(text: string): { lead: string; body: string } {
  const paragraphs = String(text || '').split(/\n\s*\n/);
  const firstBlank = paragraphs.findIndex((paragraph) => BLANK_MARKER.test(paragraph));
  if (firstBlank <= 0) return { lead: '', body: String(text || '') };
  return {
    lead: paragraphs.slice(0, firstBlank).join('\n\n').trim(),
    body: paragraphs.slice(firstBlank).join('\n\n'),
  };
}

/** True when the text contains blank markers ({{id}} tokens or ___ runs). */
export function hasDragBlanks(text: string): boolean {
  return BLANK_MARKER.test(String(text || ''));
}
