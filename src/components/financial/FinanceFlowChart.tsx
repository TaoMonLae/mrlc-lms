import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { formatMoney } from '../../lib/locale';

export interface FinanceFlowPoint {
  label: string;
  income: number;
  expenses: number;
  net: number;
}

interface FinanceFlowChartProps {
  data: FinanceFlowPoint[];
  currency: string;
  year: number;
}

const VIEW = { width: 1000, height: 286, top: 18, right: 16, bottom: 38, left: 70 };

function niceCeiling(value: number) {
  if (!(value > 0)) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const normalized = value / power;
  const step = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * power;
}

function compactMoney(value: number, currency: string) {
  const symbol = new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 0,
  }).formatToParts(0).find((part) => part.type === 'currency')?.value || currency;
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(1)}m`;
  if (absolute >= 1_000) return `${symbol}${(value / 1_000).toFixed(0)}k`;
  return `${symbol}${Math.round(value)}`;
}

export function FinanceFlowChart({ data, currency, year }: FinanceFlowChartProps) {
  const clipId = useId();
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const plotWidth = VIEW.width - VIEW.left - VIEW.right;
  const plotHeight = VIEW.height - VIEW.top - VIEW.bottom;
  const maxValue = niceCeiling(Math.max(1, ...data.flatMap((point) => [point.income, point.expenses])));
  const x = (index: number) => VIEW.left + (index / Math.max(data.length - 1, 1)) * plotWidth;
  const y = (value: number) => VIEW.top + plotHeight - (value / maxValue) * plotHeight;
  const linePath = (key: 'income' | 'expenses') => data.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index)} ${y(point[key])}`).join(' ');
  const incomeArea = data.length ? `${linePath('income')} L${x(data.length - 1)} ${VIEW.top + plotHeight} L${x(0)} ${VIEW.top + plotHeight} Z` : '';
  const ticks = Array.from({ length: 5 }, (_, index) => (maxValue / 4) * index).reverse();
  const selected = data[activeIndex ?? Math.max(data.length - 1, 0)];

  const stats = useMemo(() => {
    const income = data.map((point) => point.income);
    const expenses = data.map((point) => point.expenses);
    return [
      { label: 'Peak receipts', value: Math.max(0, ...income) },
      { label: 'Average paid out', value: expenses.length ? expenses.reduce((sum, value) => sum + value, 0) / expenses.length : 0 },
      { label: 'Closing position', value: data.reduce((sum, point) => sum + point.net, 0), signed: true },
    ];
  }, [data]);

  const selectFromPointer = (clientX: number) => {
    const bounds = chartRef.current?.getBoundingClientRect();
    if (!bounds || data.length === 0) return;
    const fraction = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width));
    setActiveIndex(Math.round(fraction * (data.length - 1)));
  };

  return (
    <section className="min-w-0 border border-foreground bg-card" aria-labelledby="cash-movement-heading">
      <header className="flex flex-col gap-4 border-b border-foreground px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-academic-teal">12-month cash movement</p>
          <h2 id="cash-movement-heading" className="mt-1 text-lg font-semibold tracking-[-0.02em]">Receipts against paid expenses</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Actual collections and bill payments for fiscal year {year}.</p>
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground" aria-hidden="true">
          <span className="inline-flex items-center gap-2"><span className="h-0.5 w-5 bg-academic-teal" />Receipts</span>
          <span className="inline-flex items-center gap-2"><span className="h-0.5 w-5 bg-academic-coral" />Paid out</span>
        </div>
      </header>

      <div className="max-w-full overflow-x-auto px-3 pt-5 sm:px-5">
        <div
          ref={chartRef}
          role="img"
          tabIndex={0}
          aria-label={`Cash movement for ${year}. Use left and right arrow keys to inspect each month.`}
          onPointerMove={(event) => selectFromPointer(event.clientX)}
          onPointerLeave={() => setActiveIndex(null)}
          onBlur={() => setActiveIndex(null)}
          onKeyDown={(event) => {
            if (!data.length) return;
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
              event.preventDefault();
              const current = activeIndex ?? data.length - 1;
              setActiveIndex(Math.min(data.length - 1, Math.max(0, current + (event.key === 'ArrowLeft' ? -1 : 1))));
            } else if (event.key === 'Home') {
              event.preventDefault();
              setActiveIndex(0);
            } else if (event.key === 'End') {
              event.preventDefault();
              setActiveIndex(data.length - 1);
            } else if (event.key === 'Escape') {
              setActiveIndex(null);
            }
          }}
          className="relative min-h-[240px] min-w-[680px] cursor-crosshair outline-none focus-visible:ring-2 focus-visible:ring-academic-teal focus-visible:ring-offset-2 sm:min-w-0"
        >
          <svg viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} className="h-auto min-h-[240px] w-full" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <clipPath id={clipId}>
                <rect
                  x="0"
                  y="0"
                  width={VIEW.width}
                  height={VIEW.height}
                  style={{ transform: mounted ? 'scaleX(1)' : 'scaleX(0)', transformBox: 'fill-box', transformOrigin: 'left' }}
                  className="transition-transform duration-500 ease-out motion-reduce:transition-none"
                />
              </clipPath>
            </defs>

            {ticks.map((tick) => (
              <g key={tick}>
                <line x1={VIEW.left} x2={VIEW.width - VIEW.right} y1={y(tick)} y2={y(tick)} className="stroke-border" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                <text x={VIEW.left - 12} y={y(tick) + 4} textAnchor="end" className="fill-muted-foreground font-mono text-[11px]">{compactMoney(tick, currency)}</text>
              </g>
            ))}

            {data.map((point, index) => (
              <text key={point.label} x={x(index)} y={VIEW.height - 10} textAnchor="middle" className="fill-muted-foreground font-mono text-[10px]">{point.label}</text>
            ))}

            <g clipPath={`url(#${clipId})`}>
              <path d={incomeArea} className="fill-academic-teal/[0.08]" />
              <path d={linePath('income')} fill="none" className="stroke-academic-teal" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <path d={linePath('expenses')} fill="none" className="stroke-academic-coral" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </g>

            {activeIndex !== null && selected && (
              <g>
                <line x1={x(activeIndex)} x2={x(activeIndex)} y1={VIEW.top} y2={VIEW.top + plotHeight} className="stroke-foreground/35" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
                <circle cx={x(activeIndex)} cy={y(selected.income)} r="4" className="fill-academic-teal stroke-card" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                <circle cx={x(activeIndex)} cy={y(selected.expenses)} r="4" className="fill-academic-coral stroke-card" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </g>
            )}
          </svg>

          {activeIndex !== null && selected && (
            <div
              className="pointer-events-none absolute top-2 z-10 min-w-40 -translate-x-1/2 border border-foreground bg-card px-3 py-2 text-xs shadow-none"
              style={{ left: `${Math.min(88, Math.max(12, (x(activeIndex) / VIEW.width) * 100))}%` }}
            >
              <p className="font-semibold">{selected.label} {year}</p>
              <dl className="mt-2 space-y-1 font-mono tabular-nums">
                <div className="flex justify-between gap-5"><dt className="text-muted-foreground">Receipts</dt><dd>{formatMoney(selected.income, currency)}</dd></div>
                <div className="flex justify-between gap-5"><dt className="text-muted-foreground">Paid out</dt><dd>{formatMoney(selected.expenses, currency)}</dd></div>
                <div className="flex justify-between gap-5 border-t border-border pt-1"><dt className="text-muted-foreground">Net</dt><dd className={selected.net >= 0 ? 'text-academic-teal' : 'text-academic-coral'}>{selected.net >= 0 ? '+' : ''}{formatMoney(selected.net, currency)}</dd></div>
              </dl>
            </div>
          )}
        </div>
      </div>

      <div className="grid border-t border-foreground sm:grid-cols-3">
        {stats.map((stat, index) => (
          <div key={stat.label} className={`px-5 py-4 ${index ? 'border-t border-border sm:border-l sm:border-t-0' : ''}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{stat.label}</p>
            <p className={`mt-1 font-mono text-base font-semibold tabular-nums ${stat.signed && stat.value < 0 ? 'text-academic-coral' : 'text-foreground'}`}>
              {stat.signed && stat.value >= 0 ? '+' : ''}{formatMoney(stat.value, currency)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
