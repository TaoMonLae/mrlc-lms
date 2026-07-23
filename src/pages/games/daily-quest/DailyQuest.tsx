import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookOpenCheck,
  Check,
  Coffee,
  Flame,
  Loader2,
  RotateCcw,
  Sparkles,
  Star,
  Target,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { apiGet, apiSend } from '@/src/lib/api';
import type {
  DailyQuestAnswerPayload,
  DailyQuestMode,
  DailyQuestPayload,
} from '@/src/types/dailyQuest';

const MODE_DETAILS: Record<DailyQuestMode, {
  title: string;
  description: string;
  time: string;
  icon: typeof Coffee;
  accent: string;
  selected: string;
}> = {
  RELAXED: {
    title: 'Relaxed',
    description: 'A quick confidence-building warm-up.',
    time: 'About 3 minutes',
    icon: Coffee,
    accent: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300',
    selected: 'border-emerald-500 ring-emerald-500/20',
  },
  STANDARD: {
    title: 'Standard',
    description: 'A balanced round of practical English words.',
    time: 'About 5 minutes',
    icon: Target,
    accent: 'text-violet-600 bg-violet-100 dark:bg-violet-900/30 dark:text-violet-300',
    selected: 'border-violet-500 ring-violet-500/20',
  },
  CHALLENGE: {
    title: 'Challenge',
    description: 'More questions and bonus XP for a bigger push.',
    time: 'About 7 minutes',
    icon: Zap,
    accent: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300',
    selected: 'border-amber-500 ring-amber-500/20',
  },
};

