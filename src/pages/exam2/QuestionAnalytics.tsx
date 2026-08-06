import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { AlertTriangle, ArrowLeft, BarChart3, CheckCircle2, Clock3, RefreshCw, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '../../components/ui/empty-state';
import { apiGet } from '../../lib/api';
import { analyticsFlagInfo } from '../../../shared/examAnalytics';

type QuestionAnalyticsData = {
  attempts: number;
  correctCount: number;
  incorrectCount: number;
  blankCount: number;
  difficultyIndex: number | null;
  discriminationIndex: number | null;
  avgResponseSeconds: number | null;
  avgScore: number | null;
  medianScore: number | null;
  stdDev: number | null;
  distractorRates: Record<string, number> | null;
  flags: string[];
  computedAt?: string;
  question?: { text?: string; points?: number; type?: string };
};

const round = (value: number | null | undefined) => value == null ? '—' : String(Math.round(value * 100) / 100);
const ratioPercent = (value: number, total: number) => total > 0 ? `${Math.round((value / total) * 100)}%` : '—';

function MetricCard({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-surface-raised dark:bg-surface-indigo">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{detail}</p>
    </div>
  );
}

export default function QuestionAnalytics() {
  const { examId, qid } = useParams();
  const [data, setData] = useState<QuestionAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!examId || !qid) return;
    setLoading(true);
    setLoadError(false);
    try {
      setData(await apiGet<QuestionAnalyticsData | null>(`/api/exams/${examId}/questions/${qid}/analytics`));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [examId, qid]);

  useEffect(() => { void load(); }, [load]);

  if (loading && !data) return <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500"><RefreshCw className="size-4 animate-spin" />Loading question analytics…</div>;
  if (loadError) return <EmptyState icon={AlertTriangle} title="Question analytics could not be loaded" description="Check your connection and try again." action={<Button variant="outline" onClick={() => void load()}><RefreshCw className="size-4" />Try again</Button>} />;
  if (!data) return <EmptyState icon={BarChart3} title="No statistics for this question" description="Return to exam analytics and recompute after learners submit attempts." action={<Button variant="outline" render={<Link to={`/exam2/${examId}/analytics`} />} nativeButton={false}><ArrowLeft className="size-4" />Back to exam analytics</Button>} />;

  const attempts = data.attempts || 0;
  const unscored = Math.max(0, attempts - data.correctCount - data.incorrectCount - data.blankCount);
  const points = data.question?.points;
  const pointSuffix = points != null ? ` / ${round(points)}` : '';
  const distractors = Object.entries(data.distractorRates || {});

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <Button variant="link" size="sm" className="-ml-2 mb-2 h-auto px-2 text-slate-500" render={<Link to={`/exam2/${examId}/analytics`} />} nativeButton={false}><ArrowLeft className="size-4" />Exam analytics</Button>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-surface-raised dark:bg-surface-indigo sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">Question analytics</p>
              <h1 className="mt-2 text-xl font-bold leading-snug text-slate-900 dark:text-white sm:text-2xl">{data.question?.text || 'Question'}</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Based on {attempts} assigned attempt{attempts === 1 ? '' : 's'}{data.computedAt ? ` · Last computed ${new Date(data.computedAt).toLocaleString()}` : ''}</p>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300"><Target className="size-5" /></span>
          </div>
        </div>
      </div>

      <section aria-labelledby="response-overview-heading" className="space-y-3">
        <div>
          <h2 id="response-overview-heading" className="font-semibold text-slate-900 dark:text-white">Response overview</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">How learners answered this question.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Correct" value={data.correctCount} detail={`${ratioPercent(data.correctCount, attempts)} of assigned attempts`} />
          <MetricCard label="Incorrect" value={data.incorrectCount} detail={`${ratioPercent(data.incorrectCount, attempts)} of assigned attempts`} />
          <MetricCard label="Blank" value={data.blankCount} detail={`${ratioPercent(data.blankCount, attempts)} left unanswered`} />
          <MetricCard label={unscored ? 'Awaiting review' : 'Analyzed attempts'} value={unscored || attempts} detail={unscored ? 'Responses without a correctness result' : 'All responses included'} />
        </div>
      </section>

      <section aria-labelledby="quality-metrics-heading" className="space-y-3">
        <div>
          <h2 id="quality-metrics-heading" className="font-semibold text-slate-900 dark:text-white">Question quality</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Use these indicators together; no single metric tells the whole story.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard label="Accuracy" value={data.difficultyIndex == null ? '—' : `${Math.round(data.difficultyIndex * 100)}%`} detail="Share answered correctly" />
          <MetricCard label="Separation" value={round(data.discriminationIndex)} detail="Higher is generally better" />
          <MetricCard label="Average points" value={`${round(data.avgScore)}${pointSuffix}`} detail="Mean awarded score" />
          <MetricCard label="Median points" value={`${round(data.medianScore)}${pointSuffix}`} detail="Middle awarded score" />
          <MetricCard label="Average time" value={data.avgResponseSeconds != null ? `${Math.round(data.avgResponseSeconds)}s` : '—'} detail={data.stdDev != null ? `Score spread: ${round(data.stdDev)}` : 'Timing not recorded'} />
        </div>
      </section>

      {distractors.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-surface-raised dark:bg-surface-indigo" aria-labelledby="distractor-selection-heading">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-surface-raised dark:text-slate-300"><BarChart3 className="size-4" /></span>
            <div>
              <h2 id="distractor-selection-heading" className="font-semibold text-slate-900 dark:text-white">Incorrect option selection</h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Share of assigned attempts that selected each incorrect option.</p>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {distractors.map(([label, rate]) => {
              const value = Math.max(0, Math.min(100, Math.round(Number(rate) * 100)));
              return (
                <div key={label} className="grid grid-cols-[minmax(7rem,12rem)_1fr_3rem] items-center gap-3">
                  <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200" title={label}>{label}</span>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-surface-raised" role="progressbar" aria-label={`${label} selected by ${value}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><div className={`h-full rounded-full ${value === 0 ? 'w-0' : 'bg-teal-500'}`} style={{ width: `${value}%` }} /></div>
                  <span className={`text-right text-xs font-bold ${value === 0 ? 'text-amber-600' : 'text-slate-500 dark:text-slate-400'}`}>{value}%</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-surface-raised dark:bg-surface-indigo" aria-labelledby="review-signals-heading">
        <h2 id="review-signals-heading" className="font-semibold text-slate-900 dark:text-white">Review signals</h2>
        {data.flags?.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {data.flags.map((flag) => { const info = analyticsFlagInfo(flag); return (
              <div key={flag} className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/70 dark:bg-amber-950/30">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <div><Badge className="border-0 bg-transparent p-0 text-amber-800 dark:text-amber-200">{info.label}</Badge><p className="mt-1 text-sm leading-5 text-amber-800/80 dark:text-amber-200/75">{info.description}</p></div>
              </div>
            ); })}
          </div>
        ) : (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"><CheckCircle2 className="mt-0.5 size-5 shrink-0" /><div><p className="font-semibold">No automatic issues detected</p><p className="mt-0.5 text-sm opacity-80">Continue using teacher judgment and learner feedback when reviewing this question.</p></div></div>
        )}
      </section>
    </div>
  );
}
