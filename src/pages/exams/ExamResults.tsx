import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { AlertCircle, ArrowLeft, ArrowRight, BarChart3, CheckCircle2, ClipboardCheck, Clock3, Loader2, Search, XCircle } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MathText from '../../components/MathText';
import { apiGet } from '../../lib/api';
import { useAuth } from '../../providers/AuthProvider';
import { buildResponseOverview, type QuestionOverview } from '../../lib/examResponseOverview';

type ReviewQuestion = {
  id: string; number: number; text: string; type: string;
  passageText: string | null; imageUrl: string | null; explanation: string | null;
  maxPoints: number; pointsAwarded: number | null;
  status: 'CORRECT' | 'INCORRECT' | 'PARTIAL' | 'PENDING' | 'GRADED';
  studentAnswer: string | null; correctAnswer: string | null; answerKeyCorrected: boolean;
  choiceLabels?: string[];
  blankRows: { label: string; student: string | null; correct: string; isCorrect: boolean }[];
};
type ReviewAttempt = {
  id: string; studentName: string; studentCode: string; attemptNumber: number;
  score: number | null; totalMarks: number; startedAt: string | null; completedAt: string | null;
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
const isWrittenQuestion = (question: ReviewQuestion) => ['SHORT_ANSWER', 'ESSAY', 'WRITTEN', 'EXTENDED'].includes(question.type);
const isWrittenType = (type: string) => ['SHORT_ANSWER', 'ESSAY', 'WRITTEN', 'EXTENDED'].includes(type);
const percentLabel = (value: number | null) => value == null ? '—' : `${Math.round(value)}%`;
const durationLabel = (seconds: number | null) => seconds == null ? '—' : `${Math.floor(Math.round(seconds) / 60)}:${String(Math.round(seconds) % 60).padStart(2, '0')}`;
const statusLabel = (status: string) => status === 'PARTIAL' ? 'Partially correct' : status === 'PENDING' ? 'Needs grading' : status === 'GRADED' ? 'Graded' : status.charAt(0) + status.slice(1).toLowerCase();
const statusTone = (status: string) => status === 'CORRECT' ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
  : status === 'INCORRECT' ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200'
    : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200';

function ResponseMetric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <div className="rounded-lg border border-border bg-card p-4 sm:p-5"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}

