import { useEffect, useRef, useState } from 'react';
import { Delete, X } from 'lucide-react';
import { evaluateGedExpression, formatGedCalculatorValue } from '@/shared/gedCalculator';
import { LanguageQuestContentText } from '@/src/components/games/LanguageQuestContentText';
import { cn } from '@/lib/utils';

const MATH_LANGUAGE = 'GED Mathematical Reasoning';

interface ToolPanelProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

function ToolPanel({ title, onClose, children, className }: ToolPanelProps) {
  return (
    <section
      role="dialog"
      aria-label={title}
      className={cn('flex max-h-[min(80dvh,40rem)] flex-col overflow-hidden rounded-xl border border-slate-300 bg-white text-slate-900 shadow-2xl dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100', className)}
    >
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-100 px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-sm font-black">{title}</h2>
        <button type="button" onClick={onClose} aria-label={`Close ${title.toLowerCase()}`} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 outline-none hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-sky-500 dark:hover:bg-slate-700">
          <X className="h-4 w-4" />
        </button>
      </header>
      <div className="min-h-0 overflow-y-auto">{children}</div>
    </section>
  );
}

const KEYS: Array<{ label: string; insert?: string; action?: 'clear' | 'back' | 'equals' | 'negate'; aria?: string; tone?: 'op' | 'fn' | 'go' }> = [
  { label: 'C', action: 'clear', aria: 'Clear', tone: 'fn' }, { label: '(', insert: '(', tone: 'fn' }, { label: ')', insert: ')', tone: 'fn' }, { label: '⌫', action: 'back', aria: 'Delete last', tone: 'fn' },
  { label: 'x²', insert: '^2', aria: 'Square', tone: 'fn' }, { label: 'xʸ', insert: '^', aria: 'Power', tone: 'fn' }, { label: '√', insert: '√(', aria: 'Square root', tone: 'fn' }, { label: '÷', insert: '÷', aria: 'Divide', tone: 'op' },
  { label: '7', insert: '7' }, { label: '8', insert: '8' }, { label: '9', insert: '9' }, { label: '×', insert: '×', aria: 'Multiply', tone: 'op' },
  { label: '4', insert: '4' }, { label: '5', insert: '5' }, { label: '6', insert: '6' }, { label: '−', insert: '−', aria: 'Subtract', tone: 'op' },
  { label: '1', insert: '1' }, { label: '2', insert: '2' }, { label: '3', insert: '3' }, { label: '+', insert: '+', aria: 'Add', tone: 'op' },
  { label: '(−)', action: 'negate', aria: 'Negative', tone: 'fn' }, { label: '0', insert: '0' }, { label: '.', insert: '.', aria: 'Decimal point' }, { label: '=', action: 'equals', aria: 'Equals', tone: 'go' },
  { label: 'π', insert: 'π', aria: 'Pi', tone: 'fn' }, { label: '%', insert: '%', aria: 'Percent', tone: 'fn' },
];

/** On-screen scientific calculator for GED-style practice tests. */
export function GedCalculator({ onClose, className }: { onClose: () => void; className?: string }) {
  const [expression, setExpression] = useState('');
  const [display, setDisplay] = useState<{ text: string; error: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const press = (key: (typeof KEYS)[number]) => {
    if (key.action === 'clear') { setExpression(''); setDisplay(null); }
    else if (key.action === 'back') setExpression((current) => current.slice(0, -1));
    else if (key.action === 'negate') setExpression((current) => `${current}−`);
    else if (key.action === 'equals') calculate();
    else if (key.insert) {
      // Continue from the previous answer when an operator follows a result.
      const continuesFromResult = display && !display.error && expression === '' && /^[+−×÷^%]/.test(key.insert);
      setExpression((current) => (continuesFromResult ? display.text : current) + key.insert);
    }
    inputRef.current?.focus();
  };

  const calculate = () => {
    if (!expression.trim()) return;
    const result = evaluateGedExpression(expression);
    if ('value' in result) {
      setDisplay({ text: formatGedCalculatorValue(result.value), error: false });
      setExpression('');
    } else {
      setDisplay({ text: result.error, error: true });
    }
  };

  return (
    <ToolPanel title="Calculator" onClose={onClose} className={cn('w-[min(100%,20rem)]', className)}>
      <div className="p-3">
        <div className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-950">
          <label htmlFor="ged-calculator-input" className="sr-only">Expression</label>
          <input
            id="ged-calculator-input"
            ref={inputRef}
            value={expression}
            onChange={(event) => setExpression(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === '=') { event.preventDefault(); calculate(); }
              if (event.key === 'Escape') { event.preventDefault(); setExpression(''); setDisplay(null); }
            }}
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            placeholder="0"
            className="w-full bg-transparent text-right font-mono text-base text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
          />
          <output aria-live="polite" className={cn('block min-h-8 truncate text-right font-mono text-2xl font-bold', display?.error ? 'text-sm leading-8 text-rose-600 dark:text-rose-300' : 'text-slate-950 dark:text-white')}>
            {display?.text ?? ''}
          </output>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {KEYS.map((key) => (
            <button
              key={key.label}
              type="button"
              aria-label={key.aria ?? key.label}
              onClick={() => press(key)}
              className={cn(
                'h-11 rounded-lg border text-base font-bold outline-none transition active:translate-y-px focus-visible:ring-2 focus-visible:ring-sky-500',
                key.tone === 'go' ? 'border-sky-700 bg-sky-700 text-white hover:bg-sky-800'
                  : key.tone === 'op' ? 'border-slate-300 bg-slate-200 text-slate-900 hover:bg-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600'
                    : key.tone === 'fn' ? 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                      : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800',
              )}
            >
              {key.label === '⌫' ? <Delete className="mx-auto h-4 w-4" /> : key.label}
            </button>
          ))}
        </div>
      </div>
    </ToolPanel>
  );
}

