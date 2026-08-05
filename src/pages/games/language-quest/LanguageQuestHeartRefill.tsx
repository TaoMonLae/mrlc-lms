import { useState } from 'react';
import { Link } from 'react-router';
import confetti from 'canvas-confetti';
import { ArrowLeft, Check, Gift, Heart, RotateCcw, ShieldCheck, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { LanguageQuestOption, LanguageQuestProfile } from '@/src/types/languageQuest';
import { ApiError, apiSend } from '@/src/lib/api';
import { LanguageQuestPinyinText } from '@/src/components/games/LanguageQuestPinyinText';
import {
  LanguageQuestSurpriseCardView,
} from '@/src/components/games/LanguageQuestSurpriseCards';
import type {
  LanguageQuestSurpriseCard,
  LanguageQuestSurpriseCardCollection,
} from '@/shared/languageQuestHeartRefill';
import { useLanguageQuestPreferences } from '@/src/components/games/LanguageQuestPreferences';

interface RefillQuestion {
  challengeId: string;
  question: string;
  language: string;
  options: LanguageQuestOption[];
}

interface RefillPayload {
  attemptId: string;
  expiresAt: string;
  passRatio: number;
  requiredCorrect: number;
  profile: LanguageQuestProfile;
  cards: RefillQuestion[];
}

interface RefillResult {
  results: Array<{ challengeId: string; correct: boolean; correctOptionId: string; correctAnswer: string }>;
  correctCount: number;
  total: number;
  passed: boolean;
  requiredCorrect: number;
  heartAdded: boolean;
  profile: LanguageQuestProfile;
  surpriseCard: LanguageQuestSurpriseCard | null;
  surpriseCards: LanguageQuestSurpriseCardCollection;
}

export default function LanguageQuestHeartRefill() {
  const { reducedMotion } = useLanguageQuestPreferences();
  const [payload, setPayload] = useState<RefillPayload | null>(null);
  const [result, setResult] = useState<RefillResult | null>(null);
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState('');
  const [answers, setAnswers] = useState<Array<{ challengeId: string; optionId: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const start = async () => {
    setBusy(true);
    setStatusMessage('');
    setResult(null);
    setPayload(null);
    setIndex(0);
    setSelectedId('');
    setAnswers([]);
    try {
      const next = await apiSend<RefillPayload>('/api/language-quest/heart-refill/start', 'POST');
      setPayload(next);
    } catch (error: any) {
      const message = error instanceof ApiError && error.code === 'HEARTS_FULL'
        ? 'Your hearts are already full — you are ready for the next lesson!'
        : error?.message || 'Could not start a heart refill quiz';
      setStatusMessage(message);
      if (!(error instanceof ApiError && error.code === 'HEARTS_FULL')) toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const finish = async (finalAnswers: Array<{ challengeId: string; optionId: string }>) => {
    if (!payload) return;
    setBusy(true);
    try {
      const response = await apiSend<RefillResult>('/api/language-quest/heart-refill/finish', 'POST', {
        attemptId: payload.attemptId,
        answers: finalAnswers,
      });
      setResult(response);
      if (response.passed && !reducedMotion) {
        void confetti({ particleCount: response.surpriseCard ? 180 : 90, spread: 100, origin: { y: 0.55 }, colors: ['#ec4899', '#8b5cf6', '#fb7185', '#fbbf24'] });
      }
    } catch (error: any) {
      toast.error(error?.message || 'Could not finish the heart refill quiz');
    } finally {
      setBusy(false);
    }
  };

  const submitCurrent = () => {
    const card = payload?.cards[index];
    if (!card || !selectedId || busy) return;
    const nextAnswers = [...answers, { challengeId: card.challengeId, optionId: selectedId }];
    setAnswers(nextAnswers);
    setSelectedId('');
    if (index + 1 < payload.cards.length) setIndex((current) => current + 1);
    else void finish(nextAnswers);
  };

  if (result && payload) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 pb-10">
        <Button variant="ghost" className="-ml-2" render={<Link to="/games/language-quest" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Language Quest
        </Button>
        <section className={`rounded-3xl border-2 p-6 text-center shadow-lg sm:p-8 ${result.passed ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/25 dark:bg-emerald-950/20' : 'border-rose-200 bg-rose-50 dark:border-rose-500/25 dark:bg-rose-950/20'}`}>
          <span className={`mx-auto grid h-20 w-20 place-items-center rounded-full text-white shadow-lg ${result.passed ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-rose-500 to-orange-500'}`}>
            {result.passed ? <Heart className="h-10 w-10 fill-current" /> : <RotateCcw className="h-9 w-9" />}
          </span>
          <h1 className="mt-5 text-3xl font-black text-slate-950 dark:text-white">{result.passed ? 'Heart restored!' : 'Almost there — try again'}</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            {result.correctCount}/{result.total} correct. You needed {result.requiredCorrect}.
            {result.passed && result.heartAdded ? ` You now have ${result.profile.hearts}/${result.profile.maxHearts} hearts.` : ''}
          </p>
        </section>

        {result.surpriseCard && (
          <section className="grid gap-6 rounded-3xl border border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 to-amber-50 p-5 shadow-xl dark:border-fuchsia-500/25 dark:from-fuchsia-950/25 dark:to-amber-950/20 sm:p-8 md:grid-cols-[minmax(0,360px)_1fr] md:items-center">
            <LanguageQuestSurpriseCardView card={result.surpriseCard} />
            <div className="text-center md:text-left">
              <Badge className="bg-fuchsia-600 text-white hover:bg-fuchsia-600"><Gift className="h-3.5 w-3.5" /> Daily surprise</Badge>
              <h2 className="mt-4 text-3xl font-black text-slate-950 dark:text-white">A new unique card found!</h2>
              <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
                {result.surpriseCard.name} has joined your secret collection. Language Quest always chooses from cards you do not own, so every reveal is new.
              </p>
              <p className="mt-4 font-black text-fuchsia-700 dark:text-fuchsia-300">{result.surpriseCards.unlockedCount}/{result.surpriseCards.totalCount} Surprise Heart Cards collected</p>
              <Button className="mt-5" variant="outline" render={<Link to="/games/language-quest/profile#quest-cards" />} nativeButton={false}>View my cards</Button>
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
          <h2 className="font-black text-slate-950 dark:text-white">Quiz review</h2>
          <div className="mt-4 space-y-2">
            {result.results.map((entry, resultIndex) => (
              <div key={entry.challengeId} className={`flex items-start gap-3 rounded-2xl border p-3 ${entry.correct ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10' : 'border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10'}`}>
                <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-white ${entry.correct ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                  {entry.correct ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                </span>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{payload.cards[resultIndex]?.question}</p>
                  {!entry.correct && <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">Correct answer: {entry.correctAnswer}</p>}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            {!result.passed && <Button className="flex-1" onClick={() => { void start(); }} disabled={busy}><RotateCcw className="mr-2 h-4 w-4" /> Try another quiz</Button>}
            {result.passed && result.profile.hearts < result.profile.maxHearts && <Button className="flex-1" onClick={() => { void start(); }} disabled={busy}><Heart className="mr-2 h-4 w-4" /> Refill another heart</Button>}
            <Button variant="outline" className="flex-1" render={<Link to="/games/language-quest" />} nativeButton={false}>Back to courses</Button>
          </div>
        </section>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 pb-10">
        <Button variant="ghost" className="-ml-2" render={<Link to="/games/language-quest" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Language Quest
        </Button>
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 via-fuchsia-700 to-violet-800 p-7 text-white shadow-2xl sm:p-10">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10" />
          <div className="relative max-w-2xl">
            <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/15"><Sparkles className="h-3.5 w-3.5" /> Comeback challenge</Badge>
            <span className="mt-6 grid h-20 w-20 place-items-center rounded-3xl bg-white/15 shadow-lg backdrop-blur"><Heart className="h-10 w-10 fill-current" /></span>
            <h1 className="mt-5 text-3xl font-black sm:text-4xl">Heart Refill Quiz</h1>
            <p className="mt-3 text-base leading-7 text-white/85">Answer a five-question review and pass at least 70% to restore one heart. Your first successful refill today also reveals a random card you have never received before.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/10 p-4"><ShieldCheck className="h-5 w-5" /><p className="mt-2 text-sm font-black">Server graded</p><p className="mt-1 text-xs text-white/70">Answers stay fair and secure.</p></div>
              <div className="rounded-2xl bg-white/10 p-4"><Heart className="h-5 w-5 fill-current" /><p className="mt-2 text-sm font-black">+1 heart</p><p className="mt-1 text-xs text-white/70">No XP is farmed here.</p></div>
              <div className="rounded-2xl bg-white/10 p-4"><Gift className="h-5 w-5" /><p className="mt-2 text-sm font-black">No duplicates</p><p className="mt-1 text-xs text-white/70">Daily reveals are always new.</p></div>
            </div>
            {statusMessage && <p role="status" className="mt-5 rounded-2xl border border-white/20 bg-white/10 p-4 font-bold">{statusMessage}</p>}
            <Button size="lg" className="mt-6 bg-white font-black text-fuchsia-700 hover:bg-white/90" onClick={() => { void start(); }} disabled={busy}>
              {busy ? 'Preparing quiz…' : 'Start refill quiz'}
            </Button>
          </div>
        </section>
      </div>
    );
  }

  const card = payload.cards[index];
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <header className="flex items-center gap-4">
        <Button variant="ghost" size="icon" aria-label="Leave refill quiz" render={<Link to="/games/language-quest" />} nativeButton={false}><ArrowLeft className="h-5 w-5" /></Button>
        <Progress value={(index / payload.cards.length) * 100} className="flex-1 [&_[data-slot=progress-indicator]]:bg-rose-500" />
        <span className="flex items-center gap-1 font-black text-rose-500"><Heart className="h-5 w-5 fill-current" /> {payload.profile.hearts}/{payload.profile.maxHearts}</span>
      </header>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-fuchsia-600 dark:text-fuchsia-300">Refill question {index + 1} of {payload.cards.length}</p>
          <Badge variant="outline">Need {payload.requiredCorrect} correct</Badge>
        </div>
        <h1 className="mt-5 text-2xl font-black leading-tight text-slate-950 dark:text-white sm:text-3xl">{card.question}</h1>
        <div className="mt-7 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Answer choices">
          {card.options.map((option) => {
            const selected = selectedId === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setSelectedId(option.id)}
                className={`flex min-h-20 items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${selected ? 'border-fuchsia-500 bg-fuchsia-50 ring-2 ring-fuchsia-200 dark:bg-fuchsia-500/10 dark:ring-fuchsia-500/20' : 'border-slate-200 hover:border-fuchsia-300 hover:bg-fuchsia-50/40 dark:border-slate-700 dark:hover:bg-fuchsia-500/5'}`}
              >
                {option.emoji && <span className="text-2xl">{option.emoji}</span>}
                <span className="font-bold text-slate-900 dark:text-white"><LanguageQuestPinyinText text={option.text} pinyin={option.pinyin} /></span>
              </button>
            );
          })}
        </div>
        <Button className="mt-7 w-full bg-fuchsia-700 font-black text-white hover:bg-fuchsia-800" size="lg" onClick={submitCurrent} disabled={!selectedId || busy}>
          {index + 1 === payload.cards.length ? (busy ? 'Checking…' : 'Finish quiz') : 'Lock answer'}
        </Button>
      </section>
    </div>
  );
}
