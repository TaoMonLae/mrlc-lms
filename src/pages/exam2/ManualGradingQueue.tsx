import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { apiGet } from '../../lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck } from 'lucide-react';

export default function ManualGradingQueue() {
  const [params] = useSearchParams();
  const examId = params.get('examId') || '';
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [filter, setFilter] = useState('PENDING');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const qs = new URLSearchParams();
    qs.set('status', filter || 'ALL');
    if (examId) qs.set('examId', examId);
    apiGet(`/api/grading/queue?${qs}`, { signal: controller.signal }).then(d => { if (!controller.signal.aborted) setRows(d || []); }).catch(() => { if (!controller.signal.aborted) setError('Could not load the grading queue. Please retry.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filter, examId, retry]);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <Button variant="ghost" render={<Link to={examId ? `/exams/${examId}` : "/exams"} />} nativeButton={false}>Back to exams</Button>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><ClipboardCheck className="h-6 w-6 text-aubergine-600" /> Manual Grading Queue</h1>
          <p className="text-sm text-slate-500 mt-1">Essays, short answers, file and spoken responses awaiting marking.</p>
        </div>
        <select aria-label="Grading status" className="h-10 rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas px-3 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="PENDING">Pending</option>
          <option value="IN_REVIEW">In review</option>
          <option value="GRADED">Graded</option>
          <option value="FINALIZED">Finalized</option>
          <option value="">All</option>
        </select>
      </div>
      {loading ? <div className="py-16 text-center text-slate-500">Loading…</div> :
        error ? <div role="alert" className="border border-destructive/40 p-5"><p>{error}</p><Button variant="outline" className="mt-3" onClick={() => setRetry(n => n + 1)}>Retry</Button></div> : rows.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 dark:border-surface-raised p-10 text-center text-slate-500">Nothing to grade.</div> :
        <div className="space-y-3">
          {rows.map((g) => (
            <Link key={g.id} to={`/exam2/grade/${g.attemptId}/${g.questionId}`} className="block bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-5 hover:border-aubergine-300 transition-colors">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 dark:text-white truncate">{g.attempt?.student?.user ? `${g.attempt.student.user.firstName} ${g.attempt.student.user.lastName}` : g.attempt?.student?.studentCode}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{g.attempt?.exam?.title} · {g.question?.type}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">{g.answer?.answerText || '— no answer —'}</p>
                </div>
                <Badge variant={g.status === 'FINALIZED' ? 'secondary' : 'outline'} className={g.isFinalized ? 'bg-slate-200 text-slate-600' : 'border-amber-300 text-amber-700'}>{g.status}</Badge>
              </div>
            </Link>
          ))}
        </div>}
    </div>
  );
}
