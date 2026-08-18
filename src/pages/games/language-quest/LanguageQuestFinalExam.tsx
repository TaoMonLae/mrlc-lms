import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import confetti from 'canvas-confetti';
import { AlertTriangle, ArrowLeft, Award, Check, CheckCircle2, Clock3, Expand, FileCheck2, Headphones, Keyboard, LockKeyhole, ShieldAlert, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ApiError, apiGet, apiSend, authHeaders } from '@/src/lib/api';
import type { LanguageQuestOption } from '@/src/types/languageQuest';
import { LanguageQuestContentText } from '@/src/components/games/LanguageQuestContentText';
import { LanguageQuestQuestionText } from '@/src/components/games/LanguageQuestQuestionText';
import { useLanguageQuestPreferences } from '@/src/components/games/LanguageQuestPreferences';
import { playLanguageQuestProtectedVoice, speakLanguageQuestVoice } from '@/src/lib/languageQuestVoice';
import { languageQuestCourseMode, languageQuestCourseUsesStudyCards } from '@/shared/languageQuest';

interface FinalExamStatus {
  available: boolean;
  unlocked: boolean;
  eligibleQuestionCount: number;
  minQuestions: number;
  questionCount: number;
  passPercent: number;
  attemptMinutes: number;
  passed: boolean;
  certificateEligible: boolean;
  passedAt: string | null;
  bestScorePercent: number | null;
  latestAttempt: { status: string; scorePercent: number | null; submittedAt: string | null; violationReason: string | null } | null;
  retryAt: string | null;
}

interface CoursePayload {
  id: string;
  title: string;
  language: string;
  accentColor: string;
  finalExam: FinalExamStatus;
}

interface ExamCard {
  challengeId: string;
  type: string;
  question: string;
  secureAudio: boolean;
  speechText: string | null;
  options: LanguageQuestOption[];
}

interface ExamAnswer {
  optionId: string | null;
  typedAnswer: string | null;
}

interface ExamPayload {
  attemptId: string;
  expiresAt: string;
  passPercent: number;
  course: { id: string; title: string; language: string; accentColor: string };
  cards: ExamCard[];
}

interface ExamResult {
  results: Array<{ challengeId: string; correct: boolean }>;
  correctCount: number;
  total: number;
  requiredCorrect: number;
  scorePercent: number;
  passed: boolean;
  certificateUnlocked: boolean;
  passedAt: string | null;
}

type ViolationReason = 'TAB_HIDDEN' | 'WINDOW_BLUR' | 'FULLSCREEN_EXIT' | 'PAGE_EXIT';

