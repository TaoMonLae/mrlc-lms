import React, { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sigma } from 'lucide-react';
import MathText from './MathText';

interface MathFieldProps {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  showToolbar?: boolean;
}

/** label shown on the button, and the LaTeX snippet it inserts. */
const SYMBOLS: { label: string; snippet: string; title: string }[] = [
  { label: 'x²', snippet: '^{2}', title: 'Exponent / power' },
  { label: 'xₙ', snippet: '_{n}', title: 'Subscript' },
  { label: 'a∕b', snippet: '\\frac{a}{b}', title: 'Fraction' },
  { label: '√', snippet: '\\sqrt{x}', title: 'Square root' },
  { label: 'ⁿ√', snippet: '\\sqrt[n]{x}', title: 'nth root' },
  { label: 'π', snippet: '\\pi', title: 'Pi' },
  { label: 'θ', snippet: '\\theta', title: 'Theta' },
  { label: '×', snippet: '\\times', title: 'Multiply' },
  { label: '÷', snippet: '\\div', title: 'Divide' },
  { label: '±', snippet: '\\pm', title: 'Plus-minus' },
  { label: '≤', snippet: '\\leq', title: 'Less than or equal' },
  { label: '≥', snippet: '\\geq', title: 'Greater than or equal' },
  { label: '≠', snippet: '\\neq', title: 'Not equal' },
  { label: '∑', snippet: '\\sum_{i=1}^{n}', title: 'Summation' },
  { label: '∫', snippet: '\\int_{a}^{b}', title: 'Integral' },
  { label: '∞', snippet: '\\infty', title: 'Infinity' },
  { label: '°', snippet: '^{\\circ}', title: 'Degree' },
];

export function MathField({
  value,
  onChange,
  multiline = false,
  rows = 3,
  placeholder,
  showToolbar = true,
}: MathFieldProps) {
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  const insertAtCursor = (snippet: string, wrap = false) => {
    const el = ref.current;
    const piece = wrap ? `$${snippet}$` : snippet;
    if (!el) {
      onChange(value + piece);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + piece + value.slice(end);
    onChange(next);
    // Restore focus and place the caret after the inserted snippet.
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + piece.length;
      try {
        el.setSelectionRange(caret, caret);
      } catch {
        /* number inputs etc. don't support selection */
      }
    });
  };

  const hasMath = value.includes('$');

  return (
    <div className="space-y-2">
      {showToolbar && (
        <div className="flex flex-wrap items-center gap-1 rounded-md border border-slate-200 dark:border-surface-raised bg-slate-50 dark:bg-surface-raised/40 p-1.5">
          <button
            type="button"
            onClick={() => insertAtCursor('x', true)}
            title="Insert inline math: $...$"
            className="flex items-center gap-1 px-2 h-7 rounded text-xs font-semibold text-aubergine-700 dark:text-aubergine-300 bg-aubergine-50 dark:bg-aubergine-900/30 hover:bg-aubergine-100 dark:hover:bg-aubergine-900/50 transition-colors"
          >
            <Sigma className="h-3.5 w-3.5" /> Math
          </button>
          <span className="w-px h-5 bg-slate-200 dark:bg-surface-raised mx-0.5" />
          {SYMBOLS.map((sym) => (
            <button
              key={sym.label}
              type="button"
              onClick={() => insertAtCursor(sym.snippet)}
              title={`${sym.title} — ${sym.snippet}`}
              className="min-w-[28px] h-7 px-1.5 rounded text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised hover:bg-slate-100 dark:hover:bg-surface-raised transition-colors"
            >
              {sym.label}
            </button>
          ))}
        </div>
      )}

      {multiline ? (
        <Textarea
          ref={ref as React.Ref<HTMLTextAreaElement>}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="font-mono text-sm"
        />
      ) : (
        <Input
          ref={ref as React.Ref<HTMLInputElement>}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="font-mono text-sm"
        />
      )}

      {hasMath && (
        <div className="rounded-md border border-dashed border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Preview</p>
          <div className="text-sm text-slate-900 dark:text-white leading-relaxed">
            <MathText>{value}</MathText>
          </div>
        </div>
      )}
    </div>
  );
}

export default MathField;
