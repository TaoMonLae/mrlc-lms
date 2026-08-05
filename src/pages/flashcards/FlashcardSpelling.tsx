import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { ArrowLeft, SpellCheck, Volume2, CheckCircle2, XCircle, RotateCw, Brain, Grid3x3 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiGet, apiSend } from '../../lib/api';
import { MathText } from '@/src/components/MathText';

interface CardT { id: string; term: string; definition: string; imageUrl?: string | null }
interface DeckDetail { id: string; title: string; cards: CardT[] }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Loose-but-meaningful equality: ignores case, surrounding whitespace, and
// collapses repeated internal spaces, so "  Photo Synthesis" still matches
// "Photo synthesis" without accepting genuinely different words.
function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    toast.error("This browser can't read words aloud");
    return;
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.85;
  window.speechSynthesis.speak(utter);
}

export default function FlashcardSpelling() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const isStudentRoute = location.pathname.startsWith('/student/');
  const listUrl = isStudentRoute ? '/student/flashcards' : '/flashcards';
  const studyUrl = isStudentRoute ? `/student/flashcards/${id}` : `/flashcards/${id}/study`;
  const quizUrl = isStudentRoute ? `/student/flashcards/${id}/quiz` : `/flashcards/${id}/quiz`;
  const matchUrl = isStudentRoute ? `/student/flashcards/${id}/match` : `/flashcards/${id}/match`;

  const [deck, setDeck] = useState<DeckDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<CardT[]>([]);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [checked, setChecked] = useState<{ correct: boolean } | null>(null);
  const [answers, setAnswers] = useState<{ term: string; typed: string; correct: boolean }[]>([]);
  const [finished, setFinished] = useState(false);
  const [bestScore, setBestScore] = useState<{ score: number; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const startedAtRef = useRef<number | null>(null);
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setDeck(null);
    setOrder([]);
    setIndex(0);
    setAnswers([]);
    setFinished(false);
    setBestScore(null);
    apiGet<DeckDetail>(`/api/flashcards/decks/${id}`)
      .then((d) => { setDeck(d); setOrder(shuffle(d.cards || [])); startedAtRef.current = Date.now(); })
      .catch((e: any) => toast.error(e?.message || 'Failed to load deck'))
      .finally(() => setLoading(false));
    if (isStudentRoute) loadBest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isStudentRoute]);

  const loadBest = () => {
    if (!id) return;
    apiGet<{ bestByMode: Record<string, { score: number; total: number }> }>(`/api/flashcards/decks/${id}/attempts`)
      .then((r) => setBestScore(r?.bestByMode?.SPELL ? { score: r.bestByMode.SPELL.score, total: r.bestByMode.SPELL.total } : null))
      .catch(() => {});
  };

  const current = order[index];

  // Read the term aloud automatically each time a new card comes up -- the
  // whole point of spelling mode is hearing it before you see it.
  useEffect(() => {
    if (current && !checked && speechSupported) speak(current.term);
    inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, order.length, speechSupported]);

  const score = useMemo(() => answers.filter((a) => a.correct).length, [answers]);

  const submit = () => {
    if (!current || checked) return;
    const correct = normalize(input) === normalize(current.term);
    setChecked({ correct });
    setAnswers((prev) => [...prev, { term: current.term, typed: input, correct }]);
  };

  const next = () => {
    setInput('');
    setChecked(null);
    if (index + 1 >= order.length) {
      const finalScore = answers.filter((a) => a.correct).length;
      setFinished(true);
      if (isStudentRoute && id) {
        const durationMs = startedAtRef.current ? Date.now() - startedAtRef.current : null;
        apiSend(`/api/flashcards/decks/${id}/attempts`, 'POST', { mode: 'SPELL', score: finalScore, total: order.length, durationMs })
          .then(loadBest)
          .catch(() => toast.error('Your spelling result could not be saved'));
      }
      return;
    }
    setIndex((i) => i + 1);
  };

  const restart = () => {
    if (!deck) return;
    setOrder(shuffle(deck.cards));
    setIndex(0); setInput(''); setChecked(null); setAnswers([]); setFinished(false);
    startedAtRef.current = Date.now();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="animate-spin rounded-full h-6 w-6 border-2 border-aubergine-600 border-t-transparent mr-2"></span>
        <span className="text-slate-500">Loading spelling quiz…</span>
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

  if (deck.cards.length < 1) {
    return (
      <div className="max-w-xl mx-auto text-center py-12 text-slate-500 space-y-4">
        <SpellCheck className="h-10 w-10 mx-auto text-slate-300" />
        <p>This deck has no cards to spell yet.</p>
        <Button variant="outline" render={<Link to={listUrl} />}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Flashcards</Button>
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
            <SpellCheck className="h-5 w-5 text-aubergine-600" /> {deck.title} — Spelling
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" render={<Link to={studyUrl} />}>Study</Button>
          <Button size="sm" variant="outline" render={<Link to={quizUrl} />}><Brain className="mr-1.5 h-3.5 w-3.5" /> Quiz</Button>
          <Button size="sm" variant="outline" render={<Link to={matchUrl} />}><Grid3x3 className="mr-1.5 h-3.5 w-3.5" /> Match</Button>
        </div>
      </div>

      {finished ? (
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm p-8 text-center space-y-4">
          <p className="text-sm text-slate-500 uppercase tracking-widest font-semibold">Spelling Quiz Complete</p>
          <p className="text-4xl font-bold text-aubergine-600">{score} / {answers.length}</p>
          <p className="text-sm text-slate-500">{Math.round((score / answers.length) * 100)}% spelled correctly</p>
          {isStudentRoute && bestScore && (
            <p className="text-xs text-slate-400">Personal best: {bestScore.score} / {bestScore.total} ({Math.round((bestScore.score / bestScore.total) * 100)}%)</p>
          )}

          {answers.some((a) => !a.correct) && (
            <div className="text-left mt-6 space-y-2">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Words to practice</p>
              {answers.filter((a) => !a.correct).map((a, i) => (
                <div key={i} className="rounded-lg border border-rose-200 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-900/10 p-3 text-sm">
                  <p className="text-rose-600">You typed: {a.typed || '(nothing)'}</p>
                  <p className="text-emerald-600">Correct: {a.term}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-center gap-3 pt-2">
            <Button variant="outline" onClick={restart}><RotateCw className="mr-2 h-4 w-4" /> Retake</Button>
            <Button render={<Link to={listUrl} />}>Back to Flashcards</Button>
          </div>
        </div>
      ) : current ? (
        <>
          <div className="h-1.5 w-full bg-slate-100 dark:bg-surface-raised rounded-full overflow-hidden">
            <div className="h-full bg-aubergine-500 rounded-full transition-all" style={{ width: `${Math.round((index / order.length) * 100)}%` }} />
          </div>
          <p className="text-center text-sm text-slate-500">Word {index + 1} of {order.length}</p>

          <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm p-8 space-y-6">
            <div className="text-center space-y-3">
              <Button variant="outline" size="lg" onClick={() => speak(current.term)} disabled={!speechSupported}>
                <Volume2 className="mr-2 h-5 w-5" /> Hear the word again
              </Button>
              {current.imageUrl && (
                <img src={current.imageUrl} alt="" className="max-h-28 mx-auto rounded-lg object-contain" />
              )}
              <p className="text-slate-600 dark:text-slate-300"><MathText>{current.definition}</MathText></p>
              {!speechSupported && (
                <p className="text-xs text-amber-600">Your browser can't read words aloud, so the definition is your only clue.</p>
              )}
            </div>

            <div className="space-y-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { checked ? next() : submit(); } }}
                placeholder="Type the spelling…"
                disabled={!!checked}
                className={`text-center text-lg ${checked ? (checked.correct ? 'border-emerald-400' : 'border-rose-400') : ''}`}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              {checked && (
                <p className={`text-center text-sm font-medium flex items-center justify-center gap-1.5 ${checked.correct ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {checked.correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {checked.correct ? 'Correct!' : `Correct spelling: ${current.term}`}
                </p>
              )}
            </div>

            <div className="flex justify-center">
              {checked ? (
                <Button onClick={next}>{index + 1 >= order.length ? 'Finish' : 'Next Word'}</Button>
              ) : (
                <Button onClick={submit} disabled={!input.trim()}>Check Spelling</Button>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
