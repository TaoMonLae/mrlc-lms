import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowLeft, Brain, CheckCircle2, Clock3, Flame, Link2, RotateCcw, Sparkles, Star, Target, Trophy, Volume2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { apiGet, apiSend } from '@/src/lib/api';
import type { LanguageQuestOption, LanguageQuestProfile } from '@/src/types/languageQuest';
import { LanguageQuestContentText } from '@/src/components/games/LanguageQuestContentText';
import { LanguageQuestQuestionText } from '@/src/components/games/LanguageQuestQuestionText';
import { LanguageQuestReorderTiles } from '@/src/components/games/LanguageQuestReorderTiles';
import { LanguageQuestMatchingBoard } from '@/src/components/games/LanguageQuestMatchingBoard';
import { useLanguageQuestPreferences } from '@/src/components/games/LanguageQuestPreferences';
import { playLanguageQuestSuccessSound } from '@/src/lib/languageQuestAudio';
import { speakLanguageQuestVoice } from '@/src/lib/languageQuestVoice';
import { LanguageQuestRewardReveal } from '@/src/components/games/LanguageQuestRewards';
import type { LanguageQuestMasteryConfidence } from '@/shared/languageQuestEngagement';

interface MasteryCard {
  challengeId: string;
  stage: number;
  type:
    | 'SELECT'
    | 'ASSIST'
    | 'CLOZE'
    | 'ODD_ONE_OUT'
    | 'REORDER'
    | 'MATCHING'
    | 'MINIMAL_PAIR_LISTENING'
    | 'DICTATION'
    | 'GRAMMAR_TRANSFORM';
  question: string;
  accuracyPercent: number;
  skillLabel: string;
  course: { id: string; title: string; language: string; accentColor: string };
  options: LanguageQuestOption[];
}

interface MasteryPayload {
  dueCount: number;
  weakAreaCount: number;
  reviewsToday: number;
  chainTarget: number;
  mode: 'due' | 'weak';
  cards: MasteryCard[];
}

interface MasteryResult {
  correct: boolean;
  correctOptionId: string;
  correctAnswer: string;
  pointsAwarded: number;
  nextDueAt: string;
  easeFactor: number;
  intervalDays: number;
  profile?: LanguageQuestProfile;
  unlockedRewardIds?: string[];
}

// Lightning Round is the same due-review deck as classic Mastery Arena --
// same spaced-repetition backend, same XP economy -- just played against a
// per-card countdown for a faster, more arcade-y session. Timing out on a
// card breaks the combo and skips it locally without calling the answer API,
// so an unanswered card simply stays due for next time rather than being
// marked wrong against the spaced-repetition schedule.
const LIGHTNING_SECONDS = 12;

function masteryIntervalLabel(days: number): string {
  if (days < 1) return `${Math.max(1, Math.round(days * 24))} hours`;
  if (days < 2) return '1 day';
  return `${Math.round(days)} days`;
}

