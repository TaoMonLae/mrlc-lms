import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { ArrowLeft, Check, Flame, Heart, PartyPopper, Star, Volume2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ApiError, apiGet, apiSend } from '@/src/lib/api';
import type { LanguageQuestLessonPayload, LanguageQuestLessonPreview, LanguageQuestProfile } from '@/src/types/languageQuest';

interface AnswerResult {
  correct: boolean;
  correctOptionId: string;
  correctAnswer: string;
  pointsAwarded: number;
  profile: LanguageQuestProfile;
}

function speechLocale(language: string): string {
  const locales: Record<string, string> = {
    english: 'en-US',
    spanish: 'es-ES',
    chinese: 'zh-CN',
    mandarin: 'zh-CN',
    'mandarin chinese': 'zh-CN',
    burmese: 'my-MM',
    myanmar: 'my-MM',
    mon: 'mnw-MM',
    french: 'fr-FR',
    italian: 'it-IT',
    japanese: 'ja-JP',
  };
  return locales[language.trim().toLowerCase()] || language;
}

function speak(value: string, language: string) {
  if (!('speechSynthesis' in window)) {
    toast.info('Speech is not supported by this browser');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(value);
  utterance.lang = speechLocale(language);
  utterance.rate = 0.88;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

export default function LanguageQuestLesson() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const [lesson, setLesson] = useState<LanguageQuestLessonPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [answer, setAnswer] = useState<AnswerResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [sessionPoints, setSessionPoints] = useState(0);
  const [profile, setProfile] = useState<LanguageQuestProfile | null>(null);
  const [phase, setPhase] = useState<'learn' | 'quiz'>('learn');
  const [preview, setPreview] = useState<LanguageQuestLessonPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [combo, setCombo] = useState(0);

  useEffect(() => {
    if (!lessonId) return;
    setPhase('learn');
    setPreviewIndex(0);
    setIndex(0);
    setSelectedId(null);
    setAnswer(null);
    setSessionPoints(0);
    setCombo(0);

    apiGet<LanguageQuestLessonPayload>(`/api/language-quest/lessons/${lessonId}`)
      .then((payload) => { setLesson(payload); setProfile(payload.profile); })
      .catch((error: any) => toast.error(error?.message || 'Could not load the lesson'))
      .finally(() => setLoading(false));

    setPreviewLoading(true);
    apiGet<LanguageQuestLessonPreview>(`/api/language-quest/lessons/${lessonId}/preview`)
      .then(setPreview)
      .catch(() => setPreview(null))
      .finally(() => setPreviewLoading(false));

    return () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); };
  }, [lessonId]);

  // Nothing to teach (or the preview failed to load) — go straight to the quiz.
  useEffect(() => {
    if (phase === 'learn' && !previewLoading && (!preview || preview.cards.length === 0)) {
      setPhase('quiz');
    }
  }, [phase, previewLoading, preview]);

  const challenge = lesson?.challenges[index];
  const progressPercent = lesson ? Math.round((Math.min(index, lesson.challenges.length) / lesson.challenges.length) * 100) : 0;
  const finished = Boolean(lesson && index >= lesson.challenges.length);
  const cards = preview?.cards ?? [];
  const card = cards[previewIndex];
  // Practising an already-completed challenge is how hearts get refilled, so
  // only gate challenges the learner hasn't cleared yet (matches the server
  // check in the answer endpoint).
  const outOfHearts = Boolean(challenge && !challenge.completed && (profile?.hearts ?? 1) <= 0);

  const optionLetters = useMemo(() => ['A', 'B', 'C', 'D', 'E', 'F'], []);

  const startPractice = () => {
    confetti({ particleCount: 60, spread: 65, origin: { y: 0.7 }, colors: [lesson?.course.accentColor || '#7c3aed', '#ffffff'] });
    setPhase('quiz');
  };

  const checkAnswer = async () => {
    if (!challenge || !selectedId || checking || answer) return;
    setChecking(true);
    try {
      const result = await apiSend<AnswerResult>(`/api/language-quest/challenges/${challenge.id}/answer`, 'POST', { optionId: selectedId });
      setAnswer(result);
      setProfile(result.profile);
      if (result.correct) {
        setSessionPoints((current) => current + result.pointsAwarded);
        setCombo((current) => current + 1);
        confetti({ particleCount: 40, spread: 55, origin: { y: 0.65 }, scalar: 0.8, colors: [lesson?.course.accentColor || '#7c3aed'] });
      } else {
        setCombo(0);
      }
    } catch (error: any) {
      if (error instanceof ApiError && error.code === 'OUT_OF_HEARTS') {
        if (error.data?.profile) setProfile(error.data.profile);
        toast.error(error.message);
      } else {
        toast.error(error?.message || 'Could not check that answer');
      }
    } finally {
      setChecking(false);
    }
  };

  const continueLesson = () => {
    if (!answer) return;
    if (answer.correct) setIndex((current) => current + 1);
    setSelectedId(null);
    setAnswer(null);
  };

  // Celebrate finishing the lesson with a bigger burst.
  useEffect(() => {
    if (!finished) return;
    confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 }, colors: [lesson?.course.accentColor || '#7c3aed', '#f59e0b', '#10b981'] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  // Keyboard shortcuts: arrows/space to browse flashcards in learn mode,
  // number or letter keys to pick an answer and Enter to confirm/continue
  // in quiz mode. Keeps the pace up for learners who'd rather not reach for
  // the mouse every time.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      if (loading || !lesson) return;

      if (phase === 'learn') {
        if (event.key === 'ArrowRight' || event.key === 'Enter') {
          event.preventDefault();
          if (previewIndex + 1 < cards.length) setPreviewIndex((current) => current + 1);
          else if (cards.length) startPractice();
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          setPreviewIndex((current) => Math.max(0, current - 1));
        } else if (event.key === ' ' && card) {
          event.preventDefault();
          speak(card.audioText || card.text, lesson.course.language);
        }
        return;
      }

      if (phase === 'quiz' && challenge && !finished && !outOfHearts) {
        const letterIndex = optionLetters.indexOf(event.key.toUpperCase());
        const numberIndex = Number(event.key) - 1;
        const optionIndex = letterIndex >= 0 ? letterIndex : numberIndex;
        if (!answer && optionIndex >= 0 && optionIndex < challenge.options.length) {
          event.preventDefault();
          setSelectedId(challenge.options[optionIndex].id);
          return;
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          if (answer) continueLesson();
          else if (selectedId && !checking) checkAnswer();
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, loading, lesson, previewIndex, cards.length, card, challenge, answer, selectedId, finished, outOfHearts, optionLetters, checking]);

  if (loading) {
    return <div className="grid min-h-[520px] place-items-center"><div className="h-11 w-11 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" /></div>;
  }

  if (!lesson) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-surface-raised dark:bg-surface-indigo">
        <p className="font-semibold text-slate-900 dark:text-white">This lesson is unavailable.</p>
        <Button className="mt-4" variant="outline" render={<Link to="/games/language-quest" />} nativeButton={false}>Back to Language Quest</Button>
      </div>
    );
  }

  if (phase === 'learn') {
    const learnProgress = cards.length ? Math.round((previewIndex / cards.length) * 100) : 0;
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-3xl flex-col pb-6">
        <header className="flex items-center gap-3 py-2 sm:gap-5">
          <Button variant="ghost" size="icon" aria-label="Exit lesson" render={<Link to={`/games/language-quest/courses/${lesson.course.id}`} />} nativeButton={false}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Progress value={learnProgress} className="flex-1 [&_[data-slot=progress-track]]:h-3 [&_[data-slot=progress-indicator]]:bg-sky-500" />
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-600" onClick={() => setPhase('quiz')}>Skip to practice</Button>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          {previewLoading || !card ? (
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-200 border-t-sky-500" />
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-600">Learn • {previewIndex + 1} of {cards.length}</p>
              <button
                type="button"
                onClick={() => speak(card.audioText || card.text, lesson.course.language)}
                className="mt-8 flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl border-2 border-slate-200 bg-white px-10 py-12 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md dark:border-surface-raised dark:bg-surface-indigo"
              >
                {card.emoji && <span className="text-6xl" aria-hidden="true">{card.emoji}</span>}
                <span className="text-3xl font-black text-slate-900 dark:text-white">{card.text}</span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-sky-600"><Volume2 className="h-3.5 w-3.5" /> Tap to listen</span>
              </button>
              <p className="mt-6 max-w-md text-sm text-slate-500 dark:text-slate-300">{card.prompt}</p>
            </>
          )}
        </main>

        <footer className="-mx-4 mt-auto border-t border-slate-200 px-4 py-4 sm:-mx-6 sm:px-6 dark:border-surface-raised">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <Button variant="outline" onClick={() => setPreviewIndex((current) => Math.max(0, current - 1))} disabled={previewIndex === 0}>
              Back
            </Button>
            {previewIndex + 1 < cards.length ? (
              <Button style={{ backgroundColor: lesson.course.accentColor }} onClick={() => setPreviewIndex((current) => current + 1)} disabled={!card}>
                Next
              </Button>
            ) : (
              <Button style={{ backgroundColor: lesson.course.accentColor }} onClick={startPractice} disabled={!card}>
                Start practice
              </Button>
            )}
          </div>
        </footer>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="mx-auto flex min-h-[560px] max-w-2xl flex-col items-center justify-center text-center">
        <div className="relative grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-white shadow-xl">
          <PartyPopper className="h-12 w-12" />
          <span className="absolute -right-2 top-2 text-3xl">✨</span>
          <span className="absolute -left-3 bottom-3 text-2xl">⭐</span>
        </div>
        <h1 className="mt-7 text-3xl font-black text-slate-900 dark:text-white">Lesson complete!</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-300">You finished <strong>{lesson.title}</strong>. Great work!</p>
        <div className="mt-7 grid w-full grid-cols-2 gap-3">
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
            <Star className="mx-auto h-6 w-6 fill-amber-500 text-amber-500" />
            <p className="mt-2 text-2xl font-black text-amber-700 dark:text-amber-400">+{sessionPoints}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600/70">Points earned</p>
          </div>
          <div className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-4 dark:border-orange-500/20 dark:bg-orange-500/10">
            <Flame className="mx-auto h-6 w-6 fill-orange-500 text-orange-500" />
            <p className="mt-2 text-2xl font-black text-orange-700 dark:text-orange-400">{profile?.currentStreak ?? 0}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-600/70">Day streak</p>
          </div>
        </div>
        <div className="mt-7 flex w-full flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="flex-1" onClick={() => { setIndex(0); setSessionPoints(0); }}>
            Practise again
          </Button>
          <Button className="flex-1" style={{ backgroundColor: lesson.course.accentColor }} render={<Link to={`/games/language-quest/courses/${lesson.course.id}`} />} nativeButton={false}>
            Continue the path
          </Button>
        </div>
      </div>
    );
  }

  if (!challenge) return null;

  if (outOfHearts) {
    return (
      <div className="mx-auto flex min-h-[560px] max-w-2xl flex-col items-center justify-center text-center">
        <div className="grid h-24 w-24 place-items-center rounded-full bg-rose-100 text-rose-500 dark:bg-rose-500/10">
          <Heart className="h-10 w-10" />
        </div>
        <h1 className="mt-6 text-2xl font-black text-slate-900 dark:text-white">Out of hearts for now</h1>
        <p className="mt-2 max-w-sm text-slate-500 dark:text-slate-300">
          No worries — hearts refill every day. In the meantime, replay a lesson you've already finished to earn some back.
        </p>
        <div className="mt-7 w-full">
          <Button className="w-full" style={{ backgroundColor: lesson.course.accentColor }} render={<Link to={`/games/language-quest/courses/${lesson.course.id}`} />} nativeButton={false}>
            Back to course
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-3xl flex-col pb-6">
      <header className="flex items-center gap-3 py-2 sm:gap-5">
        <Button variant="ghost" size="icon" aria-label="Exit lesson" render={<Link to={`/games/language-quest/courses/${lesson.course.id}`} />} nativeButton={false}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Progress value={progressPercent} className="flex-1 [&_[data-slot=progress-track]]:h-3 [&_[data-slot=progress-indicator]]:bg-violet-600" />
        {combo >= 2 && (
          <div className="hidden items-center gap-1 text-sm font-black text-orange-500 sm:flex" title={`${combo} in a row`}>
            <Flame className="h-5 w-5 fill-current" /> {combo}
          </div>
        )}
        <div className="flex items-center gap-1 text-sm font-black text-rose-500"><Heart className="h-5 w-5 fill-current" /> {profile?.hearts ?? 0}</div>
        <div className="hidden items-center gap-1 text-sm font-black text-amber-500 sm:flex"><Star className="h-5 w-5 fill-current" /> {profile?.points ?? 0}</div>
      </header>

      <main className="flex flex-1 flex-col justify-center py-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">{lesson.title} • {index + 1} of {lesson.challenges.length}</p>
        <div className="mt-3 flex items-start justify-between gap-4">
          <h1 className="max-w-2xl text-2xl font-black leading-tight text-slate-900 dark:text-white sm:text-3xl">{challenge.question}</h1>
          <Button variant="outline" size="icon" className="shrink-0 rounded-full" onClick={() => speak(challenge.question, lesson.course.language)} aria-label="Read question aloud">
            <Volume2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {challenge.options.map((option, optionIndex) => {
            const selected = selectedId === option.id;
            const isCorrect = Boolean(answer && option.id === answer.correctOptionId);
            const isWrongSelection = Boolean(answer && selected && !answer.correct);
            return (
              <div key={option.id} className="relative">
                <button
                  type="button"
                  disabled={Boolean(answer)}
                  onClick={() => setSelectedId(option.id)}
                  className={`group flex min-h-24 w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 disabled:cursor-default ${option.audioText ? 'pr-14' : ''} ${
                    isCorrect
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                      : isWrongSelection
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/10'
                        : selected
                          ? 'border-violet-500 bg-violet-50 shadow-sm dark:bg-violet-500/10'
                          : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md dark:border-surface-raised dark:bg-surface-indigo'
                  }`}
                >
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black ${selected ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-surface-raised dark:text-slate-300'}`}>{optionLetters[optionIndex]}</span>
                  {option.emoji && <span className="text-3xl" aria-hidden="true">{option.emoji}</span>}
                  <span className="flex-1 font-semibold text-slate-800 dark:text-white">{option.text}</span>
                </button>
                {option.audioText && (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-violet-600 dark:hover:bg-surface-raised"
                    onClick={() => speak(option.audioText || option.text, lesson.course.language)}
                    aria-label={`Listen to ${option.text}`}
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </main>

      <footer className={`-mx-4 mt-auto border-t px-4 py-4 sm:-mx-6 sm:px-6 ${answer?.correct ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10' : answer ? 'border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10' : 'border-slate-200 dark:border-surface-raised'}`}>
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="min-h-12">
            {answer?.correct && (
              <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500 text-white"><Check className="h-6 w-6" /></div>
                <div><p className="font-black">Excellent!</p><p className="text-xs">+{answer.pointsAwarded} points</p></div>
              </div>
            )}
            {answer && !answer.correct && (
              <div className="flex items-center gap-3 text-rose-700 dark:text-rose-400">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-rose-500 text-white"><X className="h-6 w-6" /></div>
                <div><p className="font-black">Not quite — try again</p><p className="text-xs">Correct answer: {answer.correctAnswer}</p></div>
              </div>
            )}
          </div>
          {answer ? (
            <Button onClick={continueLesson} className={answer.correct ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}>
              {answer.correct ? 'Continue' : 'Try again'}
            </Button>
          ) : (
            <Button onClick={checkAnswer} disabled={!selectedId || checking} style={selectedId ? { backgroundColor: lesson.course.accentColor } : undefined}>
              {checking ? 'Checking…' : 'Check answer'}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
