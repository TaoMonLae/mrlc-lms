import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiGet, apiSend } from '../../lib/api';
import type { CourseItem } from '../../../shared/courses';

type PublicQuestion = { id: string; kind: 'CHOICE' | 'NUMERIC'; passage: string; prompt: string; options: string[] };
type QuizState = { status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED'; attemptNumber?: number; deadline?: string; timeLimitMinutes?: number; questionCount?: number; questions?: PublicQuestion[]; score?: number; total?: number; passed?: boolean; submittedAt?: string; timedOut?: boolean; feedback?: { questionId: string; response: string; correct: boolean; answer: string; explanation: string }[] };

export function CourseUnitTest({ enrollmentId, item, onComplete }: { enrollmentId: string; item: CourseItem; onComplete: () => void }) {
  const [state, setState] = useState<QuizState | null>(null), [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [now, setNow] = useState(Date.now());
  const path = `/api/my-courses/${encodeURIComponent(enrollmentId)}/quizzes/${encodeURIComponent(item.id)}`;
  useEffect(() => { let active = true; setState(null); setAnswers({}); setError('');
    apiGet<QuizState>(path).then(value => { if (active) setState(value); }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load this test.'); });
    return () => { active = false; };
  }, [path]);
  useEffect(() => { if (state?.status !== 'IN_PROGRESS') return; const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, [state?.status]);
  useEffect(() => { if (state?.status !== 'IN_PROGRESS' || !state.attemptNumber) return;
    try { const saved = window.sessionStorage.getItem(`${path}:${state.attemptNumber}`); const values = saved ? JSON.parse(saved) : {}; if (values && typeof values === 'object' && !Array.isArray(values) && Object.values(values).every(v => typeof v === 'string')) setAnswers(values); } catch { /* Browser storage may be disabled. */ }
  }, [path, state?.attemptNumber, state?.status]);
  const setAnswer = (id: string, value: string) => setAnswers(previous => {
    const next = { ...previous, [id]: value };
    try { window.sessionStorage.setItem(`${path}:${state?.attemptNumber}`, JSON.stringify(next)); } catch { /* The test remains usable without storage. */ }
    return next;
  });
  const action = async (kind: 'start' | 'submit') => {
    if (busy) return; setBusy(true); setError('');
    try {
      const result = await apiSend<QuizState>(`${path}/${kind}`, 'POST', kind === 'submit' ? { answers, attemptNumber: state?.attemptNumber } : {});
      setState(result); setNow(Date.now());
      if (kind === 'submit') { try { window.sessionStorage.removeItem(`${path}:${state?.attemptNumber}`); } catch { /* No storage to clear. */ } onComplete(); }
      else setAnswers({});
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save your test.'); }
    finally { setBusy(false); }
  };
  const seconds = state?.deadline ? Math.max(0, Math.ceil((new Date(state.deadline).getTime() - now) / 1000)) : 0;
  const expiredAttempt = useRef<string | null>(null);
  useEffect(() => {
    if (state?.status !== 'IN_PROGRESS' || seconds !== 0 || busy) return;
    const key = path + ':' + state.attemptNumber;
    if (expiredAttempt.current === key) return;
    expiredAttempt.current = key;
    void action('submit');
  }, [path, state?.status, state?.attemptNumber, seconds, busy]);
  return <div className="course-quiz-card">
    {error && <p role="alert" className="course-error">{error}</p>}
    {!state && !error && <p role="status">Loading unit test…</p>}
    {state?.status === 'NOT_STARTED' && <div><p>About {state.timeLimitMinutes ?? item.minutes} minutes · {state.questionCount ?? 0} original questions. Your timer starts when you select Start.</p><Button className="mt-4 min-h-11" disabled={busy} onClick={() => action('start')}>Start unit test</Button></div>}
    {state?.status === 'IN_PROGRESS' && <><p role="timer" aria-live="off" className="course-meta">Attempt {state.attemptNumber} · Time left: {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</p>
      {state.questions?.map((question, index) => <fieldset key={question.id} disabled={busy || !seconds}><legend>Question {index + 1} of {state.questions?.length}</legend>{question.passage && <p className="course-quiz-source">{question.passage}</p>}<p>{question.prompt}</p>{question.kind === 'CHOICE' ? <div className="course-quiz-options">{question.options.map((option, optionIndex) => <label key={optionIndex}><input type="radio" name={`${item.id}-${question.id}`} value={option} checked={answers[question.id] === option} onChange={() => setAnswer(question.id, option)} />{option}</label>)}</div> : <Input aria-label={`Numeric answer for question ${index + 1}`} inputMode="decimal" type="number" step="any" value={answers[question.id] ?? ''} onChange={event => setAnswer(question.id, event.target.value)} />}</fieldset>)}
      <Button className="min-h-11" disabled={busy} onClick={() => action('submit')}>{seconds ? 'Submit answers' : 'Time ended · submit test'}</Button><p className="course-helper">Unanswered questions receive no points. The server enforces the time limit.</p></>}
    {state?.status === 'SUBMITTED' && <><h3>{state.timedOut ? 'Time ended · ' : ''}Attempt {state.attemptNumber}: {state.score}/{state.total} correct</h3><p role="status">{state.passed ? 'Unit test passed. You can review your answers below.' : 'Review the explanations and retry when ready.'}</p>{state.feedback?.map((row, index) => <div key={row.questionId} className="course-quiz-feedback"><strong>Question {index + 1}: {row.correct ? 'Correct' : 'Review'}</strong><span>Your answer: {row.response || 'No answer'}</span><span>Correct answer: {row.answer}</span><p>{row.explanation}</p></div>)}<Button variant="outline" className="min-h-11" disabled={busy} onClick={() => action('start')}>Try again</Button></>}
  </div>;
}
