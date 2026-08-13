import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import confetti from 'canvas-confetti';
import { ArrowLeft, Check, Clock3, Shield, Skull, Sparkles, Star, Swords, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ApiError, apiGet, apiSend } from '@/src/lib/api';
import type { LanguageQuestOption, LanguageQuestProfile } from '@/src/types/languageQuest';
import { LanguageQuestContentText } from '@/src/components/games/LanguageQuestContentText';
import { LanguageQuestQuestionText } from '@/src/components/games/LanguageQuestQuestionText';
import { LanguageQuestRewardReveal } from '@/src/components/games/LanguageQuestRewards';
import { useLanguageQuestPreferences } from '@/src/components/games/LanguageQuestPreferences';

interface BossBattleCard {
  challengeId: string;
  question: string;
  options: LanguageQuestOption[];
}

interface BossBattlePayload {
  attemptId: string;
  course: { id: string; title: string; language: string; accentColor: string };
  cleared: boolean;
  minQuestions: number;
  passRatio: number;
  cards: BossBattleCard[];
}

interface BossBattleQuestionResult {
  challengeId: string;
  correct: boolean;
  correctOptionId: string;
  correctAnswer: string;
}

interface BossBattleFinishResponse {
  results: BossBattleQuestionResult[];
  correctCount: number;
  total: number;
  won: boolean;
  pointsAwarded: number;
  alreadyCleared: boolean;
  profile: LanguageQuestProfile;
  unlockedRewardIds: string[];
}

const QUESTION_SECONDS = 15;

