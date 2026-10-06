import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { MathText } from '@/src/components/MathText';
import { apiGet, apiSend } from '../../lib/api';
import {
  DeckGate, DeckShell, ModeIntro, ResultSummary, StatePanel,
  formatDuration, shuffle, useDeck, useDeckRoutes,
  type DeckDetail, type FlashCard,
} from './shared';

interface Tile { key: string; cardId: string; text: string; kind: 'term' | 'definition' }

const ABSOLUTE_MAX_PAIRS = 20; // keeps a large deck's board usable on a phone
const SIZE_PRESETS = [
  { label: 'Short', pairs: 4 },
  { label: 'Standard', pairs: 8 },
  { label: 'Long', pairs: 12 },
  { label: 'Marathon', pairs: 16 },
];

function buildBoard(cards: FlashCard[], pairCount: number) {
  const chosen = shuffle(cards).slice(0, pairCount);
  return {
    terms: shuffle(chosen.map<Tile>((c) => ({ key: `${c.id}-term`, cardId: c.id, text: c.term, kind: 'term' }))),
    definitions: shuffle(chosen.map<Tile>((c) => ({ key: `${c.id}-def`, cardId: c.id, text: c.definition, kind: 'definition' }))),
  };
}

export default function FlashcardMatch() {
  const { id } = useParams<{ id: string }>();
  const routes = useDeckRoutes(id);
  const { deck, status, reload } = useDeck(id);
  return (
    <DeckGate status={status} deck={deck} reload={reload} listUrl={routes.list}>
      {(loaded) => (
        <DeckShell deck={loaded} routes={routes}>
          {loaded.cards.length < 2
            ? <StatePanel title="Match needs at least 2 cards" body="Add more cards to this deck, or study it with flashcards for now." />
            : <Match key={loaded.id} deck={loaded} routes={routes} />}
        </DeckShell>
      )}
    </DeckGate>
  );
}

