import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Grid3x3, RotateCw, Brain, Timer, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { apiGet } from '../../lib/api';

interface CardT { id: string; term: string; definition: string }
interface DeckDetail { id: string; title: string; cards: CardT[] }
interface Tile { key: string; cardId: string; text: string; kind: 'term' | 'definition' }

const MAX_PAIRS = 8; // keeps the grid reasonable even for large decks

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildTiles(cards: CardT[]): Tile[] {
  const chosen = shuffle(cards).slice(0, MAX_PAIRS);
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

  const [deck, setDeck] = useState<DeckDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string[]>([]);
  const [wrongPair, setWrongPair] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!id) return;
    apiGet<DeckDetail>(`/api/flashcards/decks/${id}`)
      .then((d) => { setDeck(d); setTiles(buildTiles(d.cards || [])); })
      .catch((e: any) => toast.error(e?.message || 'Failed to load deck'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!startedAt || finished) return;
    tickRef.current = setInterval(() => setElapsed(Date.now() - startedAt), 250);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [startedAt, finished]);

  const totalPairs = useMemo(() => tiles.length / 2, [tiles.length]);

  const reset = () => {
    if (!deck) return;
    setTiles(buildTiles(deck.cards));
    setMatched(new Set());
    setSelected([]);
    setWrongPair([]);
    setMistakes(0);
    setStartedAt(null);
    setElapsed(0);
    setFinished(false);
  };

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
        </div>
      </div>

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
          <p className="text-sm text-slate-500">{mistakes} mistake{mistakes === 1 ? '' : 's'}</p>
          <div className="flex justify-center gap-3 pt-2">
            <Button variant="outline" onClick={reset}><RotateCw className="mr-2 h-4 w-4" /> Play Again</Button>
            <Button render={<Link to={listUrl} />}>Back to Flashcards</Button>
          </div>
        </div>
      ) : (
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
                {t.text}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
