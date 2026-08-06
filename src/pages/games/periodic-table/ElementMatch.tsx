import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Blocks, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CATEGORY_STYLES, randomElements, type PeriodicElement } from '@/shared/periodicTable';

const PAIR_COUNT = 8;

interface Card {
  key: string;
  elementNumber: number;
  label: string;
  kind: 'symbol' | 'name';
}

function buildDeck(): { cards: Card[]; elements: PeriodicElement[] } {
  const elements = randomElements(PAIR_COUNT);
  const cards: Card[] = elements.flatMap((element) => [
    { key: `${element.number}-symbol`, elementNumber: element.number, label: element.symbol, kind: 'symbol' as const },
    { key: `${element.number}-name`, elementNumber: element.number, label: element.name, kind: 'name' as const },
  ]);
  return { cards: cards.sort(() => Math.random() - 0.5), elements };
}

export default function ElementMatchPage() {
  const navigate = useNavigate();
  const [{ cards, elements }, setDeck] = useState(() => buildDeck());
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [busy, setBusy] = useState(false);
  const resolveTimeout = useRef<number | null>(null);

  useEffect(() => () => {
    if (resolveTimeout.current) window.clearTimeout(resolveTimeout.current);
  }, []);

  const elementByNumber = new Map(elements.map((element) => [element.number, element]));
  const complete = matched.size === cards.length;

  const flip = (card: Card) => {
    if (busy || flipped.includes(card.key) || matched.has(card.key)) return;
    const nextFlipped = [...flipped, card.key];
    setFlipped(nextFlipped);
    if (nextFlipped.length === 2) {
      setBusy(true);
      setMoves((value) => value + 1);
      const [firstKey, secondKey] = nextFlipped;
      const first = cards.find((c) => c.key === firstKey)!;
      const second = cards.find((c) => c.key === secondKey)!;
      const isMatch = first.elementNumber === second.elementNumber && first.kind !== second.kind;
      resolveTimeout.current = window.setTimeout(() => {
        if (isMatch) {
          setMatched((current) => new Set([...current, firstKey, secondKey]));
        }
        setFlipped([]);
        setBusy(false);
      }, isMatch ? 500 : 900);
    }
  };

  const playAgain = () => {
    if (resolveTimeout.current) window.clearTimeout(resolveTimeout.current);
    setDeck(buildDeck());
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Blocks className="size-6" />
          Element Match
        </h1>
        <Button variant="outline" onClick={() => navigate('/games/periodic-table')}>{'◀ Back'}</Button>
      </div>

      <p className="mb-4 text-sm text-slate-500 dark:text-slate-300">
        Flip two cards at a time. Match each element's symbol with its name. Moves: <strong>{moves}</strong> &middot; Matched: <strong>{matched.size / 2} / {PAIR_COUNT}</strong>
      </p>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {cards.map((card) => {
          const isFlipped = flipped.includes(card.key) || matched.has(card.key);
          const isMatched = matched.has(card.key);
          const element = elementByNumber.get(card.elementNumber);
          const style = element ? CATEGORY_STYLES[element.category] : null;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => flip(card)}
              disabled={isMatched || (busy && !isFlipped)}
              className={`flex aspect-[3/4] flex-col items-center justify-center rounded-xl border-2 p-2 text-center font-black transition-all duration-200 ${
                isMatched
                  ? `${style?.bg} ${style?.text} ${style?.border} opacity-70`
                  : isFlipped
                    ? `${style?.bg} ${style?.text} ${style?.border}`
                    : `border-slate-300 bg-slate-100 text-transparent dark:border-surface-raised dark:bg-surface-raised ${busy ? 'cursor-default' : 'hover:-translate-y-0.5'}`
              }`}
            >
              {isFlipped ? (
                <span className={card.kind === 'symbol' ? 'text-lg sm:text-xl' : 'text-[10px] leading-tight sm:text-xs'}>{card.label}</span>
              ) : (
                <Blocks className="size-5 opacity-30" />
              )}
            </button>
          );
        })}
      </div>

      {complete && (
        <div className="mt-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <p className="flex items-center justify-center gap-2 text-lg font-black text-emerald-800 dark:text-emerald-300">
            <Check className="size-5" /> Solved in {moves} moves!
          </p>
          <Button className="mt-4" onClick={playAgain}>Play again</Button>
        </div>
      )}
    </div>
  );
}