function Match({ deck, routes }: { deck: DeckDetail; routes: ReturnType<typeof useDeckRoutes> }) {
  const maxPairs = Math.min(deck.cards.length, ABSOLUTE_MAX_PAIRS);
  const [pairCount, setPairCount] = useState(maxPairs >= 8 ? 8 : maxPairs);
  const [playing, setPlaying] = useState(false);
  const [board, setBoard] = useState<{ terms: Tile[]; definitions: Tile[] }>({ terms: [], definitions: [] });
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Tile | null>(null);
  const [wrong, setWrong] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [best, setBest] = useState<{ score: number; total: number; durationMs: number | null } | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const loadBest = () => {
    apiGet<{ bestByMode: Record<string, { score: number; total: number; durationMs: number | null }> }>(`/api/flashcards/decks/${deck.id}/attempts`)
      .then((r) => setBest(r?.bestByMode?.MATCH ?? null))
      .catch(() => {});
  };
  useEffect(() => { if (routes.isStudentRoute) loadBest(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [deck.id]);

  useEffect(() => {
    if (!startedAt || finished) return;
    const tick = setInterval(() => setElapsed(Date.now() - startedAt), 250);
    return () => clearInterval(tick);
  }, [startedAt, finished]);

  const totalPairs = board.terms.length;
  const presets = useMemo(() => {
    const list = SIZE_PRESETS.filter((p) => p.pairs <= maxPairs);
    if (!list.some((p) => p.pairs === maxPairs)) list.push({ label: 'Whole deck', pairs: maxPairs });
    return list;
  }, [maxPairs]);

  const start = () => {
    setBoard(buildBoard(deck.cards, pairCount));
    setMatched(new Set()); setSelected(null); setWrong([]); setMistakes(0);
    setStartedAt(null); setElapsed(0); setFinished(false); setAnnouncement('');
    setPlaying(true);
  };

  const pick = (tile: Tile) => {
    if (finished || matched.has(tile.cardId) || wrong.length) return;
    const now = Date.now();
    if (!startedAt) setStartedAt(now);
    if (!selected || selected.kind === tile.kind) { setSelected(selected?.key === tile.key ? null : tile); return; }

    if (selected.cardId === tile.cardId) {
      const next = new Set(matched).add(tile.cardId);
      setMatched(next);
      setSelected(null);
      setAnnouncement(`Matched. ${next.size} of ${totalPairs} pairs.`);
      if (next.size === totalPairs) {
        const durationMs = now - (startedAt ?? now);
        setElapsed(durationMs);
        setFinished(true);
        requestAnimationFrame(() => resultRef.current?.querySelector<HTMLElement>('#result-heading')?.focus());
        if (routes.isStudentRoute) {
          apiSend(`/api/flashcards/decks/${deck.id}/attempts`, 'POST', { mode: 'MATCH', score: Math.max(0, totalPairs - mistakes), total: totalPairs, durationMs })
            .then(loadBest)
            .catch(() => toast.error('Your match result could not be saved'));
        }
      }
    } else {
      setMistakes((m) => m + 1);
      setWrong([selected.key, tile.key]);
      setAnnouncement('Not a pair. Try again.');
      setTimeout(() => { setWrong([]); setSelected(null); }, 650);
    }
  };

  if (!playing) {
    return (
      <ModeIntro title="Match terms to definitions" action={<Button size="lg" onClick={start} className="w-full sm:w-auto">Start · {pairCount} pairs</Button>}>
        <p className="text-sm text-muted-foreground">Pick a term, then the definition that goes with it. The clock starts on your first pick.</p>
        <fieldset>
          <legend className="text-sm font-semibold text-foreground">Length</legend>
          <div className="mt-2 grid grid-cols-2 border-l border-t border-border sm:grid-cols-4" role="radiogroup">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                role="radio"
                aria-checked={pairCount === p.pairs}
                onClick={() => setPairCount(p.pairs)}
                className={`min-h-16 border-b border-r border-border px-3 py-3 text-left transition-colors ${pairCount === p.pairs ? 'bg-accent text-accent-foreground' : 'bg-card text-foreground hover:bg-muted/50'}`}
              >
                <span className="block text-sm font-semibold">{p.label}</span>
                <span className="block text-sm tabular-nums text-muted-foreground">{p.pairs} pairs</span>
              </button>
            ))}
          </div>
          {deck.cards.length > ABSOLUTE_MAX_PAIRS && <p className="mt-2 text-xs text-muted-foreground">Games use at most {ABSOLUTE_MAX_PAIRS} pairs; cards are picked at random each time.</p>}
        </fieldset>
        {best && (
          <p className="text-sm text-muted-foreground">
            Your best: <span className="font-semibold tabular-nums text-foreground">{best.durationMs != null ? formatDuration(best.durationMs) : '—'}</span> with {best.total - best.score} mistake{best.total - best.score === 1 ? '' : 's'}
          </p>
        )}
      </ModeIntro>
    );
  }

  if (finished) {
    return (
      <div ref={resultRef}>
        <ResultSummary
          heading={mistakes === 0 ? 'A clean board.' : `All ${totalPairs} pairs matched.`}
          stats={[
            { label: 'Time', value: formatDuration(elapsed), strong: true },
            { label: 'Pairs', value: String(totalPairs) },
            { label: 'Mistakes', value: String(mistakes) },
            { label: 'Your best', value: best?.durationMs != null ? formatDuration(best.durationMs) : '—' },
          ]}
          actions={<>
            <Button onClick={start}>Play again</Button>
            <Button variant="outline" onClick={() => setPlaying(false)}>Change length</Button>
            <Button variant="ghost" render={<Link to={routes.study} />} nativeButton={false}>Back to the cards</Button>
          </>}
        />
      </div>
    );
  }

  const column = (tiles: Tile[], label: string) => (
    <div role="group" aria-label={label} className="grid content-start gap-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {tiles.map((tile) => {
        const isMatched = matched.has(tile.cardId);
        const isSelected = selected?.key === tile.key;
        const isWrong = wrong.includes(tile.key);
        return (
          <button
            key={tile.key}
            type="button"
            onClick={() => pick(tile)}
            disabled={isMatched}
            aria-pressed={isSelected}
            className={`relative min-h-14 border px-3 py-2.5 text-left text-sm transition-colors duration-150 [overflow-wrap:anywhere] ${
              isMatched ? 'border-border bg-muted/40 text-muted-foreground' :
              isWrong ? 'border-destructive bg-destructive/10 text-foreground' :
              isSelected ? 'border-academic-teal bg-accent text-accent-foreground' :
              'border-input bg-card text-foreground hover:border-foreground'
            } ${tile.kind === 'term' ? 'font-semibold' : ''}`}
          >
            {isMatched && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] bg-academic-teal" />}
            <MathText>{tile.text}</MathText>
            {isMatched && <span className="sr-only"> (matched)</span>}
          </button>
        );
      })}
    </div>
  );

  return (
    <section aria-label="Match board">
      <div className="flex items-center justify-between gap-3 border-b border-foreground pb-2 text-sm">
        <span className="font-semibold tabular-nums text-foreground" aria-label={`Time ${formatDuration(elapsed)}`}>{formatDuration(elapsed)}</span>
        <span className="tabular-nums text-muted-foreground">{matched.size} / {totalPairs} matched · {mistakes} mistake{mistakes === 1 ? '' : 's'}</span>
      </div>
      <p className="sr-only" aria-live="polite">{announcement}</p>
      <div className="mt-4 grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 sm:gap-6">
        {column(board.terms, 'Terms')}
        {column(board.definitions, 'Definitions')}
      </div>
      <div className="mt-6 flex justify-end">
        <Button variant="ghost" onClick={() => setPlaying(false)}>Stop and change length</Button>
      </div>
    </section>
  );
}
