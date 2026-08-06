import { PERIODIC_ELEMENTS, CATEGORY_STYLES, type PeriodicElement } from '@/shared/periodicTable';

export type ElementTileState = 'default' | 'correct' | 'wrong' | 'target' | 'dimmed';

interface PeriodicTableGridProps {
  onTileClick?: (element: PeriodicElement) => void;
  tileState?: (element: PeriodicElement) => ElementTileState;
  /** Compact mode uses smaller tiles for embedding inside a game screen. */
  size?: 'md' | 'sm';
}

const STATE_CLASSES: Record<ElementTileState, string> = {
  default: '',
  correct: 'ring-4 ring-emerald-500 scale-[1.06] z-10',
  wrong: 'ring-4 ring-rose-500',
  target: 'ring-4 ring-amber-400 scale-[1.06] z-10',
  dimmed: 'opacity-30 saturate-50',
};

/**
 * Renders the full 118-element periodic table as a CSS grid: the main
 * 7-period x 18-group table, with the lanthanide/actinide series shown as a
 * two-row strip below (a blank spacer row separates them, matching the
 * layout of a standard classroom wall chart).
 */
export function PeriodicTableGrid({ onTileClick, tileState, size = 'md' }: PeriodicTableGridProps) {
  const tileSize = size === 'sm' ? 'min-w-[2.4rem] p-0.5 text-[8px]' : 'min-w-[3rem] p-1 text-[9px] sm:min-w-[3.6rem] sm:text-[10px]';
  const numberSize = size === 'sm' ? 'text-[6px]' : 'text-[7px] sm:text-[8px]';
  const symbolSize = size === 'sm' ? 'text-xs' : 'text-sm sm:text-base';

  return (
    <div
      className="grid gap-0.5 sm:gap-1"
      style={{ gridTemplateColumns: 'repeat(18, minmax(0, 1fr))', gridTemplateRows: 'repeat(10, auto)' }}
    >
      {PERIODIC_ELEMENTS.map((element) => {
        const style = CATEGORY_STYLES[element.category];
        const state = tileState?.(element) ?? 'default';
        const row = element.group != null ? element.period : element.category === 'lanthanide' ? 9 : 10;
        const col = element.group != null ? element.group : 3 + (element.seriesIndex ?? 1) - 1;
        const interactive = Boolean(onTileClick);
        return (
          <button
            key={element.number}
            type="button"
            disabled={!interactive}
            onClick={() => onTileClick?.(element)}
            style={{ gridColumn: col, gridRow: row }}
            className={`relative flex aspect-square flex-col items-center justify-center rounded-sm border transition-transform duration-150 ${tileSize} ${style.bg} ${style.text} ${style.border} ${STATE_CLASSES[state]} ${interactive ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : 'cursor-default'}`}
            aria-label={`${element.name} (${element.symbol}), atomic number ${element.number}`}
          >
            <span className={`font-semibold leading-none opacity-70 ${numberSize}`}>{element.number}</span>
            <span className={`font-black leading-tight ${symbolSize}`}>{element.symbol}</span>
          </button>
        );
      })}
    </div>
  );
}

export default PeriodicTableGrid;
