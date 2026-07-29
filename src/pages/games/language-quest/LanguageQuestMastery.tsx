import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Brain, CheckCircle2, Clock3, RotateCcw, Sparkles, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { apiGet, apiSend } from '@/src/lib/api';
import type { LanguageQuestOption, LanguageQuestProfile } from '@/src/types/languageQuest';
import { LanguageQuestPinyinText } from '@/src/components/games/LanguageQuestPinyinText';
import { useLanguageQuestPreferences } from '@/src/components/games/LanguageQuestPreferences';
import { playLanguageQuestSuccessSound } from '@/src/lib/languageQuestAudio';
import { LanguageQuestRewardReveal } from '@/src/components/games/LanguageQuestRewards';

interface MasteryCard {
  challengeId: string;
  stage: number;
  question: string;
  course: { id: string; title: string; language: string; accentColor: string };
  options: LanguageQuestOption[];
}

interface MasteryPayload {
  dueCount: number;
  cards: MasteryCard[];
}

interface MasteryResult {
  correct: boolean;
  correctOptionId: string;
  correctAnswer: string;
  pointsAwarded: number;
  nextDueAt: string;
  profile?: LanguageQuestProfile;
  unlockedRewardIds?: string[];
}

export default function LanguageQuestMastery() {
  const { soundEnabled } = useLanguageQuestPreferences();
  const [payload, setPayload] = useState<MasteryPayload | null>(null);
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState('');
  const [result, setResult] = useState<MasteryResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [sessionXp, setSessionXp] = useState(0);
  const [unlockedAwardId, setUnlockedAwardId] = useState<string | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);

  const load = () => {
    apiGet<MasteryPayload>('/api/language-quest/mastery')
      .then((data) => {
        setPayload(data);
        setIndex(0);
        setSelectedId('');
        setResult(null);
      })
      .catch((error: any) => toast.error(error?.message || 'Could not load mastery reviews'));
  };

  useEffect(load, []);

  const card = payload?.cards[index];
  const done = Boolean(payload && index >= payload.cards.length);

  const check = async () => {
    if (!card || !selectedId || checking) return;
    setChecking(true);
    try {
      const answer = await apiSend<MasteryResult>(
        `/api/language-quest/mastery/${card.challengeId}/answer`,
        'POST',
        { optionId: selectedId },
      );
      setResult(answer);
      if (answer.correct) {
        setSessionXp((current) => current + answer.pointsAwarded);
        if (soundEnabled) playLanguageQuestSuccessSound();
        const newestAwardId = answer.unlockedRewardIds?.at(-1);
        if (newestAwardId) {
          setUnlockedAwardId(newestAwardId);
          setRevealOpen(true);
        }
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
    setResult(null);
  };

  if (!payload) return <div className="grid min-h-[420px] place-items-center"><div className="h-11 w-11 animate-spin rounded-full border-4 border-fuchsia-200 border-t-fuchsia-600" /></div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" className="-ml-2" render={<Link to="/games/language-quest" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Language Quest
        </Button>
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-200">
          <Star className="h-3.5 w-3.5 fill-current" /> {sessionXp} XP this session
        </Badge>
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-700 via-violet-800 to-sky-700 p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/15"><Brain className="h-8 w-8" /></span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">Spaced repetition</p>
            <h1 className="mt-1 text-3xl font-black">Mastery Arena</h1>
            <p className="mt-1 text-sm text-white/80">Review at the right time to make each phrase stick.</p>
          </div>
        </div>
      </section>

      {payload.cards.length === 0 || done ? (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-10 text-center shadow-sm dark:border-emerald-500/20 dark:bg-emerald-950/20">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
          <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">Reviews complete</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {sessionXp > 0 ? `You strengthened your memory and earned ${sessionXp} XP.` : 'Finish lessons to build your review deck, then return when cards are due.'}
          </p>
          <Button className="mt-6" render={<Link to="/games/language-quest" />} nativeButton={false}>Choose a course</Button>
        </section>
      ) : card && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <Badge style={{ borderColor: card.course.accentColor, color: card.course.accentColor }} variant="outline">{card.course.title}</Badge>
            <span className="text-xs font-black text-slate-500">Review {index + 1}/{payload.cards.length} • Strength {card.stage}</span>
          </div>
          <Progress value={((index + 1) / payload.cards.length) * 100} className="mt-4" />
          <h2 className="mt-7 text-2xl font-black leading-tight text-slate-950 dark:text-white sm:text-3xl">{card.question}</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {card.options.map((option) => {
              const selected = selectedId === option.id;
              const correct = result && option.id === result.correctOptionId;
              const wrong = result && selected && !result.correct;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={Boolean(result)}
                  onClick={() => setSelectedId(option.id)}
                  className={`flex min-h-20 items-center gap-3 rounded-2xl border-2 p-4 text-left transition ${
                    correct ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                      : wrong ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/10'
                        : selected ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10'
                          : 'border-slate-200 hover:border-violet-300 dark:border-slate-700'
                  }`}
                >
                  <span className="text-2xl">{option.emoji || '💬'}</span>
                  <span className="font-black text-slate-900 dark:text-white">
                    <LanguageQuestPinyinText text={option.text} pinyin={option.pinyin} />
                  </span>
                </button>
              );
            })}
          </div>

          {result && (
            <div className={`mt-5 rounded-2xl border p-4 ${result.correct ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/25 dark:bg-emerald-950/25 dark:text-emerald-100' : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/25 dark:bg-amber-950/25 dark:text-amber-100'}`}>
              <p className="font-black">{result.correct ? `Memory win! +${result.pointsAwarded} XP` : `Review again: ${result.correctAnswer}`}</p>
              <p className="mt-1 text-xs opacity-80"><Clock3 className="mr-1 inline h-3.5 w-3.5" /> This card will return at the next helpful review time.</p>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            {!result ? (
              <Button onClick={check} disabled={!selectedId || checking} className="rounded-xl bg-violet-700 text-white hover:bg-violet-800">
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