const FORMULA_SECTIONS: Array<{ title: string; rows: Array<[string, string]> }> = [
  {
    title: 'Area',
    rows: [
      ['Parallelogram', '$A=bh$'],
      ['Trapezoid', '$A=\\frac{1}{2}h(b_1+b_2)$'],
      ['Triangle', '$A=\\frac{1}{2}bh$'],
      ['Circle', '$A=\\pi r^2$'],
    ],
  },
  {
    title: 'Perimeter and circumference',
    rows: [
      ['Rectangle', '$P=2l+2w$'],
      ['Circle', '$C=2\\pi r$ or $C=\\pi d$'],
    ],
  },
  {
    title: 'Surface area and volume',
    rows: [
      ['Rectangular prism', '$SA=2lw+2lh+2wh$, $V=lwh$'],
      ['Right prism', '$SA=ph+2B$, $V=Bh$'],
      ['Cylinder', '$SA=2\\pi rh+2\\pi r^2$, $V=\\pi r^2h$'],
      ['Pyramid', '$SA=\\frac{1}{2}ps+B$, $V=\\frac{1}{3}Bh$'],
      ['Cone', '$SA=\\pi rs+\\pi r^2$, $V=\\frac{1}{3}\\pi r^2h$'],
      ['Sphere', '$SA=4\\pi r^2$, $V=\\frac{4}{3}\\pi r^3$'],
    ],
  },
  {
    title: 'Algebra',
    rows: [
      ['Slope of a line', '$m=\\frac{y_2-y_1}{x_2-x_1}$'],
      ['Slope-intercept form', '$y=mx+b$'],
      ['Point-slope form', '$y-y_1=m(x-x_1)$'],
      ['Standard form', '$ax+by=c$'],
      ['Quadratic form', '$y=ax^2+bx+c$'],
      ['Quadratic formula', '$x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}$'],
      ['Pythagorean theorem', '$a^2+b^2=c^2$'],
      ['Simple interest', '$I=prt$'],
      ['Distance', '$d=rt$'],
      ['Total cost', 'total cost $=$ (number of units) $\\times$ (price per unit)'],
    ],
  },
];

/** Reference sheet of the formulas supplied on the GED Mathematical Reasoning test. */
export function GedFormulaSheet({ onClose, className }: { onClose: () => void; className?: string }) {
  return (
    <ToolPanel title="Formula sheet" onClose={onClose} className={cn('w-[min(100%,26rem)]', className)}>
      <div className="space-y-4 p-4 text-sm">
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400"><LanguageQuestContentText language={MATH_LANGUAGE} text={'$p$ = perimeter of base, $B$ = area of base, $s$ = slant height. Use $\\pi\\approx3.14$ unless a question says otherwise.'} /></p>
        {FORMULA_SECTIONS.map((section) => (
          <section key={section.title}>
            <h3 className="text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{section.title}</h3>
            <dl className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
              {section.rows.map(([label, formula]) => (
                <div key={label} className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 px-3 py-2">
                  <dt className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</dt>
                  <dd className="min-w-0 overflow-x-auto"><LanguageQuestContentText language={MATH_LANGUAGE} text={formula} /></dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </ToolPanel>
  );
}
