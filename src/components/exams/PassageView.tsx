import { useEffect, useMemo, useRef, useState } from 'react';
import { Eraser, Highlighter } from 'lucide-react';
import MathText from '../MathText';
import { addHighlight, highlightRuns, splitPassage, type HighlightRange } from '../../lib/passageSlots';

export type PassageSlot = {
  questionIndex: number;
  /** Question number shown to the student, e.g. "13". */
  label: string;
  value: string;
  options: { value: string; label: string }[];
  /** True for the drop-down that belongs to the question on screen. */
  active: boolean;
};

type Props = {
  text: string;
  /** Linked drop-downs keyed by marker number ("13" for "[Select 13]"). */
  slots?: Record<string, PassageSlot>;
  onSlotChange?: (questionIndex: number, value: string) => void;
  onSlotFocus?: (questionIndex: number) => void;
  /** localStorage key for highlights. Without one, highlights last until the page closes. */
  storageKey?: string;
  disabled?: boolean;
};

const readStored = (key?: string): HighlightRange[] => {
  if (!key) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.filter((r) => Number.isInteger(r?.start) && Number.isInteger(r?.end) && r.end > r.start) : [];
  } catch { return []; }
};

/**
 * A reading passage with GED-style tools:
 *  - "[Select 13]" markers become real drop-downs linked to question 13.
 *  - A highlighter: turn it on, select text to highlight it, tap a highlight
 *    to remove it.
 */
export default function PassageView({ text, slots = {}, onSlotChange, onSlotFocus, storageKey, disabled }: Props) {
  const [ranges, setRanges] = useState<HighlightRange[]>(() => readStored(storageKey));
  const [highlighting, setHighlighting] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const memory = useRef<Record<string, HighlightRange[]>>({});
  const memoryKey = storageKey || text;

  useEffect(() => { setRanges(storageKey ? readStored(storageKey) : memory.current[memoryKey] || []); }, [storageKey, memoryKey]);

  const persist = (next: HighlightRange[]) => {
    setRanges(next);
    memory.current[memoryKey] = next;
    if (!storageKey) return;
    try { if (next.length) localStorage.setItem(storageKey, JSON.stringify(next)); else localStorage.removeItem(storageKey); } catch { /* storage full or blocked: keep in memory only */ }
  };

  const pieces = useMemo(() => splitPassage(text, slots), [text, slots]);

  // Convert a DOM selection point into an offset in the raw passage text.
  const pointOffset = (node: Node, offset: number): number | null => {
    const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node as Element;
    let run = element?.closest<HTMLElement>('[data-o]') ?? null;
    if (!run && node.nodeType === Node.ELEMENT_NODE) {
      const child = (node as Element).childNodes[Math.min(offset, (node as Element).childNodes.length - 1)];
      run = child instanceof HTMLElement ? (child.matches('[data-o]') ? child : child.querySelector<HTMLElement>('[data-o]')) : null;
      if (run) return Number(run.dataset.o) + (offset >= (node as Element).childNodes.length ? Number(run.dataset.len) : 0);
    }
    if (!run || !box.current?.contains(run)) return null;
    const start = Number(run.dataset.o);
    const length = Number(run.dataset.len);
    // Math runs render extra characters, so only plain runs give exact offsets.
    if ((run.textContent || '').length !== length) return offset > 0 ? start + length : start;
    const measure = document.createRange();
    measure.setStart(run, 0);
    try { measure.setEnd(node, offset); } catch { return start; }
    return start + Math.min(length, measure.toString().length);
  };

  const captureSelection = () => {
    if (!highlighting) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!box.current?.contains(range.commonAncestorContainer)) return;
    const a = pointOffset(range.startContainer, range.startOffset);
    const b = pointOffset(range.endContainer, range.endOffset);
    if (a === null || b === null) return;
    const start = Math.min(a, b);
    const end = Math.max(a, b);
    if (text.slice(start, end).trim()) persist(addHighlight(ranges, { start, end }));
    selection.removeAllRanges();
  };

  const removeHighlight = (range: HighlightRange) => persist(ranges.filter((r) => r.start !== range.start || r.end !== range.end));

  return <div className="ep-passage-view">
    <div className="ep-passage-tools" role="toolbar" aria-label="Passage tools">
      <button type="button" aria-pressed={highlighting} onClick={() => setHighlighting((on) => !on)}><Highlighter size={15} /> {highlighting ? 'Highlighter on' : 'Highlighter'}</button>
      {ranges.length > 0 && <button type="button" onClick={() => persist([])}><Eraser size={15} /> Clear highlights</button>}
      {highlighting && <span className="ep-passage-hint" aria-live="polite">Select text to highlight it. Tap a highlight to remove it.</span>}
    </div>
    <div ref={box} className={`ep-passage-text ${highlighting ? 'is-highlighting' : ''}`} onMouseUp={captureSelection} onTouchEnd={() => window.setTimeout(captureSelection, 0)} onKeyUp={(event) => { if (event.shiftKey) captureSelection(); }}>
      {pieces.map((piece, i) => {
        if (piece.kind === 'slot') {
          const slot = slots[piece.number];
          return <select key={`s${i}`} className={`ep-inline-select ${slot.active ? 'is-active' : ''}`} aria-label={`Question ${slot.label} answer`} value={slot.value} disabled={disabled}
            onFocus={() => onSlotFocus?.(slot.questionIndex)} onChange={(event) => onSlotChange?.(slot.questionIndex, event.target.value)}>
            <option value="">Select ▾ ({slot.label})</option>
            {slot.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>;
        }
        return highlightRuns(piece.text, piece.start, ranges).map((run) => run.mark
          ? <mark key={`m${run.start}`} data-o={run.start} data-len={run.text.length} className="ep-highlight"
              onClick={() => { if (highlighting) removeHighlight(run.mark!); }}><MathText>{run.text}</MathText></mark>
          : <span key={`t${run.start}`} data-o={run.start} data-len={run.text.length}><MathText>{run.text}</MathText></span>);
      })}
    </div>
  </div>;
}