// Boss Battle deliberately never tells the learner whether an individual
// answer was right while the battle is in progress -- every choice is just
// recorded locally, and the whole set is graded together by the server once
// the last question is locked in. That keeps the answer key from leaking one
// request at a time, and gives the end-of-battle report somewhere to land.
export default function LanguageQuestBossBattle() {
  const { courseId } = useParams<{ courseId: string }>();
  const { reducedMotion } = useLanguageQuestPreferences();
  const [payload, setPayload] = useState<BossBattlePayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState('');
  const [answers, setAnswers] = useState<{ challengeId: string; optionId: string | null }[]>([]);
  const [timeLeft, setTimeLeft] = useState(QUESTION_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BossBattleFinishResponse | null>(null);
  const [unlockedAwardId, setUnlockedAwardId] = useState<string | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);
  const finishedRef = useRef(false);
  const lockedChallengeIdRef = useRef<string | null>(null);

  const load = () => {
    if (!courseId) return;
    setPayload(null);
    setLoadError(null);
    setResult(null);
    setIndex(0);
    setAnswers([]);
    setSelectedId('');
    finishedRef.current = false;
    lockedChallengeIdRef.current = null;
    apiGet<BossBattlePayload>(`/api/language-quest/courses/${courseId}/boss-battle`)
      .then(setPayload)
      .catch((error: any) => {
        if (error instanceof ApiError) setLoadError(error.message);
        else toast.error(error?.message || 'Could not load the boss battle');
      });
  };

  useEffect(load, [courseId]);

  const card = payload?.cards[index];
  const total = payload?.cards.length ?? 0;

  const finishBattle = async (finalAnswers: { challengeId: string; optionId: string | null }[]) => {
    if (!courseId || !payload || finishedRef.current) return;
    finishedRef.current = true;
    setSubmitting(true);
    try {
      const response = await apiSend<BossBattleFinishResponse>(
        `/api/language-quest/courses/${courseId}/boss-battle/finish`,
        'POST',
        { attemptId: payload.attemptId, answers: finalAnswers },
      );
      setResult(response);
      if (response.won) {
        if (!reducedMotion) {
          void confetti({ particleCount: 160, spread: 100, origin: { y: 0.55 }, colors: ['#f59e0b', '#dc2626', '#7c3aed'] });
        }
        const newestAwardId = response.unlockedRewardIds.at(-1);
        if (newestAwardId) {
          setUnlockedAwardId(newestAwardId);
          setRevealOpen(true);
        }
      }
    } catch (error: any) {
      toast.error(error?.message || 'Could not finish the boss battle');
      finishedRef.current = false;
      // Keep the learner on the final card and allow a clean retry. Without
      // removing the failed final answer, retrying appends the same challenge
      // twice and the server correctly rejects the deck as changed.
      setAnswers(finalAnswers.slice(0, -1));
      setSelectedId('');
      lockedChallengeIdRef.current = null;
    } finally {
      setSubmitting(false);
    }
  };

  const lockInAnswer = (optionId: string | null) => {
    if (!card) return;
    // A click and the countdown's final tick can land in the same render.
    // Guard by challenge id so one card can never be appended twice.
    if (lockedChallengeIdRef.current === card.challengeId) return;
    lockedChallengeIdRef.current = card.challengeId;
    const nextAnswers = [...answers, { challengeId: card.challengeId, optionId }];
    setAnswers(nextAnswers);
    setSelectedId('');
    if (index + 1 < total) {
      setIndex((current) => current + 1);
    } else {
      void finishBattle(nextAnswers);
    }
  };

  // Per-question countdown. Timing out locks in "no answer" for that card,
  // which the server always grades as wrong -- there's no partial credit for
  // stalling, matching the "no do-overs mid-battle" theme.
  useEffect(() => {
    if (!card || result || submitting) return;
    const startedAt = Date.now();
    setTimeLeft(QUESTION_SECONDS);
    const id = setInterval(() => {
      const remaining = Math.max(0, QUESTION_SECONDS - (Date.now() - startedAt) / 1000);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        lockInAnswer(null);
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.challengeId, result, submitting]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 pb-10">
        <Button variant="ghost" className="-ml-2" render={<Link to={courseId ? `/games/language-quest/courses/${courseId}` : '/games/language-quest'} />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to course
        </Button>
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-10 text-center dark:border-amber-500/20 dark:bg-amber-950/20">
          <Shield className="mx-auto h-12 w-12 text-amber-500" />
          <h1 className="mt-3 text-xl font-black text-slate-900 dark:text-white">Boss Battle locked</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!payload) return <div className="grid min-h-[420px] place-items-center"><div className="h-11 w-11 animate-spin rounded-full border-4 border-rose-200 border-t-rose-600" /></div>;

  const hpPercent = result ? 0 : total ? ((total - index) / total) * 100 : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <Button variant="ghost" className="-ml-2" render={<Link to={`/games/language-quest/courses/${payload.course.id}`} />} nativeButton={false}>
        <ArrowLeft className="mr-2 h-4 w-4" /> {payload.course.title}
      </Button>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-700 via-red-800 to-slate-900 p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -right-10 -top-14 h-52 w-52 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/15"><Skull className="h-8 w-8" /></span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">Boss Battle</p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">{payload.course.title}</h1>
            <p className="mt-1 text-sm text-white/80">
              {payload.cleared ? 'Already defeated -- take it on again for bragging rights.' : `Answer ${Math.round(payload.passRatio * 100)}% correctly to claim victory.`}
            </p>
          </div>
        </div>
        {!result && (
          <div className="relative mt-6">
            <div className="flex items-center justify-between text-xs font-bold text-white/80">
              <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Boss health</span>
              <span>{Math.max(0, total - index)}/{total}</span>
            </div>
            <Progress value={hpPercent} className="mt-1.5 [&_[data-slot=progress-track]]:bg-white/15 [&_[data-slot=progress-indicator]]:bg-rose-400" />
          </div>
        )}
      </section>

      {result ? (
        <section className={`rounded-3xl border-2 p-6 text-center shadow-lg sm:p-8 ${result.won ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/25 dark:bg-emerald-950/20' : 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900'}`}>
          {result.won ? <Swords className="mx-auto h-14 w-14 text-emerald-600" /> : <Skull className="mx-auto h-14 w-14 text-slate-400" />}
          <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{result.won ? 'Boss defeated!' : 'The boss held its ground'}</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {result.correctCount}/{result.total} correct.{' '}
            {result.won
              ? (result.alreadyCleared ? 'Already claimed -- no extra XP this time.' : `+${result.pointsAwarded} bonus XP!`)
              : 'Review the report below, then challenge it again.'}
          </p>
          {result.won && !result.alreadyCleared && (
            <Badge className="mt-3 bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-200">
              <Star className="h-3.5 w-3.5 fill-current" /> +{result.pointsAwarded} XP
            </Badge>
          )}

          <div className="mt-6 space-y-2 text-left">
            {result.results.map((entry, entryIndex) => (
              <div key={entry.challengeId} className={`flex items-start gap-3 rounded-2xl border p-3 text-sm ${entry.correct ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10' : 'border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10'}`}>
                <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-white ${entry.correct ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                  {entry.correct ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <LanguageQuestQuestionText language={payload.course.language} text={payload.cards[entryIndex]?.question ?? ''} headingLevel={3} compact />
                  {!entry.correct && (
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-300">
                      Correct: <LanguageQuestContentText language={payload.course.language} text={entry.correctAnswer} />
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="flex-1" onClick={load}>Challenge again</Button>
            <Button className="flex-1" style={{ backgroundColor: payload.course.accentColor }} render={<Link to={`/games/language-quest/courses/${payload.course.id}`} />} nativeButton={false}>
              Back to course
            </Button>
          </div>
        </section>
      ) : submitting ? (
        <div className="grid min-h-[240px] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-rose-200 border-t-rose-600" /></div>
      ) : card && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="flex items-center justify-between text-xs font-black text-slate-500">
            <span>Question {index + 1}/{total}</span>
            <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {Math.ceil(timeLeft)}s</span>
          </div>
          <Progress value={(timeLeft / QUESTION_SECONDS) * 100} className={`mt-1.5 ${timeLeft < 4 ? '[&_[data-slot=progress-indicator]]:bg-rose-600' : '[&_[data-slot=progress-indicator]]:bg-orange-500'}`} />

          <LanguageQuestQuestionText language={payload.course.language} text={card.question} headingLevel={2} className="mt-7" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {card.options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelectedId(option.id)}
                className={`flex min-h-20 items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${selectedId === option.id ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/10' : 'border-slate-200 hover:border-rose-300 dark:border-slate-700'}`}
              >
                {option.emoji && <span className="text-2xl">{option.emoji}</span>}
                <span className="font-black text-slate-900 dark:text-white">
                  <LanguageQuestContentText language={payload.course.language} text={option.text} pinyin={option.pinyin} />
                </span>
              </button>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={() => lockInAnswer(selectedId || null)} disabled={!selectedId} className="rounded-xl bg-rose-700 text-white hover:bg-rose-800">
              <Sparkles className="mr-2 h-4 w-4" /> {index + 1 < total ? 'Lock in answer' : 'Final blow'}
            </Button>
          </div>
        </section>
      )}
      <LanguageQuestRewardReveal cardId={unlockedAwardId} open={revealOpen} onOpenChange={setRevealOpen} />
    </div>
  );
}
