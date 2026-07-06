import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Shuffle, RotateCw, ChevronLeft, ChevronRight, Layers, Brain, Grid3x3, SpellCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { apiGet } from '../../lib/api';

interface Card { id: string; term: string; definition: string }
interface DeckDetail {
  id: string; title: string; description: string | null;
  teacherName: string; subject: { id: string; name: string } | null;
  cards: Card[];
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function StudentFlashcardStudy() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  // This page is mounted at both /flashcards/:id/study (teacher/admin
  // preview) and /student/flashcards/:id (a student's own assigned deck) --
  // work out where "back" and the other study-mode links should point from
  // the current URL rather than hard-coding one role's paths.
  const isStudentRoute = location.pathname.startsWith('/student/');
  const listUrl = isStudentRoute ? '/student/flashcards' : '/flashcards';
  const quizUrl = isStudentRoute ? `/student/flashcards/${id}/quiz` : `/flashcards/${id}/quiz`;
  const matchUrl = isStudentRoute ? `/student/flashcards/${id}/match` : `/flashcards/${id}/match`;
  const spellUrl = isStudentRoute ? `/student/flashcards/${id}/spell` : `/flashcards/${id}/spell`;
  const [deck, setDeck] = useState<DeckDetail | null>(null);
  const [order, setOrder] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiGet<DeckDetail>(`/api/flashcards/decks/${id}`)
      .then((d) => { setDeck(d); setOrder(d.cards || []); })
      .catch((e: any) => toast.error(e?.message || 'Failed to load deck'))
      .finally(() => setLoading(false));
  }, [id]);

  const current = order[index];
  const progress = useMemo(() => (order.length ? Math.round(((index + 1) / order.length) * 100) : 0), [index, order.length]);

  const goNext = () => { setFlipped(false); setIndex((i) => Math.min(i + 1, order.length - 1)); };
  const goPrev = () => { setFlipped(false); setIndex((i) => Math.max(i - 1, 0)); };
  const reshuffle = () => { setFlipped(false); setIndex(0); setOrder((prev) => shuffleArray(prev)); };
  const restartInOrder = () => { setFlipped(false); setIndex(0); setOrder(deck?.cards || []); };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="animate-spin rounded-full h-6 w-6 border-2 border-aubergine-600 border-t-transparent mr-2"></span>
        <span className="text-slate-500">Loading deck…</span>
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

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" render={<Link to={listUrl} />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-[160px]">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-aubergine-600" /> {deck.title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">By {deck.teacherName || 'Teacher'}{deck.subject ? ` · ${deck.subject.name}` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" render={<Link to={quizUrl} />}><Brain className="mr-1.5 h-3.5 w-3.5" /> Quiz</Button>
          <Button size="sm" variant="outline" render={<Link to={matchUrl} />}><Grid3x3 className="mr-1.5 h-3.5 w-3.5" /> Match</Button>
          <Button size="sm" variant="outline" render={<Link to={spellUrl} />}><SpellCheck className="mr-1.5 h-3.5 w-3.5" /> Spell</Button>
        </div>
      </div>

      {order.length === 0 ? (
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-12 text-center text-slate-500">
          This deck has no cards yet.
        </div>
      ) : (
        <>
          <div className="h-1.5 w-full bg-slate-100 dark:bg-surface-raised rounded-full overflow-hidden">
            <div className="h-full bg-aubergine-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-center text-sm text-slate-500">Card {index + 1} of {order.length}</p>

          {/* Flip card */}
          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            className="w-full [perspective:1200px] group"
            aria-label="Flip card"
          >
            <div
              className="relative w-full min-h-[260px] transition-transform duration-500 [transform-style:preserve-3d]"
              style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
            >
              <div className="absolute inset-0 flex items-center justify-center p-8 rounded-2xl border border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo shadow-sm [backface-visibility:hidden]">
                <p className="text-xl font-semibold text-slate-900 dark:text-white text-center">{current?.term}</p>
              </div>
              <div
                className="absolute inset-0 flex items-center justify-center p-8 rounded-2xl border border-aubergine-200 dark:border-aubergine-900/40 bg-aubergine-50 dark:bg-aubergine-900/10 shadow-sm [backface-visibility:hidden]"
                style={{ transform: 'rotateY(180deg)' }}
              >
                <p className="text-lg text-slate-700 dark:text-slate-200 text-center">{current?.definition}</p>
              </div>
            </div>
          </button>
          <p className="text-center text-xs text-slate-400">Tap the card to flip it</p>

          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" onClick={goPrev} disabled={index === 0}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Prev
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={reshuffle} title="Shuffle">
                <Shuffle className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={restartInOrder} title="Restart in order">
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={goNext} disabled={index === order.length - 1}>
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