function StatsStrip({ data }: { data: DailyQuestPayload }) {
  const stats = [
    { label: 'Current streak', value: `${data.stats.currentStreak} days`, icon: Flame, color: 'text-orange-500' },
    { label: 'Best streak', value: `${data.stats.bestStreak} days`, icon: Trophy, color: 'text-amber-500' },
    { label: 'Total XP', value: data.stats.totalXp.toLocaleString(), icon: Star, color: 'text-violet-500' },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-2xl border border-white/15 bg-white/10 p-3 text-center backdrop-blur sm:p-4">
          <stat.icon className={`mx-auto h-5 w-5 ${stat.color}`} />
          <p className="mt-2 text-lg font-black text-white sm:text-xl">{stat.value}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-100/75 sm:text-xs">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

export default function DailyQuestPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DailyQuestPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<DailyQuestMode>('STANDARD');
  const [starting, setStarting] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answering, setAnswering] = useState(false);
  const [feedback, setFeedback] = useState<DailyQuestAnswerPayload | null>(null);

  useEffect(() => {
    apiGet<DailyQuestPayload>('/api/daily-quest')
      .then(setData)
      .catch((error) => toast.error(error?.message || 'Could not load today’s quest'))
      .finally(() => setLoading(false));
  }, []);

  const startQuest = async () => {
    setStarting(true);
    try {
      setData(await apiSend<DailyQuestPayload>('/api/daily-quest/start', 'POST', { mode }));
    } catch (error: any) {
      toast.error(error?.message || 'Could not start today’s quest');
    } finally {
      setStarting(false);
    }
  };

  const submitAnswer = async () => {
    const session = data?.session;
    const item = session?.currentItem;
    if (!session || !item || !selectedOptionId) return;
    setAnswering(true);
    try {
      const result = await apiSend<DailyQuestAnswerPayload>(
        `/api/daily-quest/${session.id}/answer`,
        'POST',
        { itemId: item.id, optionId: selectedOptionId },
      );
      setFeedback(result);
    } catch (error: any) {
      toast.error(error?.message || 'Could not check that answer');
    } finally {
      setAnswering(false);
    }
  };

  const continueQuest = () => {
    if (!feedback) return;
    setData(feedback);
    setFeedback(null);
    setSelectedOptionId(null);
  };

  if (loading) {
    return (
      <div className="grid min-h-[65vh] place-items-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-violet-600" />
          <p className="mt-3 text-sm font-semibold text-slate-500">Preparing today’s quest…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid min-h-[65vh] place-items-center text-center">
        <div>
          <BookOpenCheck className="mx-auto h-12 w-12 text-slate-300" />
          <h1 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">Daily Quest is unavailable</h1>
          <Button className="mt-5" onClick={() => window.location.reload()}>
            <RotateCcw className="h-4 w-4" /> Try again
          </Button>
        </div>
      </div>
    );
  }

  const session = data.session;

  if (!session) {
    const modes = data.modes ?? [
      { mode: 'RELAXED' as const, questionCount: 3 },
      { mode: 'STANDARD' as const, questionCount: 5 },
      { mode: 'CHALLENGE' as const, questionCount: 7 },
    ];
    return (
      <div className="mx-auto max-w-5xl space-y-6 pb-10">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-indigo-700 to-sky-700 p-6 shadow-xl shadow-violet-950/15 sm:p-9">
          <div aria-hidden="true" className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div aria-hidden="true" className="absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-fuchsia-400/15 blur-2xl" />
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-3 mb-5 text-white/80 hover:bg-white/10 hover:text-white"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-end">
              <div>
                <Badge className="border-white/20 bg-white/15 text-white">
                  <Sparkles className="mr-1 h-3.5 w-3.5" /> New quest every day
                </Badge>
                <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
                  Today&apos;s English Word Quest
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-violet-100 sm:text-base">
                  Build your vocabulary with words from the Everyday, Academic,
                  Word Power, and Advanced English courses.
                </p>
              </div>
              <StatsStrip data={data} />
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Choose your pace</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              You can complete one quest each day. Pick the level that feels right.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {modes.map(({ mode: modeName, questionCount }) => {
              const details = MODE_DETAILS[modeName];
              const Icon = details.icon;
              const selected = mode === modeName;
              return (
                <button
                  key={modeName}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setMode(modeName)}
                  className={`rounded-2xl border-2 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 dark:bg-surface-indigo ${
                    selected
                      ? `${details.selected} ring-4`
                      : 'border-slate-200 ring-transparent dark:border-surface-raised'
                  }`}
                >
                  <div className={`inline-flex rounded-xl p-3 ${details.accent}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">{details.title}</h3>
                    <Badge variant="secondary">{questionCount} questions</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{details.description}</p>
                  <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">{details.time}</p>
                </button>
              );
            })}
          </div>
          <Button
            size="lg"
            className="mt-6 w-full bg-violet-600 font-bold hover:bg-violet-700 sm:w-auto sm:min-w-56"
            disabled={starting}
            onClick={startQuest}
          >
            {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Start {MODE_DETAILS[mode].title} Quest
          </Button>
        </section>
      </div>
    );
  }

  if (session.status === 'COMPLETED') {
    const percent = session.totalQuestions
      ? Math.round((session.correctCount / session.totalQuestions) * 100)
      : 0;
    return (
      <div className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center pb-10">
        <Card className="w-full overflow-hidden rounded-3xl border-0 bg-white text-center shadow-2xl dark:bg-surface-indigo">
          <div className="bg-gradient-to-br from-violet-700 via-indigo-700 to-sky-700 px-6 py-10 text-white">
            <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-white/15 ring-8 ring-white/10">
              <Trophy className="h-12 w-12 text-amber-300" />
            </div>
            <p className="mt-6 text-sm font-bold uppercase tracking-[0.25em] text-violet-100">Quest complete</p>
            <h1 className="mt-2 text-4xl font-black">You showed up and learned!</h1>
            <p className="mt-3 text-violet-100">Come back tomorrow for fresh English words.</p>
          </div>
          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-surface-raised/60">
                <p className="text-2xl font-black text-slate-900 dark:text-white">{percent}%</p>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Score</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-surface-raised/60">
                <p className="text-2xl font-black text-violet-600">+{session.pointsEarned}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">XP</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-surface-raised/60">
                <p className="text-2xl font-black text-orange-500">{data.stats.currentStreak}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Day streak</p>
              </div>
            </div>
            <p className="mt-6 text-sm text-slate-600 dark:text-slate-300">
              You answered <strong>{session.correctCount} of {session.totalQuestions}</strong> questions correctly.
              Every completed quest strengthens your learning habit.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button onClick={() => navigate(-1)}>Done for today</Button>
              <Button variant="outline" onClick={() => navigate('/games/language-quest')}>
                Keep learning <Zap className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const item = session.currentItem;
  const progress = session.totalQuestions
    ? (session.currentIndex / session.totalQuestions) * 100
    : 0;

  if (!item) return null;

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <div className="mb-5 flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Leave Daily Quest" onClick={() => navigate(-1)}>
          <X className="h-5 w-5" />
        </Button>
        <Progress value={progress} className="h-3 flex-1" />
        <span className="min-w-14 text-right text-sm font-black text-slate-700 dark:text-slate-200">
          {session.currentIndex + 1}/{session.totalQuestions}
        </span>
      </div>

      <Card className="overflow-hidden rounded-3xl border-slate-200 bg-white shadow-xl shadow-slate-950/5 dark:border-surface-raised dark:bg-surface-indigo">
        <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50 to-sky-50 p-5 dark:border-surface-raised dark:from-violet-950/30 dark:to-sky-950/20 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-violet-600 text-white">{item.subject}</Badge>
            <Badge variant="outline">{item.difficulty}</Badge>
            {item.isReview && (
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                Review question
              </Badge>
            )}
          </div>
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">{item.sourceLabel}</p>
          {item.passageText && (
            <blockquote className="mt-5 rounded-xl border-l-4 border-violet-400 bg-white/75 p-4 text-sm leading-6 text-slate-700 dark:bg-surface-raised/70 dark:text-slate-200">
              {item.passageText}
            </blockquote>
          )}
          {item.imageUrl && (
            <img
              src={item.imageUrl}
              alt=""
              className="mt-5 max-h-72 w-full rounded-xl border border-slate-200 object-contain dark:border-surface-raised"
            />
          )}
          <h1 className="mt-5 text-2xl font-black leading-snug text-slate-950 dark:text-white sm:text-3xl">
            {item.prompt}
          </h1>
        </div>

        <div className="space-y-3 p-5 sm:p-7">
          {item.options.map((option, index) => {
            const selected = selectedOptionId === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                disabled={Boolean(feedback)}
                onClick={() => setSelectedOptionId(option.id)}
                className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                  selected
                    ? 'border-violet-500 bg-violet-50 text-violet-950 ring-4 ring-violet-500/10 dark:bg-violet-950/30 dark:text-white'
                    : 'border-slate-200 hover:border-violet-300 hover:bg-slate-50 dark:border-surface-raised dark:hover:bg-surface-raised/50'
                }`}
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black ${
                  selected ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-surface-raised dark:text-slate-300'
                }`}>
                  {String.fromCharCode(65 + index)}
                </span>
                {option.emoji && <span className="text-2xl" aria-hidden="true">{option.emoji}</span>}
                <span className="font-bold text-slate-800 dark:text-slate-100">{option.text}</span>
              </button>
            );
          })}
        </div>

        {!feedback && (
          <div className="border-t border-slate-100 p-5 dark:border-surface-raised sm:px-7">
            <Button
              size="lg"
              className="w-full bg-violet-600 font-bold hover:bg-violet-700"
              disabled={!selectedOptionId || answering}
              onClick={submitAnswer}
            >
              {answering && <Loader2 className="h-4 w-4 animate-spin" />}
              Check answer
            </Button>
          </div>
        )}

        {feedback && (
          <div className={`border-t p-5 sm:px-7 ${
            feedback.correct
              ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
              : 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 rounded-full p-2 text-white ${feedback.correct ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                {feedback.correct ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className={`text-lg font-black ${feedback.correct ? 'text-emerald-800 dark:text-emerald-200' : 'text-rose-800 dark:text-rose-200'}`}>
                  {feedback.correct ? 'Excellent!' : 'Keep learning!'}
                </h2>
                {!feedback.correct && (
                  <p className="mt-1 text-sm text-rose-700 dark:text-rose-200">
                    Correct answer: <strong>{feedback.correctAnswer}</strong>
                  </p>
                )}
                {feedback.explanation && (
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{feedback.explanation}</p>
                )}
              </div>
            </div>
            <Button
              size="lg"
              className={`mt-5 w-full font-bold ${feedback.correct ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
              onClick={continueQuest}
            >
              {feedback.completed ? 'See my results' : 'Continue'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
