import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock,
  Maximize2,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import MathText from '../../components/MathText';

type TakeQuestion = {
  id: string;
  type: string;
  questionText: string;
  choices?: string[];
  points: number;
};

type IntegrityEvent = {
  type: string;
  message: string;
  at: string;
};

type SubmitSummary = {
  score?: number;
  answeredCount?: number;
  questionCount?: number;
  manualGradingCount?: number;
  securityWarnings?: number;
  autoSubmitted?: boolean;
};

type LockdownPolicy = {
  enabled: boolean;
  requireFullscreen: boolean;
  blockClipboard: boolean;
  blockContextMenu: boolean;
  blockShortcuts: boolean;
  autoSubmitOnViolation: boolean;
  maxWarnings: number;
  instructions: string;
};

const DEFAULT_LOCKDOWN_POLICY: LockdownPolicy = {
  enabled: true,
  requireFullscreen: true,
  blockClipboard: true,
  blockContextMenu: true,
  blockShortcuts: true,
  autoSubmitOnViolation: true,
  maxWarnings: 3,
  instructions: '',
};

const isMultipleChoice = (q: TakeQuestion) =>
  Array.isArray(q.choices) && q.choices.length > 0;

export default function ExamTake() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<TakeQuestion[]>([]);
  const [examTitle, setExamTitle] = useState('Secure Exam');
  const [isMathExam, setIsMathExam] = useState(false);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState(60);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(60 * 60);
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lockdownPolicy, setLockdownPolicy] = useState<LockdownPolicy>(DEFAULT_LOCKDOWN_POLICY);
  const [securityWarnings, setSecurityWarnings] = useState(0);
  const [integrityEvents, setIntegrityEvents] = useState<IntegrityEvent[]>([]);
  const [securityLocked, setSecurityLocked] = useState(false);
  const [submitSummary, setSubmitSummary] = useState<SubmitSummary | null>(null);

  const answersRef = useRef(answers);
  const integrityEventsRef = useRef(integrityEvents);
  const securityWarningsRef = useRef(securityWarnings);
  const submittingRef = useRef(false);
  const submittedRef = useRef(false);
  const lastViolationRef = useRef<Record<string, number>>({});

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    integrityEventsRef.current = integrityEvents;
  }, [integrityEvents]);

  useEffect(() => {
    securityWarningsRef.current = securityWarnings;
  }, [securityWarnings]);

  useEffect(() => {
    submittedRef.current = submitted;
  }, [submitted]);

  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  useEffect(() => {
    if (!id) return;
    const fetchExam = async () => {
      try {
        const token = sessionStorage.getItem('auth_token');
        const res = await fetch(`/api/exams/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const mapped: TakeQuestion[] = (data.questions || []).map((q: any) => {
          const opts = Array.isArray(q.options) ? q.options : [];
          return {
            id: q.id,
            type: q.type,
            questionText: q.text || '',
            choices: opts.map((o: any) => (typeof o === 'string' ? o : o?.text ?? String(o))),
            points: q.points || 0,
          };
        });
        setExamTitle(data.title || 'Secure Exam');
        setLockdownPolicy({ ...DEFAULT_LOCKDOWN_POLICY, ...(data.lockdownPolicy || {}) });
        setQuestions(mapped);
        setIsMathExam(/math/i.test(data.subject?.name ?? ''));
        if (data.durationMinutes) {
          setDuration(data.durationMinutes);
          setTimeLeft(data.durationMinutes * 60);
        }
      } catch (error) {
        console.error('Error fetching exam:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [id]);

  const question = questions[currentIdx];

  const recordIntegrityEvent = useCallback((type: string, message: string) => {
    const now = Date.now();
    if (now - (lastViolationRef.current[type] || 0) < 1500) return;
    lastViolationRef.current[type] = now;

    const event = { type, message, at: new Date().toISOString() };
    setIntegrityEvents((prev) => [...prev, event].slice(-50));
    setSecurityWarnings((prev) => {
      const next = prev + 1;
      if (lockdownPolicy.autoSubmitOnViolation && next >= lockdownPolicy.maxWarnings) {
        setSecurityLocked(true);
      }
      return next;
    });
  }, [lockdownPolicy.autoSubmitOnViolation, lockdownPolicy.maxWarnings]);

  const submitExam = useCallback(async (autoSubmitted = false) => {
    if (!id || submittedRef.current || submittingRef.current) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/exams/${id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          answers: answersRef.current,
          integrityEvents: integrityEventsRef.current,
          securityWarnings: securityWarningsRef.current,
          autoSubmitted,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || 'Exam submission failed');
      }

      setSubmitSummary(payload);
      setSubmitted(true);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (error: any) {
      setSubmitError(error.message || 'Exam submission failed');
      if (autoSubmitted) {
        setSubmitSummary({
          answeredCount: Object.keys(answersRef.current).length,
          questionCount: questions.length,
          securityWarnings: securityWarningsRef.current,
          autoSubmitted: true,
        });
        setSubmitted(true);
      }
    } finally {
      setSubmitting(false);
    }
  }, [id, questions.length]);

  useEffect(() => {
    if (submitted || loading || !started || questions.length === 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [submitted, loading, started, questions.length]);

  useEffect(() => {
    if (timeLeft === 0 && started && !submitted) {
      submitExam(true);
    }
  }, [timeLeft, started, submitted, submitExam]);

  useEffect(() => {
    if (securityLocked && !submitted) {
      submitExam(true);
    }
  }, [securityLocked, submitted, submitExam]);

  useEffect(() => {
    if (!started || submitted || !lockdownPolicy.enabled) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        recordIntegrityEvent('TAB_HIDDEN', 'The exam tab was hidden during the attempt.');
      }
    };
    const handleBlur = () => recordIntegrityEvent('WINDOW_BLUR', 'The exam window lost focus.');
    const handleFullscreen = () => {
      const fullscreenActive = Boolean(document.fullscreenElement);
      setIsFullscreen(fullscreenActive);
      if (lockdownPolicy.requireFullscreen && !fullscreenActive) {
        recordIntegrityEvent('FULLSCREEN_EXIT', 'Fullscreen exam mode was exited.');
      }
    };
    const blockAction = (event: Event, type: string, message: string) => {
      event.preventDefault();
      recordIntegrityEvent(type, message);
    };
    const handleContextMenu = (event: MouseEvent) => blockAction(event, 'CONTEXT_MENU', 'Right-click was blocked.');
    const handleCopy = (event: ClipboardEvent) => blockAction(event, 'COPY_BLOCKED', 'Copy was blocked.');
    const handleCut = (event: ClipboardEvent) => blockAction(event, 'CUT_BLOCKED', 'Cut was blocked.');
    const handlePaste = (event: ClipboardEvent) => blockAction(event, 'PASTE_BLOCKED', 'Paste was blocked.');
    const handleDragStart = (event: DragEvent) => blockAction(event, 'DRAG_BLOCKED', 'Drag action was blocked.');
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const modifier = event.ctrlKey || event.metaKey;
      const blockedModifierKeys = ['a', 'c', 'f', 'p', 's', 'u', 'v', 'x'];
      const blockedDevTools =
        event.key === 'F12' ||
        (modifier && event.shiftKey && ['c', 'i', 'j'].includes(key));

      if (lockdownPolicy.blockShortcuts && ((modifier && blockedModifierKeys.includes(key)) || blockedDevTools)) {
        blockAction(event, 'SHORTCUT_BLOCKED', 'A restricted keyboard shortcut was blocked.');
      }
    };
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreen);
    if (lockdownPolicy.blockContextMenu) document.addEventListener('contextmenu', handleContextMenu);
    if (lockdownPolicy.blockClipboard) {
      document.addEventListener('copy', handleCopy);
      document.addEventListener('cut', handleCut);
      document.addEventListener('paste', handlePaste);
      document.addEventListener('dragstart', handleDragStart);
    }
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreen);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [lockdownPolicy, recordIntegrityEvent, started, submitted]);

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (value: string) => {
    if (!question || submitting || submitted) return;
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
  };

  const startSecureExam = async () => {
    setStarted(true);
    if (!lockdownPolicy.enabled || !lockdownPolicy.requireFullscreen) return;
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch {
      setIsFullscreen(false);
      recordIntegrityEvent('FULLSCREEN_DENIED', 'Fullscreen exam mode could not be started.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-slate-500">Loading exam...</span>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-8 max-w-md w-full text-center shadow-sm">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Exam unavailable</h2>
          <p className="text-sm text-slate-500 mb-6">This exam has no questions yet.</p>
          <Button variant="outline" className="w-full" onClick={() => navigate('/exams')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (submitted) {
    const answeredCount = submitSummary?.answeredCount ?? Object.keys(answers).length;
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-8 max-w-md w-full text-center shadow-lg">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Exam Submitted</h2>
          <p className="text-slate-500 mb-6">
            {submitError ? 'Your session ended locally, but the server submission needs review.' : 'Your answers have been saved successfully.'}
          </p>
          <div className="bg-slate-50 dark:bg-surface-raised/50 p-4 rounded-lg text-sm text-slate-600 dark:text-slate-300 mb-8 space-y-2">
            <div className="flex justify-between">
              <span>Time Taken:</span>
              <span className="font-medium text-slate-900 dark:text-white">{formatTime((duration * 60) - timeLeft)}</span>
            </div>
            <div className="flex justify-between">
              <span>Questions Answered:</span>
              <span className="font-medium text-slate-900 dark:text-white">{answeredCount} / {questions.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Security Warnings:</span>
              <span className="font-medium text-slate-900 dark:text-white">{submitSummary?.securityWarnings ?? securityWarnings}</span>
            </div>
            {submitSummary?.manualGradingCount ? (
              <div className="flex justify-between">
                <span>Manual Grading:</span>
                <span className="font-medium text-slate-900 dark:text-white">{submitSummary.manualGradingCount} question(s)</span>
              </div>
            ) : null}
          </div>
          {submitError ? (
            <p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              {submitError}
            </p>
          ) : null}
          <Button className="w-full bg-slate-900 text-white" onClick={() => navigate('/student/exams')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-8 max-w-xl w-full shadow-lg">
          <div className="w-14 h-14 rounded-full bg-aubergine-100 text-aubergine-700 flex items-center justify-center mb-5">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{examTitle}</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            {lockdownPolicy.enabled
              ? 'Secure exam mode keeps this page in focus while you work. Leaving the tab, exiting fullscreen, or using restricted shortcuts will be recorded.'
              : 'This exam will open without lockdown monitoring because the school lockdown policy is disabled.'}
          </p>
          {lockdownPolicy.instructions ? (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {lockdownPolicy.instructions}
            </div>
          ) : null}
          <div className="mt-6 grid gap-3 text-sm text-slate-600 dark:text-slate-300">
            {lockdownPolicy.enabled && lockdownPolicy.requireFullscreen ? (
              <div className="flex items-start gap-3 rounded-lg bg-slate-50 dark:bg-surface-raised/50 p-3">
                <Maximize2 className="mt-0.5 h-4 w-4" />
                <span>Fullscreen is required while taking the exam.</span>
              </div>
            ) : null}
            <div className="flex items-start gap-3 rounded-lg bg-slate-50 dark:bg-surface-raised/50 p-3">
              <ShieldAlert className="mt-0.5 h-4 w-4" />
              <span>
                {lockdownPolicy.enabled && lockdownPolicy.autoSubmitOnViolation
                  ? `${lockdownPolicy.maxWarnings} security warning(s) will automatically submit the attempt.`
                  : 'Security events are not configured to auto-submit this attempt.'}
              </span>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-slate-50 dark:bg-surface-raised/50 p-3">
              <Clock className="mt-0.5 h-4 w-4" />
              <span>Time limit: {duration} minutes.</span>
            </div>
          </div>
          <Button onClick={startSecureExam} className="mt-8 w-full bg-slate-900 text-white hover:bg-slate-800 py-6">
            {lockdownPolicy.enabled ? 'Start Secure Exam' : 'Start Exam'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto min-h-[80vh] flex flex-col select-none">
      <div className="bg-white dark:bg-surface-indigo border-b border-slate-200 dark:border-surface-raised p-4 rounded-t-xl flex flex-col gap-4 md:flex-row md:justify-between md:items-center shadow-sm">
        <div>
          <h1 className="font-bold text-slate-900 dark:text-white">{examTitle}</h1>
          <p className="text-xs text-slate-500">Secure exam mode active</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold ${
            securityWarnings > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
          }`}>
            <ShieldAlert className="w-4 h-4" />
            {lockdownPolicy.enabled ? `${securityWarnings}/${lockdownPolicy.maxWarnings} warnings` : 'Lockdown off'}
          </div>
          {lockdownPolicy.enabled && lockdownPolicy.requireFullscreen && !isFullscreen ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => recordIntegrityEvent('FULLSCREEN_DENIED', 'Fullscreen exam mode could not be restored.'))}
            >
              <Maximize2 className="mr-2 h-4 w-4" /> Restore Fullscreen
            </Button>
          ) : null}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono text-lg font-bold ${
            timeLeft < 300 ? 'bg-red-100 text-red-600' : 'bg-slate-100 dark:bg-surface-raised text-slate-700 dark:text-slate-300'
          }`}>
            <Clock className="w-5 h-5" />
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {submitError ? (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      ) : null}

      {securityWarnings > 0 ? (
        <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Stay on the exam page.
          {lockdownPolicy.autoSubmitOnViolation ? ` The attempt will submit automatically after ${lockdownPolicy.maxWarnings} warnings.` : ''}
        </div>
      ) : null}

      <div className="flex-1 flex flex-col md:flex-row gap-6 p-6 bg-slate-50 dark:bg-[#09090b]">
        <div className="flex-1 flex flex-col">
          <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm flex-1">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-surface-raised pb-4">
              <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Question {currentIdx + 1} of {questions.length}</h2>
              <span className="text-sm font-medium bg-slate-100 dark:bg-surface-raised px-3 py-1 rounded-full text-slate-600 dark:text-slate-300">
                {question.points} Points
              </span>
            </div>

            <div className="prose dark:prose-invert max-w-none mb-8">
              <p className="text-xl font-medium text-slate-900 dark:text-white leading-relaxed">
                {isMathExam ? <MathText>{question.questionText}</MathText> : question.questionText}
              </p>
            </div>

            <div className="mt-8">
              {isMultipleChoice(question) ? (
                <RadioGroup
                  value={answers[question.id] || ''}
                  onValueChange={handleAnswerChange}
                  className="space-y-3"
                >
                  {question.choices?.map((choice, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center space-x-3 border p-4 rounded-lg cursor-pointer transition-colors ${
                        answers[question.id] === choice
                          ? 'border-aubergine-600 bg-aubergine-50 dark:bg-aubergine-900/10'
                          : 'border-slate-200 dark:border-surface-raised hover:border-slate-300'
                      }`}
                      onClick={() => handleAnswerChange(choice)}
                    >
                      <RadioGroupItem value={choice} id={`choice-${idx}`} className="text-aubergine-600" />
                      <Label htmlFor={`choice-${idx}`} className="flex-1 cursor-pointer text-base font-normal">
                        {isMathExam ? <MathText>{choice}</MathText> : choice}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <div className="space-y-4">
                  <Textarea
                    placeholder="Type your answer here..."
                    value={answers[question.id] || ''}
                    onChange={(event) => handleAnswerChange(event.target.value)}
                    className="min-h-[200px] resize-y text-base p-4 select-text"
                  />
                  <p className="text-sm text-slate-500 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> This question requires manual grading.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
              disabled={currentIdx === 0 || submitting}
              className="py-6 px-6"
            >
              <ChevronLeft className="mr-2 h-5 w-5" /> Previous
            </Button>

            {currentIdx === questions.length - 1 ? (
              <Button
                onClick={() => submitExam(false)}
                disabled={submitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground py-6 px-10 text-lg"
              >
                {submitting ? 'Submitting...' : 'Submit Exam'}
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                disabled={submitting}
                className="bg-slate-900 text-white hover:bg-slate-800 py-6 px-8"
              >
                Next <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        <div className="w-full md:w-64 flex flex-col gap-4">
          <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Questions</h3>
            <div className="grid grid-cols-5 md:grid-cols-4 gap-2">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  disabled={submitting}
                  className={`h-10 w-10 rounded-md font-medium text-sm transition-colors flex items-center justify-center ${
                    currentIdx === idx
                      ? 'ring-2 ring-aubergine-600 ring-offset-2 dark:ring-offset-slate-900 bg-aubergine-100 text-aubergine-700 font-bold'
                      : answers[q.id]
                        ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-surface-raised dark:hover:bg-slate-700'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            <div className="mt-8 space-y-3 border-t border-slate-100 dark:border-surface-raised pt-4">
              <div className="flex items-center text-sm gap-2 text-slate-600 dark:text-slate-300">
                <div className="w-4 h-4 rounded-sm bg-slate-800"></div> Answered
              </div>
              <div className="flex items-center text-sm gap-2 text-slate-600 dark:text-slate-300">
                <div className="w-4 h-4 rounded-sm bg-slate-100 border border-slate-200"></div> Unanswered
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-4 shadow-sm text-sm text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white mb-2">
              <ShieldAlert className="h-4 w-4" /> Integrity Log
            </div>
            <p>{integrityEvents.length === 0 ? 'No security events recorded.' : `${integrityEvents.length} event(s) recorded for review.`}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