function QuestionResponseCard({ question, onOpenAttempt }: { question: QuestionOverview; onOpenAttempt: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const graded = question.correct + question.incorrect + question.partial;
  const accuracy = graded ? question.correct / graded * 100 : null;
  const showDistribution = !isWrittenType(question.type) && question.type !== 'DRAG_DROP';
  return <article id={`question-${question.id}`} className="scroll-mt-6 overflow-hidden rounded-lg border border-border bg-card">
    <div className="border-b border-border p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Question {question.number} · {questionType(question.type)}</p><div className="mt-2 text-base font-semibold leading-relaxed text-foreground"><MathText text={question.text} /></div></div><span className="rounded-md bg-muted px-3 py-1.5 text-sm font-semibold tabular-nums text-foreground">{percentLabel(accuracy)} correct</span></div>
      <p className="mt-3 text-xs text-muted-foreground">{graded} graded response{graded === 1 ? '' : 's'}{question.pending ? ` · ${question.pending} awaiting grading` : ''}</p>
    </div>
    <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,1fr)]">
      <div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-md bg-emerald-50 px-2.5 py-1.5 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">{question.correct} correct</span><span className="rounded-md bg-rose-50 px-2.5 py-1.5 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">{question.incorrect} incorrect</span><span className="rounded-md bg-amber-50 px-2.5 py-1.5 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">{question.partial} partial · {question.pending} pending</span></div>
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/20"><p className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-200">{isWrittenType(question.type) ? 'Model answer' : 'Correct answer'}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm font-medium text-foreground">{question.correctAnswer || 'No answer key available'}</p></div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{showDistribution ? 'Submitted answer distribution' : 'Response status'}</h3>
        {showDistribution ? <div className="mt-3 space-y-3">{question.distribution.slice(0, 6).map(row => <div key={row.answer}><div className="flex justify-between gap-3 text-sm"><span className="min-w-0 break-words text-foreground">{row.correct && <CheckCircle2 className="mr-1 inline size-3.5 text-emerald-700" aria-label="Matches answer key" />}{row.answer || 'No answer'}</span><span className="shrink-0 font-semibold tabular-nums">{row.count} <span className="font-normal text-muted-foreground">({Math.round(row.count / question.responses.length * 100)}%)</span></span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${row.correct ? 'bg-emerald-500' : 'bg-rose-400'}`} style={{ width: `${row.count / question.responses.length * 100}%` }} /></div></div>)}{question.distribution.length > 6 && <p className="text-xs text-muted-foreground">{question.distribution.length - 6} more distinct responses in the student list below.</p>}</div>
          : <p className="mt-2 text-sm text-muted-foreground">Read each student’s answer below. Written responses need teacher judgment; a model answer is guidance, not an automatic correctness check.</p>}
      </div>
    </div>
    <div className="border-t border-border px-5 py-4 sm:px-6"><button type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} className="min-h-9 text-left text-sm font-semibold text-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-ring">{expanded ? 'Hide' : 'View'} {question.responses.length} student response{question.responses.length === 1 ? '' : 's'}</button>{expanded && <div className="mt-3 divide-y divide-border">{question.responses.map((response, index) => <div key={`${response.attemptId}-${index}`} className="flex flex-wrap items-center gap-3 py-3 text-sm"><div className="min-w-32 flex-1"><p className="font-medium text-foreground">{response.studentName}{response.attemptNumber > 1 ? ` · Try ${response.attemptNumber}` : ''}</p><p className="mt-0.5 break-words text-muted-foreground">{response.answer || 'No answer submitted'}</p></div><span className={`rounded-md border px-2 py-1 text-xs font-semibold ${statusTone(response.status)}`}>{statusLabel(response.status)}</span><button type="button" onClick={() => onOpenAttempt(response.attemptId)} className="inline-flex min-h-9 items-center gap-1 font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring">Review <ArrowRight className="size-3.5" /></button></div>)}</div>}</div>
  </article>;
}

function StudentResultsRedirect({ examId }: { examId: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    const controller = new AbortController();
    apiGet<{ submitted: { id: string; attemptId?: string }[] }>('/api/student/exams', { signal: controller.signal, timeoutMs: 20000 })
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
  const [questionFilter, setQuestionFilter] = useState<'all' | 'attention' | 'pending'>('all');
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<'overview' | 'questions' | 'students'>(params.get('attemptId') ? 'students' : 'overview');
  const [questionSearch, setQuestionSearch] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setData(null);
    apiGet<ReviewData>(`/api/exams/${examId}/results`, { signal: controller.signal, timeoutMs: 20000 })
      .then(result => {
        if (!result?.exam || !Array.isArray(result.attempts)) throw new Error('Student responses could not be loaded. Please try again.');
        if (!controller.signal.aborted) setData(result);
      })
      .catch((cause: Error) => { if (!controller.signal.aborted) setError(cause.message || 'Could not load student answers.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [examId, retry]);

  const attempts = data?.attempts ?? [];
  const overview = useMemo(() => buildResponseOverview(attempts), [attempts]);
  const selected = attempts.find(attempt => attempt.id === params.get('attemptId')) ?? attempts[0] ?? null;
  const filteredAttempts = attempts.filter(attempt => `${attempt.studentName} ${attempt.studentCode}`.toLowerCase().includes(search.toLowerCase().trim()));
  const questions = useMemo(() => selected?.questions.filter(question => questionFilter === 'all' || (questionFilter === 'pending' ? question.status === 'PENDING' : needsAttention(question))) ?? [], [selected, questionFilter]);
  const incorrectCount = selected?.questions.filter(question => question.status === 'INCORRECT').length ?? 0;
  const partialCount = selected?.questions.filter(question => question.status === 'PARTIAL').length ?? 0;
  const pendingCount = selected?.questions.filter(question => question.status === 'PENDING').length ?? 0;
  const correctCount = selected?.questions.filter(question => question.status === 'CORRECT').length ?? 0;
  const visibleOverviewQuestions = overview.questions.filter(question => {
    const query = questionSearch.trim().toLowerCase();
    return (!query || `${question.number} ${question.text} ${question.type}`.toLowerCase().includes(query))
      && (questionFilter === 'all' || (questionFilter === 'pending' ? question.pending > 0 : question.incorrect + question.partial > 0));
  });

  const selectAttempt = (attemptId: string) => {
    setParams({ attemptId });
    setView('students');
    setQuestionFilter('all');
  };

  const openQuestion = (id: string) => {
    setQuestionFilter('all');
    setQuestionSearch('');
    setView('questions');
    window.setTimeout(() => document.getElementById(`question-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  if (loading && !data) return <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin" />Loading student responses…</div>;
  if (error) return <div role="alert" className="mx-auto max-w-xl rounded-sm border border-border bg-card p-8"><AlertCircle className="mb-3 size-6 text-destructive" /><h1 className="text-lg font-semibold">Student responses unavailable</h1><p className="mt-2 text-sm text-muted-foreground">{error}</p><Button className="mt-5" variant="outline" onClick={() => setRetry(value => value + 1)}>Try again</Button></div>;
  if (!data) return <p role="status">Loading student responses…</p>;

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Button variant="link" size="sm" className="-ml-2 mb-2 h-auto px-2 text-muted-foreground" render={<Link to={`/exams/${examId}`} />} nativeButton={false}><ArrowLeft className="size-4" />Exam profile</Button>
          <p className="text-[11px] font-semibold uppercase tracking-[.15em] text-muted-foreground">Responses / Review</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Responses overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data.exam.title} <span aria-hidden="true">·</span> {data.exam.className} <span aria-hidden="true">·</span> {data.exam.subject}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link to={`/exam2/${examId}/analytics`} />} nativeButton={false}><BarChart3 className="size-4" />Analytics</Button>
          <Button variant="outline" render={<Link to={`/exam2/grading?examId=${examId}`} />} nativeButton={false}><ClipboardCheck className="size-4" />Grading queue</Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Response insights">
        <ResponseMetric label="Submitted attempts" value={overview.attempts} detail={data.exam.studentCount ? `${data.exam.studentCount} students in ${data.exam.className}` : 'Class roster unavailable'} />
        <ResponseMetric label="Average score" value={percentLabel(overview.averagePercent)} detail={`From ${overview.gradedScores} scored attempt${overview.gradedScores === 1 ? '' : 's'}`} />
        <ResponseMetric label="Median score" value={percentLabel(overview.medianPercent)} detail={overview.scoreRange ? `Range ${percentLabel(overview.scoreRange[0])}–${percentLabel(overview.scoreRange[1])}` : 'No scored attempts yet'} />
        <ResponseMetric label="Average time" value={durationLabel(overview.averageSeconds)} detail={`${overview.pendingAttempts} attempt${overview.pendingAttempts === 1 ? '' : 's'} need grading`} />
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-border" aria-label="Response views">
        {([['overview', 'Summary'], ['questions', 'By question'], ['students', 'By student']] as const).map(([key, label]) => <button key={key} type="button" onClick={() => { setView(key); setQuestionFilter('all'); }} aria-current={view === key ? 'page' : undefined} className={`min-h-11 shrink-0 border-b-2 px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring ${view === key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{label}</button>)}
      </nav>

      {!attempts.length ? (
        <section className="rounded-sm border border-border bg-card px-6 py-14 text-center">
          <Clock3 className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-4 font-semibold text-foreground">No submitted attempts yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Student answers will appear here after they submit this exam.</p>
        </section>
      ) : <>
        {view === 'overview' && <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(17rem,1fr)]">
          <section className="rounded-lg border border-border bg-card p-5 sm:p-6" aria-labelledby="overview-questions-heading">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="overview-questions-heading" className="text-lg font-bold text-foreground">Questions to review</h2><p className="mt-1 text-sm text-muted-foreground">The most missed questions and answers awaiting grading.</p></div><Button variant="outline" onClick={() => setView('questions')}>All questions <ArrowRight className="size-4" /></Button></div>
            <div className="mt-5 divide-y divide-border">{overview.questions.length ? [...overview.questions].sort((a, b) => (b.incorrect + b.partial + b.pending) - (a.incorrect + a.partial + a.pending) || a.number - b.number).slice(0, 6).map(question => <button key={question.id} type="button" onClick={() => openQuestion(question.id)} className="flex w-full items-start justify-between gap-4 py-3 text-left hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"><span className="min-w-0"><span className="text-xs font-semibold text-muted-foreground">Question {question.number}</span><span className="mt-1 block line-clamp-2 text-sm font-medium text-foreground">{question.text}</span></span><span className="shrink-0 text-right text-xs font-semibold text-rose-700 dark:text-rose-300">{question.incorrect + question.partial} missed{question.pending ? <span className="mt-1 block text-amber-700 dark:text-amber-300">{question.pending} pending</span> : null}</span></button>) : <p className="py-5 text-sm text-muted-foreground">These saved attempts have no question-level responses. Their scores remain available, but an answer breakdown cannot be reconstructed.</p>}</div>
          </section>
          <section className="rounded-lg border border-border bg-card p-5 sm:p-6" aria-labelledby="overview-grading-heading"><h2 id="overview-grading-heading" className="text-lg font-bold text-foreground">Review workflow</h2><p className="mt-1 text-sm text-muted-foreground">Check response patterns, then inspect each student’s answer beside the key.</p><div className="mt-5 space-y-3"><Button variant="outline" className="w-full justify-start" onClick={() => setView('questions')}><BarChart3 className="size-4" />Compare answers by question</Button><Button variant="outline" className="w-full justify-start" onClick={() => setView('students')}><ClipboardCheck className="size-4" />Review individual attempts</Button>{overview.pendingAttempts > 0 && <Button className="w-full justify-start" render={<Link to={`/exam2/grading?examId=${examId}`} />} nativeButton={false}><Clock3 className="size-4" />Grade {overview.pendingAttempts} pending attempt{overview.pendingAttempts === 1 ? '' : 's'}</Button>}</div></section>
        </div>}

        {view === 'questions' && <section className="space-y-4" aria-label="Responses by question">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-bold text-foreground">Question responses</h2><p className="mt-1 text-sm text-muted-foreground">Accuracy uses graded responses. Pending writing is shown separately.</p></div><div className="relative w-full sm:w-64"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search questions" placeholder="Search questions" className="pl-9" value={questionSearch} onChange={event => setQuestionSearch(event.target.value)} /></div></div>
          <div className="flex flex-wrap gap-2" aria-label="Filter question responses">{([['all', 'All questions'], ['attention', 'Incorrect & partial'], ['pending', 'Pending grading']] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={questionFilter === key} onClick={() => setQuestionFilter(key)} className={`min-h-10 rounded-md border px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-ring ${questionFilter === key ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground'}`}>{label}</button>)}</div>
          {visibleOverviewQuestions.map(question => <QuestionResponseCard key={question.id} question={question} onOpenAttempt={selectAttempt} />)}
          {!visibleOverviewQuestions.length && <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">{overview.questions.length ? 'No questions match this filter.' : 'No question-level responses were recorded for these attempts. Saved scores are still visible in By student.'}</p>}
        </section>}

        {view === 'students' && (
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
                  <span className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{dateLabel(attempt.completedAt)}{attempt.attemptNumber > 1 ? ` · Try ${attempt.attemptNumber}` : ''}</span><span className={wrong ? 'font-semibold text-rose-700 dark:text-rose-300' : 'font-medium'}>{wrong ? `${wrong} incorrect/partial` : '—'}</span></span>
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
              {!!selected.questions.length && <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-4 text-sm" aria-label="Answer summary">
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="size-4" />{correctCount} correct</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-rose-700 dark:text-rose-300"><XCircle className="size-4" />{incorrectCount} incorrect</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-orange-700 dark:text-orange-300">{partialCount} partial</span>
                {pendingCount > 0 && <span className="inline-flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-300"><Clock3 className="size-4" />{pendingCount} pending</span>}
              </div>}
            </section>
            {!selected.questions.length ? <div className="rounded-lg border border-border bg-card px-6 py-10 text-sm text-muted-foreground"><h3 className="font-semibold text-foreground">Question review unavailable</h3><p className="mt-2">This saved attempt has a score but no recorded question responses. Answers and the answer key cannot be reconstructed for it.</p></div> : <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold text-foreground">Question review <span className="font-normal text-muted-foreground">{questions.length} of {selected.questions.length}</span></h2>
              <div className="inline-flex flex-wrap gap-1 rounded-sm border border-border bg-card p-1" aria-label="Filter questions">
                <button type="button" onClick={() => setQuestionFilter('all')} aria-pressed={questionFilter === 'all'} className={`min-h-11 rounded-sm px-3 py-1.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-ring ${questionFilter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>All questions</button>
                <button type="button" onClick={() => setQuestionFilter('attention')} aria-pressed={questionFilter === 'attention'} className={`min-h-11 rounded-sm px-3 py-1.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-ring ${questionFilter === 'attention' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Incorrect & partial ({incorrectCount + partialCount})</button>
                <button type="button" onClick={() => setQuestionFilter('pending')} aria-pressed={questionFilter === 'pending'} className={`min-h-11 rounded-sm px-3 py-1.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-ring ${questionFilter === 'pending' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Pending grading ({pendingCount})</button>
              </div>
            </div>
            {!questions.length && <div className="rounded-sm border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">{questionFilter === 'pending' ? 'All responses in this attempt have been graded.' : questionFilter === 'attention' ? 'No incorrect or partially correct answers in this attempt.' : 'No answers are available for this attempt.'}</div>}
            <div className="space-y-3">
              {questions.map(question => <article key={question.id} className="rounded-sm border border-border bg-card p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                  <div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">Question {question.number}</span><span className="text-xs capitalize text-muted-foreground">{questionType(question.type)}</span>{question.answerKeyCorrected && <span className="text-xs text-teal-700 dark:text-teal-300">Updated answer key</span>}</div>
                  <div className="flex items-center gap-3 text-sm"><span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${statusTone(question.status)}`}>{statusLabel(question.status)}</span><span className="tabular-nums text-muted-foreground">{question.pointsAwarded == null ? '—' : question.pointsAwarded} / {question.maxPoints} pts</span></div>
                </div>
                {question.passageText && <div className="mt-4 border-l-2 border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground"><p className="mb-1 text-[11px] font-bold uppercase tracking-widest">Passage</p><MathText text={question.passageText} /></div>}
                <div className="mt-4 text-base font-medium leading-relaxed text-foreground"><MathText text={question.text} /></div>
                {question.imageUrl && <img src={question.imageUrl} alt="Question illustration" className="mt-4 max-h-72 max-w-full rounded-sm border border-border object-contain" />}
                {question.blankRows.length > 0 ? <div className="mt-5 space-y-2">{question.blankRows.map(row => <div key={row.label} className="grid gap-2 border-t border-border pt-2 text-sm sm:grid-cols-[100px_1fr_1fr]"><span className="font-semibold text-muted-foreground">{row.label}</span><span className={`rounded-md border p-3 ${row.isCorrect ? statusTone('CORRECT') : statusTone('INCORRECT')}`}><span className="block text-xs font-semibold">Student answer · {row.isCorrect ? 'Correct' : 'Incorrect'}</span><span className="mt-1 block break-words text-foreground">{row.student || 'No answer'}</span></span><span className="rounded-md border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-950/20"><span className="block text-xs font-semibold text-emerald-800 dark:text-emerald-200">Correct answer</span><span className="mt-1 block break-words font-medium text-foreground">{row.correct}</span></span></div>)}</div> : <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className={`min-w-0 rounded-md border p-4 ${statusTone(question.status)}`}><p className="text-xs font-bold uppercase tracking-wider">Student answer · {statusLabel(question.status)}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">{question.studentAnswer || 'No answer submitted'}</p></div><div className="min-w-0 rounded-md border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/20"><p className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-200">{isWrittenQuestion(question) ? 'Model answer' : 'Correct answer'}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm font-medium text-foreground">{question.correctAnswer || 'No answer key available'}</p></div></div>}
                {question.explanation && <div className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground"><span className="font-semibold text-foreground">Explanation: </span><MathText text={question.explanation} /></div>}
                {question.status === 'PENDING' && <Link className={buttonVariants({ variant: 'outline', className: 'mt-4' })} to={`/exam2/grade/${selected.id}/${question.id}?examId=${examId}&status=ALL`}>Grade this response</Link>}
              </article>)}
            </div>
            </>}
          </main>}
        </div>
        )}
      </>}
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
