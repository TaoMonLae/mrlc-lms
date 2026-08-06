import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { AlertTriangle, ArrowLeft, ArrowRight, BarChart3, CheckCircle2, ClipboardCheck, Clock3, RefreshCw, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '../../components/ui/empty-state';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../../lib/api';
import { analyticsFlagInfo } from '../../../shared/examAnalytics';

type QuestionStat = {
  questionId: string;
  difficultyIndex: number | null;
  discriminationIndex: number | null;
  avgResponseSeconds: number | null;
  flags: string[];
  question?: { text?: string };
};

type ExamAnalyticsData = {
  attempts: number;
  scoredAttempts: number;
  avgScore: number | null;
  medianScore: number | null;
  passRate: number | null;
  questions: QuestionStat[];
  flaggedQuestions: QuestionStat[];
  exam: { id: string; title: string; totalMarks: number | null; passMark: number | null } | null;
};

const round = (value: number | null | undefined) => value == null ? '—' : String(Math.round(value * 100) / 100);
const percent = (value: number | null | undefined) => value == null ? '—' : `${Math.round(value * 100)}%`;

function SummaryCard({ icon: Icon, label, value, detail }: { icon: typeof BarChart3; label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-surface-raised dark:bg-surface-indigo sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{detail}</p>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300"><Icon className="size-4" /></span>
      </div>
    </div>
  );
}

export default function ExamAnalytics() {
  const { examId } = useParams();
  const [data, setData] = useState<ExamAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!examId) return;
    setLoading(true);
    setLoadError(false);
    try {
      setData(await apiGet<ExamAnalyticsData>(`/api/exams/${examId}/analytics`));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => { void load(); }, [load]);

  const recompute = async () => {
    setBusy(true);
    try {
      await apiSend(`/api/exams/${examId}/analyze`, 'POST');
      toast.success('Question analytics recomputed');
      await load();
    } catch (error: any) {
      toast.error(error.message || 'Failed to recompute analytics');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500"><RefreshCw className="size-4 animate-spin" />Loading exam analytics…</div>;
  if (loadError && !data) return <EmptyState icon={AlertTriangle} title="Exam analytics could not be loaded" description="Check your connection and try again." action={<Button variant="outline" onClick={() => void load()}><RefreshCw className="size-4" />Try again</Button>} />;
  if (!data) return null;

  const scoreSuffix = data.exam?.totalMarks != null ? ` / ${round(data.exam.totalMarks)}` : '';
  const gradedDetail = data.scoredAttempts === data.attempts
    ? `${data.scoredAttempts} graded attempt${data.scoredAttempts === 1 ? '' : 's'}`
    : `${data.scoredAttempts} of ${data.attempts} attempts graded`;

  return (
    <div className="mx-auto max-w-[1440px] space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Button variant="link" size="sm" className="-ml-2 mb-2 h-auto px-2 text-slate-500" render={<Link to={`/exams/${examId}`} />} nativeButton={false}><ArrowLeft className="size-4" />Exam profile</Button>
          <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            <span className="flex size-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300"><BarChart3 className="size-5" /></span>
            Exam results &amp; analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{data.exam?.title || 'Review performance and question quality.'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link to={`/exam2/grading?examId=${examId}`} />} nativeButton={false}><ClipboardCheck className="size-4" />Grading queue</Button>
          <Button onClick={() => void recompute()} disabled={busy} className="bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-400 dark:text-slate-950 dark:hover:bg-teal-300"><RefreshCw className={`size-4 ${busy ? 'animate-spin' : ''}`} />{busy ? 'Recomputing…' : 'Recompute'}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={ClipboardCheck} label="Submitted attempts" value={data.attempts} detail={gradedDetail} />
        <SummaryCard icon={BarChart3} label="Average score" value={`${round(data.avgScore)}${scoreSuffix}`} detail="Across graded attempts" />
        <SummaryCard icon={Target} label="Median score" value={`${round(data.medianScore)}${scoreSuffix}`} detail="Middle graded result" />
        <SummaryCard icon={CheckCircle2} label="Pass rate" value={percent(data.passRate)} detail={data.exam?.passMark != null ? `Pass mark: ${round(data.exam.passMark)}${scoreSuffix}` : 'No pass mark configured'} />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-surface-raised dark:bg-surface-indigo" aria-labelledby="question-quality-heading">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 dark:border-surface-raised sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="question-quality-heading" className="font-semibold text-slate-900 dark:text-white">Question quality</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Accuracy, separation, timing, and response-quality signals.</p>
          </div>
          <span className="text-xs font-medium text-slate-500">{data.flaggedQuestions?.length || 0} of {data.questions?.length || 0} need review</span>
        </div>
        {data.questions?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-surface-raised/50 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3 text-left">Question</th>
                  <th className="px-3 py-3 text-center">Accuracy</th>
                  <th className="px-3 py-3 text-center">Separation</th>
                  <th className="px-3 py-3 text-center">Avg. time</th>
                  <th className="px-3 py-3 text-left">Review signals</th>
                  <th className="px-5 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.questions.map((question) => (
                  <tr key={question.questionId} className="hover:bg-slate-50/80 dark:hover:bg-surface-raised/30">
                    <td className="max-w-[420px] px-5 py-4 font-medium text-slate-800 dark:text-slate-100"><span className="line-clamp-2">{question.question?.text || question.questionId}</span></td>
                    <td className="px-3 py-4 text-center font-semibold text-slate-700 dark:text-slate-200">{percent(question.difficultyIndex)}</td>
                    <td className="px-3 py-4 text-center text-slate-600 dark:text-slate-300">{round(question.discriminationIndex)}</td>
                    <td className="px-3 py-4 text-center text-slate-600 dark:text-slate-300">{question.avgResponseSeconds != null ? `${Math.round(question.avgResponseSeconds)}s` : '—'}</td>
                    <td className="px-3 py-4">
                      {question.flags?.length ? <div className="flex flex-wrap gap-1.5">{question.flags.map((flag) => { const info = analyticsFlagInfo(flag); return <Badge key={flag} title={info.description} className="border border-amber-200 bg-amber-50 text-[10px] text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">{info.label}</Badge>; })}</div> : <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 className="size-3.5" />No issues</span>}
                    </td>
                    <td className="px-5 py-4 text-right"><Button variant="ghost" size="sm" render={<Link to={`/exam2/${examId}/questions/${question.questionId}/analytics`} aria-label={`View analytics for ${question.question?.text || 'question'}`} />} nativeButton={false}>Details<ArrowRight className="size-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Clock3} title="No question statistics yet" description="Recompute analytics after learners submit attempts." action={<Button onClick={() => void recompute()} disabled={busy}><RefreshCw className={`size-4 ${busy ? 'animate-spin' : ''}`} />Recompute analytics</Button>} />
        )}
      </section>
    </div>
  );
}
