import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { AlertCircle, ArrowLeft, BarChart3, CheckCircle2, ClipboardCheck, Clock3, Loader2, Search, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MathText from '../../components/MathText';
import { apiGet } from '../../lib/api';
import { useAuth } from '../../providers/AuthProvider';

type ReviewQuestion = {
  id: string; number: number; text: string; type: string;
  passageText: string | null; imageUrl: string | null; explanation: string | null;
  maxPoints: number; pointsAwarded: number | null;
  status: 'CORRECT' | 'INCORRECT' | 'PARTIAL' | 'PENDING' | 'GRADED';
  studentAnswer: string | null; correctAnswer: string | null; answerKeyCorrected: boolean;
  blankRows: { label: string; student: string | null; correct: string; isCorrect: boolean }[];
};
type ReviewAttempt = {
  id: string; studentName: string; studentCode: string; attemptNumber: number;
  score: number | null; totalMarks: number; completedAt: string | null;
  status: 'NEEDS_GRADING' | 'GRADED'; questions: ReviewQuestion[];
};
type ReviewData = {
  exam: { id: string; title: string; className: string; subject: string; studentCount: number };
  attempts: ReviewAttempt[];
};

const displayScore = (value: number | null) => value == null ? 'Pending' : String(Math.round(value * 100) / 100);
const dateLabel = (value: string | null) => value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const questionType = (value: string) => value.replaceAll('_', ' ').toLowerCase();
const needsAttention = (question: ReviewQuestion) => question.status === 'INCORRECT' || question.status === 'PARTIAL';

function StudentResultsRedirect({ examId }: { examId: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    const controller = new AbortController();
    apiGet<{ submitted: { id: string; attemptId?: string }[] }>('/api/student/exams', { signal: controller.signal })
      .then(data => {
        if (controller.signal.aborted) return;
        const match = (data?.submitted || []).find(exam => exam.id === examId);
        navigate(match?.attemptId ? `/exam2/attempts/${match.attemptId}/result` : '/exam2/resume', { replace: true });
      })
      .catch(() => { if (!controller.signal.aborted) navigate('/exam2/resume', { replace: true }); });
    return () => controller.abort();
  }, [examId, navigate]);
  return <div className="flex items-center justify-center gap-2 py-32 text-muted-foreground"><Loader2 className="size-5 animate-spin" />Opening result…</div>;
}