function formatRemaining(totalSeconds: number) {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function violationMessage(reason: ViolationReason) {
  if (reason === 'TAB_HIDDEN') return 'The exam ended because the tab or app was hidden.';
  if (reason === 'WINDOW_BLUR') return 'The exam ended because focus moved to another window or screen.';
  if (reason === 'FULLSCREEN_EXIT') return 'The exam ended because secure full-screen mode was closed.';
  return 'The exam ended because the exam screen was left.';
}

export default function LanguageQuestFinalExam() {
  const { courseId } = useParams<{ courseId: string }>();
  const { reducedMotion } = useLanguageQuestPreferences();
  const [course, setCourse] = useState<CoursePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [starting, setStarting] = useState(false);
  const [payload, setPayload] = useState<ExamPayload | null>(null);
  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState('');
  const [spellingAnswer, setSpellingAnswer] = useState('');
  const [answers, setAnswers] = useState<Record<string, ExamAnswer>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [terminatedReason, setTerminatedReason] = useState<ViolationReason | null>(null);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const terminatingRef = useRef(false);
  const finishingRef = useRef(false);
  const startedFullscreenRef = useRef(false);

  const loadCourse = useCallback(() => {
    if (!courseId) return;
    setLoading(true);
    setLoadError(null);
    apiGet<CoursePayload>(`/api/language-quest/courses/${courseId}`)
      .then(setCourse)
      .catch((error: any) => setLoadError(error?.message || 'Could not load the final exam'))
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(loadCourse, [loadCourse]);

  useEffect(() => {
    if (!course?.finalExam.retryAt) return;
    const timer = window.setInterval(() => setClockNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [course?.finalExam.retryAt]);

  const recordViolation = useCallback(async (reason: ViolationReason) => {
    if (!courseId || !payload || result || terminatingRef.current || finishingRef.current) return;
    terminatingRef.current = true;
    setTerminatedReason(reason);
    try {
      await apiSend(`/api/language-quest/courses/${courseId}/final-exam/violation`, 'POST', {
        attemptId: payload.attemptId,
        reason,
      });
    } catch {
      // The local screen remains terminated even if the connection drops; the
      // active attempt cannot be submitted by this page after an integrity exit.
    }
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  }, [courseId, payload, result]);

  useEffect(() => {
    if (!payload || result || terminatedReason) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onVisibilityChange = () => {
      if (document.hidden) void recordViolation('TAB_HIDDEN');
    };
    const onFullscreenChange = () => {
      if (startedFullscreenRef.current && !document.fullscreenElement && !finishingRef.current) {
        void recordViolation('FULLSCREEN_EXIT');
      }
    };
    const onWindowBlur = () => {
      if (!finishingRef.current) void recordViolation('WINDOW_BLUR');
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const onPageHide = () => {
      if (finishingRef.current) return;
      void fetch(`/api/language-quest/courses/${courseId}/final-exam/violation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        credentials: 'include',
        keepalive: true,
        body: JSON.stringify({ attemptId: payload.attemptId, reason: 'PAGE_EXIT' }),
      });
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [courseId, payload, recordViolation, result, terminatedReason]);

  const submitExam = useCallback(async (nextAnswers: Record<string, ExamAnswer>) => {
    if (!courseId || !payload || finishingRef.current || terminatingRef.current) return;
    finishingRef.current = true;
    setSubmitting(true);
    try {
      const response = await apiSend<ExamResult>(
        `/api/language-quest/courses/${courseId}/final-exam/finish`,
        'POST',
        {
          attemptId: payload.attemptId,
          answers: payload.cards.map((card) => ({
            challengeId: card.challengeId,
            optionId: nextAnswers[card.challengeId]?.optionId ?? null,
            typedAnswer: nextAnswers[card.challengeId]?.typedAnswer ?? null,
          })),
        },
      );
      setResult(response);
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
      if (response.passed && !reducedMotion) {
        void confetti({ particleCount: 180, spread: 110, origin: { y: 0.55 }, colors: ['#f59e0b', '#7c3aed', '#10b981'] });
      }
    } catch (error: any) {
      toast.error(error?.message || 'Could not submit the final exam');
      finishingRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }, [courseId, payload, reducedMotion]);

  useEffect(() => {
    if (!payload || result || terminatedReason || submitting) return;
    const tick = () => {
      const remaining = Math.max(0, (new Date(payload.expiresAt).getTime() - Date.now()) / 1000);
      setSecondsLeft(remaining);
      if (remaining <= 0 && !finishingRef.current) void submitExam(answers);
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [answers, payload, result, submitExam, submitting, terminatedReason]);

  const startExam = async () => {
    if (!courseId || !acknowledged || starting) return;
    setStarting(true);
    terminatingRef.current = false;
    finishingRef.current = false;
    try {
      if (document.fullscreenEnabled && document.documentElement.requestFullscreen) {
        try {
          await document.documentElement.requestFullscreen();
          startedFullscreenRef.current = true;
        } catch {
          toast.error('Full-screen permission is required to start this exam.');
          return;
        }
      } else {
        startedFullscreenRef.current = false;
      }
      const response = await apiSend<ExamPayload>(
        `/api/language-quest/courses/${courseId}/final-exam/start`,
        'POST',
        {},
      );
      setPayload(response);
      setIndex(0);
      setAnswers({});
      setSelectedId('');
      setSpellingAnswer('');
      setResult(null);
      setTerminatedReason(null);
    } catch (error: any) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
      if (error instanceof ApiError) toast.error(error.message);
      else toast.error(error?.message || 'Could not start the final exam');
      loadCourse();
    } finally {
      setStarting(false);
    }
  };

  const lockAnswer = () => {
    const card = payload?.cards[index];
    const isSpelling = card?.type === 'DICTATION';
    if (!payload || !card || submitting || (isSpelling ? !spellingAnswer.trim() : !selectedId)) return;
    const nextAnswers = {
      ...answers,
      [card.challengeId]: isSpelling
        ? { optionId: null, typedAnswer: spellingAnswer.trim() }
        : { optionId: selectedId, typedAnswer: null },
    };
    setAnswers(nextAnswers);
    setSelectedId('');
    setSpellingAnswer('');
    if (index + 1 < payload.cards.length) setIndex((current) => current + 1);
    else void submitExam(nextAnswers);
  };

  if (loading) return <div className="grid min-h-[440px] place-items-center"><div className="h-11 w-11 animate-spin rounded-full border-4 border-violet-200 border-t-violet-700" /></div>;

  if (loadError || !course) {
    return (
      <div className="mx-auto max-w-2xl space-y-5 pb-12">
        <Button variant="ghost" render={<Link to="/games/language-quest" />} nativeButton={false}><ArrowLeft className="mr-2 h-4 w-4" /> Learning Quest</Button>
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-10 text-center dark:border-rose-500/25 dark:bg-rose-950/20">
          <ShieldAlert className="mx-auto h-12 w-12 text-rose-600" />
          <h1 className="mt-3 text-xl font-black text-slate-900 dark:text-white">Final exam unavailable</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{loadError || 'Course not found'}</p>
        </div>
      </div>
    );
  }

  const isMathematics = languageQuestCourseMode(course.language) === 'mathematics';
  const isSubjectCourse = !languageQuestCourseUsesStudyCards(course.language);

  if (payload && !result && !terminatedReason) {
    const card = payload.cards[index];
    const isSpelling = card.type === 'DICTATION';
    const progress = payload.cards.length ? ((index + 1) / payload.cards.length) * 100 : 0;
    return (
      <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-950 text-white [overscroll-behavior:none]" style={{ touchAction: 'pan-y' }}>
        <div className="mx-auto flex min-h-full max-w-5xl flex-col px-4 py-4 sm:px-8 sm:py-6">
          <header className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Monitored final exam</p>
                <h1 className="mt-1 text-lg font-black sm:text-xl">{payload.course.title}</h1>
              </div>
              <div className={`rounded-xl border px-4 py-2 text-right ${secondsLeft < 120 ? 'border-rose-400 bg-rose-500/15 text-rose-100' : 'border-white/15 bg-black/20'}`}>
                <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-white/60"><Clock3 className="h-3 w-3" /> Time remaining</p>
                <p className="font-mono text-xl font-black">{formatRemaining(secondsLeft)}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Progress value={progress} className="flex-1 [&_[data-slot=progress-track]]:bg-white/10 [&_[data-slot=progress-indicator]]:bg-amber-400" />
              <span className="text-xs font-black text-white/70">{index + 1}/{payload.cards.length}</span>
            </div>
            <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-100/90"><LockKeyhole className="h-3.5 w-3.5" /> Answers are locked after Continue. Leaving, hiding, switching, or closing this screen terminates the attempt.</p>
          </header>

          <main className="my-auto py-6 sm:py-10">
            <section className="rounded-3xl border border-white/10 bg-white p-5 text-slate-950 shadow-2xl sm:p-8">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-violet-600">
                {isSpelling && <Keyboard className="h-4 w-4" />} Question {index + 1}{isSpelling ? ' • Spelling' : ''}
              </p>
              <LanguageQuestQuestionText language={payload.course.language} text={card.question} headingLevel={2} className="mt-3" appearance="light" />
              {isSpelling ? (
                <div className="mt-6 rounded-2xl border-2 border-violet-200 bg-violet-50/70 p-4 sm:p-5">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-violet-300 bg-white text-violet-800 hover:bg-violet-100"
                    size="lg"
                    disabled={!card.secureAudio && !card.speechText}
                    onClick={() => void (card.secureAudio
                      ? playLanguageQuestProtectedVoice(
                        `/api/language-quest/courses/${payload.course.id}/final-exam/audio`,
                        { attemptId: payload.attemptId, challengeId: card.challengeId },
                      )
                      : speakLanguageQuestVoice(card.speechText || '', payload.course.language, 'browser')
                    ).then((voiceResult) => {
                      if (voiceResult === 'unavailable') toast.error('Secure spelling audio is unavailable. Ask your teacher before continuing.');
                    })}
                  >
                    <Headphones className="mr-2 h-5 w-5" /> Listen to the word or phrase
                  </Button>
                  <label className="mt-5 block text-sm font-black text-slate-800" htmlFor={`spelling-${card.challengeId}`}>Type exactly what you hear</label>
                  <input
                    id={`spelling-${card.challengeId}`}
                    type="text"
                    value={spellingAnswer}
                    onChange={(event) => setSpellingAnswer(event.target.value)}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    className="mt-2 h-14 w-full rounded-xl border-2 border-slate-300 bg-white px-4 text-lg font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-violet-600 focus:ring-4 focus:ring-violet-100"
                    placeholder="Enter your spelling"
                    aria-describedby={`spelling-help-${card.challengeId}`}
                  />
                  <p id={`spelling-help-${card.challengeId}`} className="mt-2 text-xs font-semibold leading-5 text-slate-600">You may replay the audio. Browser spelling suggestions are disabled, and your answer is checked using this course’s language rules.</p>
                </div>
              ) : (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {card.options.map((option) => {
                    const selected = selectedId === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={`min-h-16 rounded-2xl border-2 p-4 text-left font-bold transition ${selected ? 'border-violet-600 bg-violet-50 ring-2 ring-violet-200' : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/50'}`}
                        onClick={() => setSelectedId(option.id)}
                      >
                        <span className="flex items-center gap-3">
                          {option.emoji && <span className="text-2xl" aria-hidden="true">{option.emoji}</span>}
                          <span><LanguageQuestContentText language={payload.course.language} text={option.text} pinyin={option.pinyin} /></span>
                          {selected && <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-violet-700" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              <Button className="mt-7 w-full bg-violet-700 hover:bg-violet-800" size="lg" disabled={(isSpelling ? !spellingAnswer.trim() : !selectedId) || submitting} onClick={lockAnswer}>
                {index + 1 === payload.cards.length ? 'Submit final exam' : 'Lock answer and continue'}
              </Button>
            </section>
          </main>
        </div>
      </div>
    );
  }

  if (terminatedReason) {
    return (
      <div className="mx-auto max-w-2xl space-y-5 pb-12">
        <Button variant="ghost" render={<Link to={`/games/language-quest/courses/${course.id}`} />} nativeButton={false}><ArrowLeft className="mr-2 h-4 w-4" /> Back to course</Button>
        <section className="rounded-3xl border-2 border-rose-300 bg-rose-50 p-7 text-center dark:border-rose-500/30 dark:bg-rose-950/20 sm:p-10">
          <ShieldAlert className="mx-auto h-14 w-14 text-rose-600" />
          <h1 className="mt-4 text-2xl font-black text-slate-950 dark:text-white">Exam attempt terminated</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{violationMessage(terminatedReason)} This attempt cannot unlock a certificate.</p>
          <p className="mt-4 rounded-xl bg-white/70 p-3 text-xs font-bold text-rose-800 dark:bg-slate-950/40 dark:text-rose-200">A 15-minute review break applies before another attempt.</p>
        </section>
      </div>
    );
  }

  if (result) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 pb-12">
        <Button variant="ghost" render={<Link to={`/games/language-quest/courses/${course.id}`} />} nativeButton={false}><ArrowLeft className="mr-2 h-4 w-4" /> Back to course</Button>
        <section className={`rounded-3xl border-2 p-7 text-center shadow-xl sm:p-10 ${result.passed ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/25 dark:bg-emerald-950/20' : 'border-amber-300 bg-amber-50 dark:border-amber-500/25 dark:bg-amber-950/20'}`}>
          {result.passed ? <Award className="mx-auto h-16 w-16 text-emerald-600" /> : <FileCheck2 className="mx-auto h-16 w-16 text-amber-600" />}
          <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-slate-500">Final exam result</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{result.passed ? 'Certificate unlocked!' : 'Keep preparing'}</h1>
          <p className="mt-3 text-5xl font-black text-slate-950 dark:text-white">{result.scorePercent}%</p>
          <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{result.correctCount}/{result.total} correct • {result.requiredCorrect} required to pass</p>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            {result.passed
              ? 'Your monitored pass is saved. The new final-exam-verified certificate is now available in Achievements.'
              : `${isSubjectCourse ? 'Review the course topics and worked explanations.' : 'Review the course and your learned words.'} Correct answers stay hidden to protect future attempts; a 15-minute review break applies.`}
          </p>
          <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
            <Button variant="outline" render={<Link to={`/games/language-quest/courses/${course.id}`} />} nativeButton={false}>Review course</Button>
            <Button render={<Link to="/games/language-quest" />} nativeButton={false}>{result.passed ? 'View certificate' : 'Return to Learning Quest'}</Button>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-black text-slate-950 dark:text-white">Question report</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Use this to identify which course topics to revisit. Answer keys are not shown.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {result.results.map((entry, entryIndex) => (
              <div key={entry.challengeId} className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${entry.correct ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10' : 'border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10'}`}>
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-white ${entry.correct ? 'bg-emerald-500' : 'bg-rose-500'}`}>{entry.correct ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}</span>
                <div className="min-w-0 flex-1 font-semibold text-slate-800 dark:text-white">{payload?.cards[entryIndex] ? <LanguageQuestQuestionText language={course.language} text={payload.cards[entryIndex].question} headingLevel={3} compact /> : null}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  const retryAt = course.finalExam.retryAt ? new Date(course.finalExam.retryAt) : null;
  const waiting = Boolean(retryAt && retryAt.getTime() > clockNow);
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <Button variant="ghost" className="-ml-2" render={<Link to={`/games/language-quest/courses/${course.id}`} />} nativeButton={false}><ArrowLeft className="mr-2 h-4 w-4" /> {course.title}</Button>
      <section className="overflow-hidden rounded-3xl border border-violet-200 bg-white shadow-xl dark:border-violet-500/25 dark:bg-slate-950">
        <div className="bg-gradient-to-br from-violet-800 via-indigo-800 to-slate-950 p-6 text-white sm:p-8">
          <div className="flex items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/12"><FileCheck2 className="h-7 w-7" /></span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">Certificate final exam</p>
              <h1 className="mt-1 text-2xl font-black sm:text-3xl">{course.title}</h1>
              <p className="mt-2 text-sm text-white/75">Pass this monitored assessment to unlock the course certificate.</p>
            </div>
          </div>
        </div>
        <div className="space-y-5 p-5 sm:p-8">
          {course.finalExam.passed && (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/25 dark:bg-emerald-950/20">
              <Award className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div><p className="font-black text-emerald-950 dark:text-emerald-100">Certificate already unlocked</p><p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">Best final exam score: {course.finalExam.bestScorePercent}%.</p></div>
            </div>
          )}
          {!course.finalExam.unlocked && (
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
              <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
              <div><p className="font-black text-slate-900 dark:text-white">Finish the course first</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Every scored practice must be completed before the final exam unlocks.</p></div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><p className="text-2xl font-black text-slate-950 dark:text-white">{course.finalExam.questionCount}</p><p className="text-xs font-bold text-slate-500">{isMathematics ? 'randomized maths questions' : isSubjectCourse ? 'randomized subject questions' : 'choice + spelling questions'}</p></div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><p className="text-2xl font-black text-slate-950 dark:text-white">{course.finalExam.passPercent}%</p><p className="text-xs font-bold text-slate-500">required to pass</p></div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"><p className="text-2xl font-black text-slate-950 dark:text-white">{course.finalExam.attemptMinutes} min</p><p className="text-xs font-bold text-slate-500">hard time limit</p></div>
          </div>
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 dark:border-amber-500/30 dark:bg-amber-950/20">
            <h2 className="flex items-center gap-2 font-black text-amber-950 dark:text-amber-100"><AlertTriangle className="h-5 w-5" /> Read before starting</h2>
            <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-amber-900 dark:text-amber-100/90">
              <li>• The exam enters secure full-screen mode when your browser supports it.</li>
              <li>• Do not switch tabs, swap apps/screens, swipe away, close, reload, or leave full screen.</li>
              <li>• Hiding or leaving the exam terminates the attempt and records the integrity reason.</li>
              <li>• Answers lock as you continue. Correct answers are not revealed after a failed attempt.</li>
              {!isSubjectCourse && <li>• Courses with dictation include listen-and-type spelling questions.</li>}
              <li>• Failed or terminated attempts require a 15-minute review break.</li>
            </ul>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-violet-700" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
            <span className="text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">I understand the exam rules, have a stable connection, and am ready to stay on this screen until I submit.</span>
          </label>
          {waiting && retryAt && <p className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700 dark:bg-rose-950/20 dark:text-rose-200">Next attempt available after {retryAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.</p>}
          <Button className="w-full bg-violet-700 hover:bg-violet-800" size="lg" disabled={!acknowledged || !course.finalExam.unlocked || !course.finalExam.available || waiting || starting} onClick={startExam}>
            {starting ? 'Starting secure exam…' : <><Expand className="mr-2 h-4 w-4" /> Start final exam</>}
          </Button>
        </div>
      </section>
    </div>
  );
}
