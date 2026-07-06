import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Grid3x3, RotateCw, Brain, Timer, Trophy, SpellCheck, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { MathText } from '@/src/components/MathText';
import { apiGet, apiSend } from '../../lib/api';

interface CardT { id: string; term: string; definition: string; imageUrl?: string | null }
interface DeckDetail { id: string; title: string; cards: CardT[] }
interface Tile { key: string; cardId: string; text: string; kind: 'term' | 'definition' }

const ABSOLUTE_MAX_PAIRS = 20; // keeps even a huge deck's grid from becoming unusable
const SIZE_PRESETS: { key: string; label: string; pairs: number }[] = [
  { key: 'easy', label: 'Easy', pairs: 4 },
  { key: 'medium', label: 'Medium', pairs: 8 },
  { key: 'hard', label: 'Hard', pairs: 12 },
  { key: 'expert', label: 'Expert', pairs: 16 },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildTiles(cards: CardT[], pairCount: number): Tile[] {
  const chosen = shuffle(cards).slice(0, pairCount);
  const tiles: Tile[] = [];
  for (const c of chosen) {
    tiles.push({ key: `${c.id}-term`, cardId: c.id, text: c.term, kind: 'term' });
    tiles.push({ key: `${c.id}-def`, cardId: c.id, text: c.definition, kind: 'definition' });
  }
  return shuffle(tiles);
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export default function FlashcardMatch() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const isStudentRoute = location.pathname.startsWith('/student/');
  const listUrl = isStudentRoute ? '/student/flashcards' : '/flashcards';
  const studyUrl = isStudentRoute ? `/student/flashcards/${id}` : `/flashcards/${id}/study`;
  const quizUrl = isStudentRoute ? `/student/flashcards/${id}/quiz` : `/flashcards/${id}/quiz`;
  const spellUrl = isStudentRoute ? `/student/flashcards/${id}/spell` : `/flashcards/${id}/spell`;

  const [deck, setDeck] = useState<DeckDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [pairCount, setPairCount] = useState(8);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string[]>([]);
  const [wrongPair, setWrongPair] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [bestRun, setBestRun] = useState<{ score: number; total: number; durationMs: number | null } | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!id) return;
    apiGet<DeckDetail>(`/api/flashcards/decks/${id}`)
      .then((d) => {
        setDeck(d);
        const maxPairs = Math.min(d.cards?.length || 0, ABSOLUTE_MAX_PAIRS);
        // Default to Medium if the deck can support it, otherwise the
        // largest preset (or the deck's full size) that still fits.
        const defaultPairs = maxPairs >= 8 ? 8 : maxPairs;
        setPairCount(defaultPairs);
      })
      .catch((e: any) => toast.error(e?.message || 'Failed to load deck'))
      .finally(() => setLoading(false));
    if (isStudentRoute) loadBest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadBest = () => {
    if (!id) return;
    apiGet<{ bestByMode: Record<string, { score: number; total: number; durationMs: number | null }> }>(`/api/flashcards/decks/${id}/attempts`)
      .then((r) => setBestRun(r?.bestByMode?.MATCH ?? null))
      .catch(() => {});
  };

  useEffect(() => {
    if (!startedAt || finished) return;
    tickRef.current = setInterval(() => setElapsed(Date.now() - startedAt), 250);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [startedAt, finished]);

  const totalPairs = useMemo(() => tiles.length / 2, [tiles.length]);
  const maxPairs = deck ? Math.min(deck.cards.length, ABSOLUTE_MAX_PAIRS) : ABSOLUTE_MAX_PAIRS;

  const startGame = () => {
    if (!deck) return;
    setTiles(buildTiles(deck.cards, pairCount));
    setMatched(new Set());
    setSelected([]);
    setWrongPair([]);
    setMistakes(0);
    setStartedAt(null);
    setElapsed(0);
    setFinished(false);
    setGameStarted(true);
  };

  const reset = () => startGame();

  const clickTile = (tile: Tile) => {
    if (finished || matched.has(tile.cardId) || wrongPair.length > 0) return;
    if (!startedAt) setStartedAt(Date.now());
    if (selected.includes(tile.key)) return;

    if (selected.length === 0) {
      setSelected([tile.key]);
      return;
    }

    const firstKey = selected[0];
    const first = tiles.find((t) => t.key === firstKey)!;
    if (first.cardId === tile.cardId && first.kind !== tile.kind) {
      // Match!
      const nextMatched = new Set(matched).add(tile.cardId);
      setMatched(nextMatched);
      setSelected([]);
      if (nextMatched.size === totalPairs) {
        setFinished(true);
        if (tickRef.current) clearInterval(tickRef.current);
        if (isStudentRoute && id && startedAt) {
          const durationMs = Date.now() - startedAt;
          const score = Math.max(0, totalPairs - mistakes);
          apiSend(`/api/flashcards/decks/${id}/attempts`, 'POST', { mode: 'MATCH', score, total: totalPairs, durationMs })
            .then(loadBest)
            .catch(() => {});
        }
      }
    } else {
      setMistakes((m) => m + 1);
      setWrongPair([firstKey, tile.key]);
      setSelected([firstKey, tile.key]);
      setTimeout(() => { setWrongPair([]); setSelected([]); }, 600);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="animate-spin rounded-full h-6 w-6 border-2 border-aubergine-600 border-t-transparent mr-2"></span>
        <span className="text-slate-500">Loading match game…</span>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p>Deck not found, or it isn't assigned to your class.</p>
        <Button variant="outline" className="mt-4" render={<Link to={listUrl} />}>Back to Flashcards</Button>
      </div>
    );
  }

  if (deck.cards.length < 2) {
    return (
      <div className="max-w-xl mx-auto text-center py-12 text-slate-500 space-y-4">
        <Grid3x3 className="h-10 w-10 mx-auto text-slate-300" />
        <p>Match mode needs at least 2 cards in this deck.</p>
        <Button variant="outline" render={<Link to={listUrl} />}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Flashcards</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" render={<Link to={listUrl} />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-[160px]">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Grid3x3 className="h-5 w-5 text-aubergine-600" /> {deck.title} — Match
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" render={<Link to={studyUrl} />}>Study</Button>
          <Button size="sm" variant="outline" render={<Link to={quizUrl} />}><Brain className="mr-1.5 h-3.5 w-3.5" /> Quiz</Button>
          <Button size="sm" variant="outline" render={<Link to={spellUrl} />}><SpellCheck className="mr-1.5 h-3.5 w-3.5" /> Spell</Button>
        </div>
      </div>

      {!gameStarted ? (
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-aubergine-600" />
            <h2 className="font-semibold text-slate-900 dark:text-white">Difficulty / grid size</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SIZE_PRESETS.filter((p) => p.pairs <= maxPairs).map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPairCount(p.pairs)}
                className={`rounded-lg border px-3 py-3 text-center transition-colors ${
                  pairCount === p.pairs
                    ? 'border-aubergine-400 bg-aubergine-50 dark:bg-aubergine-900/10 text-aubergine-800 dark:text-aubergine-300'
                    : 'border-slate-200 dark:border-surface-raised hover:border-aubergine-300 text-slate-700 dark:text-slate-200'
                }`}
              >
                <p className="text-sm font-semibold">{p.label}</p>
                <p className="text-xs text-slate-400">{p.pairs} pairs</p>
              </button>
            ))}
            {maxPairs > 0 && !SIZE_PRESETS.some((p) => p.pairs === maxPairs && p.pairs <= maxPairs) && (
              <button
                type="button"
                onClick={() => setPairCount(maxPairs)}
                className={`rounded-lg border px-3 py-3 text-center transition-colors ${
                  pairCount === maxPairs
                    ? 'border-aubergine-400 bg-aubergine-50 dark:bg-aubergine-900/10 text-aubergine-800 dark:text-aubergine-300'
                    : 'border-slate-200 dark:border-surface-raised hover:border-aubergine-300 text-slate-700 dark:text-slate-200'
                }`}
              >
                <p className="text-sm font-semibold">All Cards</p>
                <p className="text-xs text-slate-400">{maxPairs} pairs</p>
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400">
            This deck has {deck.cards.length} card{deck.cards.length === 1 ? '' : 's'}
            {maxPairs < deck.cards.length ? ` (grids are capped at ${ABSOLUTE_MAX_PAIRS} pairs).` : '.'} More pairs means a bigger grid and a harder game.
          </p>
          <Button onClick={startGame} className="w-full">Start Game</Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span className="flex items-center gap-1.5"><Timer className="h-4 w-4" /> {formatTime(elapsed)}</span>
            <span>Matched {matched.size} / {totalPairs}</span>
            <span>Mistakes {mistakes}</span>
          </div>

          {finished ? (
            <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm p-8 text-center space-y-4">
              <Trophy className="h-10 w-10 mx-auto text-amber-500" />
              <p className="text-sm text-slate-500 uppercase tracking-widest font-semibold">Match Complete</p>
              <p className="text-3xl font-bold text-aubergine-600">{formatTime(elapsed)}</p>
              <p className="text-sm text-slate-500">{mistakes} mistake{mistakes === 1 ? '' : 's'} · {totalPairs} pairs</p>
              {isStudentRoute && bestRun && (
                <p className="text-xs text-slate-400">
                  Personal best: {bestRun.total - bestRun.score} mistake{bestRun.total - bestRun.score === 1 ? '' : 's'}
                  {bestRun.durationMs != null ? ` in ${formatTime(bestRun.durationMs)}` : ''}
                </p>
              )}
              <div className="flex justify-center gap-3 pt-2">
                <Button variant="outline" onClick={() => setGameStarted(false)}><Settings2 className="mr-2 h-4 w-4" /> Change Size</Button>
                <Button variant="outline" onClick={reset}><RotateCw className="mr-2 h-4 w-4" /> Play Again</Button>
                <Button render={<Link to={listUrl} />}>Back to Flashcards</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {tiles.map((t) => {
                  const isMatched = matched.has(t.cardId);
                  const isSelected = selected.includes(t.key);
                  const isWrong = wrongPair.includes(t.key);
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => clickTile(t)}
                      disabled={isMatched}
                      className={`min-h-[90px] rounded-lg border p-3 text-xs sm:text-sm text-center flex items-center justify-center transition-colors ${
                        isMatched ? 'opacity-0 pointer-events-none' :
                        isWrong ? 'border-rose-400 bg-rose-50 dark:bg-rose-900/10 text-rose-700 dark:text-rose-300' :
                        isSelected ? 'border-aubergine-400 bg-aubergine-50 dark:bg-aubergine-900/10 text-aubergine-800 dark:text-aubergine-300' :
                        'border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo hover:border-aubergine-300'
                      }`}
                    >
                      <MathText>{t.text}</MathText>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-center">
                <Button variant="ghost" size="sm" onClick={() => setGameStarted(false)}><Settings2 className="mr-1.5 h-3.5 w-3.5" /> Change Size</Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