export default function LanguageQuestMastery() {
  const { soundEnabled, reducedMotion, voiceProvider } = useLanguageQuestPreferences();
  const [searchParams, setSearchParams] = useSearchParams();
  const [payload, setPayload] = useState<MasteryPayload | null>(null);
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState('');
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<[string, string][]>([]);
  const [dictationAnswer, setDictationAnswer] = useState('');
  const [result, setResult] = useState<MasteryResult | null>(null);
  const [confidence, setConfidence] = useState<LanguageQuestMasteryConfidence>('GOOD');
  const speak = (value: string, language: string) => {
    void speakLanguageQuestVoice(value, language, voiceProvider).then((outcome) => {
      if (outcome === 'unavailable') toast.info('Speech is not supported by this browser');
    });
  };
  const [checking, setChecking] = useState(false);
  const [sessionXp, setSessionXp] = useState(0);
  const [unlockedAwardId, setUnlockedAwardId] = useState<string | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);

  const [lightningMode, setLightningMode] = useState(searchParams.get('mode') === 'lightning');
  const chainMode = searchParams.get('mode') === 'chain';
  const weakMode = searchParams.get('mode') === 'weak';
  const [reviewsToday, setReviewsToday] = useState(0);
  const [timeLeft, setTimeLeft] = useState(LIGHTNING_SECONDS);
  const [timedOut, setTimedOut] = useState(false);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [lightningScore, setLightningScore] = useState(0);
  const usedLightning = useRef(false);

  const load = () => {
    apiGet<MasteryPayload>(weakMode ? '/api/language-quest/mastery?mode=weak' : '/api/language-quest/mastery')
      .then((data) => {
        setPayload(data);
        setReviewsToday(data.reviewsToday);
        setIndex(0);
        setSelectedId('');
        setOrderedIds([]);
        setMatchedPairs([]);
        setDictationAnswer('');
        setResult(null);
        setConfidence('GOOD');
        setTimedOut(false);
      })
      .catch((error: any) => toast.error(error?.message || 'Could not load mastery reviews'));
  };

  useEffect(load, [weakMode]);

  // Daily Quest Chain is the same due-review deck, capped to just enough
  // cards to reach today's target -- it's about building a fast daily habit,
  // not clearing the whole backlog in one sitting.
  const chainRemaining = payload ? Math.max(0, payload.chainTarget - reviewsToday) : 0;
  const effectiveCards = chainMode && payload ? payload.cards.slice(0, chainRemaining) : payload?.cards ?? [];
  const card = effectiveCards[index];
  const done = Boolean(payload && index >= effectiveCards.length);

  const toggleLightningMode = (checked: boolean) => {
    setLightningMode(checked);
    if (checked) usedLightning.current = true;
    setSearchParams(checked ? { mode: 'lightning' } : {}, { replace: true });
  };

  // Per-card countdown: only ticks in Lightning mode, while a card is showing
  // and hasn't been answered or timed out yet. Reset happens in `next()`.
  useEffect(() => {
    if (!lightningMode || !card || result || timedOut) return;
    const startedAt = Date.now();
    setTimeLeft(LIGHTNING_SECONDS);
    const id = setInterval(() => {
      const remaining = Math.max(0, LIGHTNING_SECONDS - (Date.now() - startedAt) / 1000);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(id);
        setTimedOut(true);
        setCombo(0);
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightningMode, card?.challengeId, result, timedOut]);

  // A card that timed out auto-advances after a short "too slow" beat.
  useEffect(() => {
    if (!timedOut) return;
    const id = setTimeout(() => next(), 1400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timedOut]);

  const isReorder = card?.type === 'REORDER';
  const isMatching = card?.type === 'MATCHING';
  const isDictation = card?.type === 'DICTATION';
  const canCheck = isReorder
    ? orderedIds.length === (card?.options.length ?? -1)
    : isMatching
      ? matchedPairs.length * 2 === (card?.options.length ?? -1)
      : isDictation
        ? dictationAnswer.trim().length > 0
        : Boolean(selectedId);

  const check = async () => {
    if (!card || !canCheck || checking || timedOut) return;
    setChecking(true);
    try {
      const body = isReorder
        ? { orderedOptionIds: orderedIds, confidence, mode: weakMode ? 'weak' : 'due' }
        : isMatching
          ? { matchedPairs, confidence, mode: weakMode ? 'weak' : 'due' }
          : isDictation
            ? { typedAnswer: dictationAnswer, confidence, mode: weakMode ? 'weak' : 'due' }
            : { optionId: selectedId, confidence, mode: weakMode ? 'weak' : 'due' };
      const answer = await apiSend<MasteryResult>(
        `/api/language-quest/mastery/${card.challengeId}/answer`,
        'POST',
        body,
      );
      setResult(answer);
      setReviewsToday((current) => current + 1);
      if (answer.correct) {
        setSessionXp((current) => current + answer.pointsAwarded);
        if (soundEnabled) playLanguageQuestSuccessSound();
        const newestAwardId = answer.unlockedRewardIds?.at(-1);
        if (newestAwardId) {
          setUnlockedAwardId(newestAwardId);
          setRevealOpen(true);
        }
        if (lightningMode) {
          setCombo((current) => {
            const nextCombo = current + 1;
            setBestCombo((best) => Math.max(best, nextCombo));
            return nextCombo;
          });
          // Base points for a correct answer, plus up to a full bonus for
          // answering with time to spare -- purely a session score, not XP.
          setLightningScore((current) => current + 50 + Math.round((timeLeft / LIGHTNING_SECONDS) * 50));
        }
      } else if (lightningMode) {
        setCombo(0);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Could not check this review');
    } finally {
      setChecking(false);
    }
  };

  const next = () => {
    setIndex((current) => current + 1);
    setSelectedId('');
    setOrderedIds([]);
    setMatchedPairs([]);
    setDictationAnswer('');
    setResult(null);
    setConfidence('GOOD');
    setTimedOut(false);
  };

  if (!payload) return <div className="grid min-h-[420px] place-items-center"><div className="h-11 w-11 animate-spin rounded-full border-4 border-fuchsia-200 border-t-fuchsia-600" /></div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" className="-ml-2" render={<Link to="/games/language-quest" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Learning Quest
        </Button>
        <div className="flex items-center gap-2">
          {lightningMode && bestCombo >= 2 && (
            <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-500/15 dark:text-orange-200">
              <Flame className="h-3.5 w-3.5 fill-current" /> Best combo {bestCombo}
            </Badge>
          )}
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-200">
            <Star className="h-3.5 w-3.5 fill-current" /> {sessionXp} XP this session
          </Badge>
        </div>
      </div>

      <section className={`relative overflow-hidden rounded-3xl p-6 text-white shadow-xl transition-colors sm:p-8 ${chainMode ? 'bg-gradient-to-br from-emerald-600 via-teal-600 to-sky-700' : weakMode ? 'bg-gradient-to-br from-rose-700 via-fuchsia-700 to-violet-800' : lightningMode ? 'bg-gradient-to-br from-orange-600 via-amber-600 to-rose-600' : 'bg-gradient-to-br from-fuchsia-700 via-violet-800 to-sky-700'}`}>
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/15">
              {chainMode ? <Link2 className="h-8 w-8" /> : weakMode ? <Target className="h-8 w-8" /> : lightningMode ? <Zap className="h-8 w-8" /> : <Brain className="h-8 w-8" />}
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">Spaced repetition</p>
              <h1 className="mt-1 text-3xl font-black">{chainMode ? 'Daily Chain' : weakMode ? 'Weak Areas' : lightningMode ? 'Lightning Round' : 'Mastery Arena'}</h1>
              <p className="mt-1 text-sm text-white/80">
                {chainMode ? `A quick ${payload.chainTarget}-review habit -- no full deck, just today's chain.` : weakMode ? 'Practise the skills with your lowest recent accuracy, balanced across courses and activity types.' : lightningMode ? 'Beat the clock on each card to build a combo and a speed bonus.' : 'Review at the right time to make each phrase stick.'}
              </p>
            </div>
          </div>
          {chainMode ? (
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-center">
              <p className="text-2xl font-black">{Math.min(reviewsToday, payload.chainTarget)}/{payload.chainTarget}</p>
              <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">Today's chain</p>
            </div>
          ) : weakMode ? (
            <div className="flex flex-col items-end gap-2">
              <div className="rounded-2xl bg-white/10 px-4 py-3 text-center">
                <p className="text-2xl font-black">{payload.weakAreaCount}</p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">Ready today</p>
              </div>
              <Button size="sm" variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white" render={<Link to="/games/language-quest/mastery" />} nativeButton={false}>Due reviews</Button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
              <Zap className="h-4 w-4" />
              <span className="text-sm font-bold">Lightning mode</span>
              <Switch checked={lightningMode} onCheckedChange={toggleLightningMode} aria-label="Toggle Lightning mode" />
            </label>
          )}
        </div>
      </section>

      {effectiveCards.length === 0 || done ? (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-10 text-center shadow-sm dark:border-emerald-500/20 dark:bg-emerald-950/20">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
          <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
            {chainMode ? (payload.cards.length === 0 ? 'No reviews due yet' : "Chain complete for today!") : weakMode ? (payload.cards.length === 0 ? 'No weak areas ready' : 'Weak-area practice complete') : 'Reviews complete'}
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {chainMode
              ? (payload.cards.length === 0
                ? 'Finish lessons to build your review deck, then come back for a daily chain.'
                : `${Math.min(reviewsToday, payload.chainTarget)}/${payload.chainTarget} done today. Come back tomorrow for a fresh chain.`)
              : weakMode
                ? (payload.cards.length === 0
                  ? 'Missed items will appear here after a review. Each weak card is offered once per day.'
                  : 'You targeted the skills that needed the most attention. Return tomorrow for a refreshed queue.')
              : (sessionXp > 0 ? `You strengthened your memory and earned ${sessionXp} XP.` : 'Finish lessons to build your review deck, then return when cards are due.')}
          </p>
          {usedLightning.current && (lightningScore > 0 || bestCombo > 0) && (
            <div className="mx-auto mt-5 flex max-w-xs items-center justify-center gap-6">
              <div>
                <Zap className="mx-auto h-5 w-5 text-orange-500" />
                <p className="mt-1 text-xl font-black text-orange-600 dark:text-orange-400">{lightningScore}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-600/70">Lightning score</p>
              </div>
              <div>
                <Trophy className="mx-auto h-5 w-5 text-amber-500" />
                <p className="mt-1 text-xl font-black text-amber-600 dark:text-amber-400">{bestCombo}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600/70">Best combo</p>
              </div>
            </div>
          )}
          <Button className="mt-6" render={<Link to="/games/language-quest" />} nativeButton={false}>Choose a course</Button>
        </section>
      ) : card && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Badge style={{ borderColor: card.course.accentColor, color: card.course.accentColor }} variant="outline">{card.course.title}</Badge>
            <span className="text-left text-xs font-black text-slate-500 sm:text-right">
              Review {index + 1}/{effectiveCards.length} • Strength {card.stage}
              {weakMode && <span className="block text-rose-600 dark:text-rose-300">{card.skillLabel} · {card.accuracyPercent}% recent accuracy</span>}
            </span>
          </div>
          <Progress value={((index + 1) / effectiveCards.length) * 100} className="mt-4" />

          {lightningMode && !result && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {timedOut ? 'Too slow!' : `${Math.ceil(timeLeft)}s`}</span>
                {combo >= 2 && <span className="flex items-center gap-1 text-orange-600"><Flame className="h-3.5 w-3.5 fill-current" /> {combo} combo</span>}
              </div>
              <Progress
                value={(timeLeft / LIGHTNING_SECONDS) * 100}
                className={`mt-1.5 ${timeLeft < 4 ? '[&_[data-slot=progress-indicator]]:bg-rose-500' : '[&_[data-slot=progress-indicator]]:bg-orange-500'} ${reducedMotion ? '' : '[&_[data-slot=progress-indicator]]:transition-all'}`}
              />
            </div>
          )}

          <LanguageQuestQuestionText language={card.course.language} text={card.question} headingLevel={2} className="mt-7" />
          {isReorder ? (
            <LanguageQuestReorderTiles
              options={card.options}
              value={orderedIds}
              onChange={setOrderedIds}
              disabled={Boolean(result) || timedOut}
            />
          ) : isMatching ? (
            <LanguageQuestMatchingBoard
              options={card.options}
              value={matchedPairs}
              onChange={setMatchedPairs}
              disabled={Boolean(result) || timedOut}
            />
          ) : isDictation ? (
            <div className="mt-6 space-y-4">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => speak(card.options[0]?.audioText || card.options[0]?.text || card.question, card.course.language)}
              >
                <Volume2 className="h-4 w-4" /> Play audio
              </Button>
              <input
                autoFocus
                value={dictationAnswer}
                onChange={(event) => setDictationAnswer(event.target.value)}
                disabled={Boolean(result) || timedOut}
                placeholder="Type what you hear…"
                className="w-full rounded-2xl border-2 border-slate-200 bg-white p-4 text-lg font-semibold text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100 disabled:opacity-70 dark:border-surface-raised dark:bg-surface-indigo dark:text-white"
              />
            </div>
          ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {card.options.map((option) => {
              const selected = selectedId === option.id;
              const correct = result && option.id === result.correctOptionId;
              const wrong = result && selected && !result.correct;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={Boolean(result) || timedOut}
                  onClick={() => setSelectedId(option.id)}
                  className={`flex min-h-20 items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${
                    correct ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                      : wrong ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/10'
                        : selected ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10'
                          : 'border-slate-200 hover:border-violet-300 dark:border-slate-700'
                  } ${timedOut ? 'opacity-50' : ''}`}
                >
                  {option.emoji && <span className="text-2xl" aria-hidden="true">{option.emoji}</span>}
                  <span className="font-black text-slate-900 dark:text-white">
                    <LanguageQuestContentText language={card.course.language} text={option.text} pinyin={option.pinyin} />
                  </span>
                </button>
              );
            })}
          </div>
          )}

          {!lightningMode && !result && !timedOut && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/60">
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white">How did this recall feel?</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Your confidence fine-tunes when a correct card returns.</p>
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-white p-1 shadow-sm dark:bg-slate-900">
                {([
                  ['HARD', 'Still hard'],
                  ['GOOD', 'Got it'],
                  ['EASY', 'Easy now'],
                ] as const).map(([value, label]) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={confidence === value ? 'default' : 'ghost'}
                    className={confidence === value ? 'bg-violet-700 text-white hover:bg-violet-800' : ''}
                    onClick={() => setConfidence(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {timedOut && (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 dark:border-rose-500/25 dark:bg-rose-950/25 dark:text-rose-100">
              <p className="font-black">Too slow! This card stays in your deck for next time.</p>
            </div>
          )}
          {result && (
            <div className={`mt-5 rounded-2xl border p-4 ${result.correct ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/25 dark:bg-emerald-950/25 dark:text-emerald-100' : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/25 dark:bg-amber-950/25 dark:text-amber-100'}`}>
              <p className="font-black">{result.correct ? (result.pointsAwarded > 0 ? `Memory win! +${result.pointsAwarded} XP` : 'Weak area strengthened!') : <>Review again: <LanguageQuestContentText language={card.course.language} text={result.correctAnswer} /></>}</p>
              <p className="mt-1 text-xs opacity-80"><Clock3 className="mr-1 inline h-3.5 w-3.5" /> Scheduled to return in about {masteryIntervalLabel(result.intervalDays)}.</p>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            {timedOut ? null : !result ? (
              <Button onClick={check} disabled={!canCheck || checking} className="rounded-xl bg-violet-700 text-white hover:bg-violet-800">
                <Sparkles className="mr-2 h-4 w-4" /> {checking ? 'Checking…' : 'Check memory'}
              </Button>
            ) : (
              <Button onClick={next} className="rounded-xl">
                <RotateCcw className="mr-2 h-4 w-4" /> Next review
              </Button>
            )}
          </div>
        </section>
      )}
      <LanguageQuestRewardReveal
        cardId={unlockedAwardId}
        open={revealOpen}
        onOpenChange={setRevealOpen}
      />
    </div>
  );
}