function TeacherReview({ examId }: { examId: string }) {
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState('');
  const [questionFilter, setQuestionFilter] = useState<'all' | 'attention'>('all');
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    apiGet<ReviewData>(`/api/exams/${examId}/results`, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch((cause: Error) => { if (!controller.signal.aborted) setError(cause.message || 'Could not load student answers.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [examId, retry]);

  const attempts = data?.attempts ?? [];
  const selected = attempts.find(attempt => attempt.id === params.get('attemptId')) ?? attempts[0] ?? null;
  const filteredAttempts = attempts.filter(attempt => `${attempt.studentName} ${attempt.studentCode}`.toLowerCase().includes(search.toLowerCase().trim()));
  const questions = useMemo(() => selected?.questions.filter(question => questionFilter === 'all' || needsAttention(question)) ?? [], [selected, questionFilter]);
  const incorrectCount = selected?.questions.filter(needsAttention).length ?? 0;
  const pendingCount = selected?.questions.filter(question => question.status === 'PENDING').length ?? 0;
  const correctCount = selected?.questions.filter(question => question.status === 'CORRECT').length ?? 0;

  const selectAttempt = (attemptId: string) => {
    setParams({ attemptId });
    setQuestionFilter('all');
  };

  if (loading && !data) return <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin" />Loading student responses…</div>;
  if (error) return <div role="alert" className="mx-auto max-w-xl rounded-sm border border-border bg-card p-8"><AlertCircle className="mb-3 size-6 text-destructive" /><h1 className="text-lg font-semibold">Student responses unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{error}</p><Button className="mt-5" variant="outline" onClick={() => setRetry(value => value + 1)}>Try again</Button></div>;
  if (!data) return null;

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Button variant="link" size="sm" className="-ml-2 mb-2 h-auto px-2 text-muted-foreground" render={<Link to={`/exams/${examId}`} />} nativeButton={false}><ArrowLeft className="size-4" />Exam profile</Button>
          <p className="text-[11px] font-semibold uppercase tracking-[.15em] text-muted-foreground">Responses / Review</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Student answers</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data.exam.title} <span aria-hidden="true">·</span> {data.exam.className} <span aria-hidden="true">·</span> {data.exam.subject}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link to={`/exam2/${examId}/analytics`} />} nativeButton={false}><BarChart3 className="size-4" />Analytics</Button>
          <Button variant="outline" render={<Link to={`/exam2/grading?examId=${examId}`} />} nativeButton={false}><ClipboardCheck className="size-4" />Grading queue</Button>
        </div>
      </header>

      {!attempts.length ? (
        <section className="rounded-sm border border-border bg-card px-6 py-14 text-center">
          <Clock3 className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-4 font-semibold text-foreground">No submitted attempts yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Student answers will appear here after they submit this exam.</p>
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="self-start overflow-hidden rounded-sm border border-border bg-card" aria-label="Submitted attempts">
            <div className="border-b border-border px-4 py-4">
              <h2 className="font-semibold text-foreground">Submitted attempts <span className="ml-1 text-sm font-normal text-muted-foreground">{attempts.length}</span></h2>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input aria-label="Search student submissions" placeholder="Search students" className="h-10 pl-9" value={search} onChange={event => setSearch(event.target.value)} />
              </div>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {filteredAttempts.map(attempt => {
                const wrong = attempt.questions.filter(needsAttention).length;
                const active = selected?.id === attempt.id;
                return <button key={attempt.id} type="button" aria-current={active ? 'true' : undefined} onClick={() => selectAttempt(attempt.id)} className={`w-full border-b border-border px-4 py-3.5 text-left last:border-b-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring ${active ? 'bg-teal-50 dark:bg-teal-400/10' : 'hover:bg-muted/50'}`}>
                  <span className="flex items-start justify-between gap-2"><span className="min-w-0 font-semibold text-foreground">{attempt.studentName}</span><span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{displayScore(attempt.score)}{attempt.score != null ? ` / ${attempt.totalMarks}` : ''}</span></span>
                  <span className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{dateLabel(attempt.completedAt)}{attempt.attemptNumber > 1 ? ` · Try ${attempt.attemptNumber}` : ''}</span><span className={wrong ? 'font-semibold text-rose-700 dark:text-rose-300' : 'font-medium'}>{wrong ? `${wrong} to review` : '—'}</span></span>
                </button>;
              })}
              {!filteredAttempts.length && <p className="px-4 py-8 text-center text-sm text-muted-foreground">No students match that search.</p>}
            </div>
          </aside>

          {selected && <main className="min-w-0 space-y-4">
            <section className="rounded-sm border border-border bg-card p-5 sm:p-6" aria-labelledby="selected-student-heading">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div><p className="text-[11px] font-semibold uppercase tracking-[.13em] text-muted-foreground">Attempt {selected.attemptNumber} · {dateLabel(selected.completedAt)}</p><h2 id="selected-student-heading" className="mt-1 text-xl font-bold tracking-tight text-foreground">{selected.studentName}</h2><p className="mt-0.5 text-sm text-muted-foreground">{selected.studentCode}</p>{selected.status === 'NEEDS_GRADING' && <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300"><Clock3 className="size-3.5" />Some answers still need grading</p>}</div>
                <div className="text-left sm:text-right"><p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Score</p><p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{displayScore(selected.score)}{selected.score != null && <span className="text-base font-normal text-muted-foreground"> / {selected.totalMarks}</span>}</p></div>
              </div>
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-4 text-sm" aria-label="Answer summary">
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="size-4" />{correctCount} correct</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-rose-700 dark:text-rose-300"><XCircle className="size-4" />{incorrectCount} incorrect or partial</span>
                {pendingCount > 0 && <span className="inline-flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-300"><Clock3 className="size-4" />{pendingCount} pending</span>}
              </div>
            </section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold text-foreground">Question review <span className="font-normal text-muted-foreground">{questions.length} of {selected.questions.length}</span></h2>
              <div className="inline-flex rounded-sm border border-border bg-card p-1" aria-label="Filter questions">
                <button type="button" onClick={() => setQuestionFilter('all')} aria-pressed={questionFilter === 'all'} className={`rounded-sm px-3 py-1.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-ring ${questionFilter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>All questions</button>
                <button type="button" onClick={() => setQuestionFilter('attention')} aria-pressed={questionFilter === 'attention'} className={`rounded-sm px-3 py-1.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-ring ${questionFilter === 'attention' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Incorrect & partial ({incorrectCount})</button>
              </div>
            </div>
            {!questions.length && <div className="rounded-sm border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">{questionFilter === 'attention' ? 'No incorrect or partially correct answers in this attempt.' : 'No answers are available for this attempt.'}</div>}
            <div className="space-y-3">
              {questions.map(question => <article key={question.id} className="rounded-sm border border-border bg-card p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                  <div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">Question {question.number}</span><span className="text-xs capitalize text-muted-foreground">{questionType(question.type)}</span>{question.answerKeyCorrected && <span className="text-xs text-teal-700 dark:text-teal-300">Updated answer key</span>}</div>
                  <div className="flex items-center gap-3 text-sm"><span className={`font-semibold ${question.status === 'CORRECT' ? 'text-emerald-700 dark:text-emerald-300' : needsAttention(question) ? 'text-rose-700 dark:text-rose-300' : 'text-muted-foreground'}`}>{question.status === 'PARTIAL' ? 'Partially correct' : question.status === 'PENDING' ? 'Pending grading' : question.status.charAt(0) + question.status.slice(1).toLowerCase()}</span><span className="tabular-nums text-muted-foreground">{question.pointsAwarded == null ? '—' : question.pointsAwarded} / {question.maxPoints} pts</span></div>
                </div>
                {question.passageText && <div className="mt-4 border-l-2 border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground"><p className="mb-1 text-[11px] font-bold uppercase tracking-widest">Passage</p><MathText text={question.passageText} /></div>}
                <div className="mt-4 text-base font-medium leading-relaxed text-foreground"><MathText text={question.text} /></div>
                {question.imageUrl && <img src={question.imageUrl} alt="Question illustration" className="mt-4 max-h-72 max-w-full rounded-sm border border-border object-contain" />}
                {question.blankRows.length > 0 ? <div className="mt-5 space-y-2">{question.blankRows.map(row => <div key={row.label} className="grid gap-2 border-t border-border pt-2 text-sm sm:grid-cols-[100px_1fr_1fr]"><span className="font-semibold text-muted-foreground">{row.label}</span><span><span className="block text-xs text-muted-foreground">Student answer</span>{row.student || 'No answer'}</span><span><span className="block text-xs text-muted-foreground">Correct answer</span><span className="font-medium text-emerald-700 dark:text-emerald-300">{row.correct}</span></span></div>)}</div> : <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="min-w-0 rounded-sm border border-border bg-muted/25 p-4"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">Student answer</p><p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">{question.studentAnswer || 'No answer submitted'}</p></div><div className="min-w-0 rounded-sm border border-border bg-muted/25 p-4"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">{question.status === 'GRADED' || question.status === 'PENDING' ? 'Model answer' : 'Correct answer'}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm font-medium text-emerald-700 dark:text-emerald-300">{question.correctAnswer || 'No answer key available'}</p></div></div>}
                {question.explanation && <div className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground"><span className="font-semibold text-foreground">Explanation: </span><MathText text={question.explanation} /></div>}
              </article>)}
            </div>
          </main>}
        </div>
      )}
    </div>
  );
}

export default function ExamResults() {
  const { id } = useParams();
  const { user, isLoading } = useAuth();
  if (isLoading || !id) return <div className="flex items-center justify-center gap-2 py-32 text-muted-foreground"><Loader2 className="size-5 animate-spin" />Opening results…</div>;
  if (user?.role === 'ADMIN' || user?.role === 'TEACHER') return <TeacherReview examId={id} />;
  return <StudentResultsRedirect examId={id} />;
}
