import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { apiGet } from '../../lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck } from 'lucide-react';

export default function ManualGradingQueue() {
  const [params, setParams] = useSearchParams();
  const examId = params.get('examId') || '';
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const filter = params.get('status') || 'PENDING';

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
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><ClipboardCheck className="h-6 w-6 text-primary" /> Manual Grading Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">Review submitted responses, save feedback, and finalize marks.</p>
        </div>
        <select aria-label="Grading status" className="h-10 rounded-md border border-border bg-background px-3 text-sm" value={filter} onChange={(e) => { const next = new URLSearchParams(params); next.set('status', e.target.value); setParams(next); }}>
          <option value="PENDING">Pending</option>
          <option value="IN_REVIEW">In review</option>
          <option value="GRADED">Graded</option>
          <option value="MODERATED">Moderated</option>
          <option value="FINALIZED">Finalized</option>
          <option value="ALL">All</option>
        </select>
      </div>
      {loading ? <div className="py-16 text-center text-muted-foreground">Loading…</div> :
        error ? <div role="alert" className="border border-destructive/40 p-5"><p>{error}</p><Button variant="outline" className="mt-3" onClick={() => setRetry(n => n + 1)}>Retry</Button></div> : rows.length === 0 ? <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">No responses match this status. Choose All to review other marking work.</div> :
        <div className="space-y-3">
          {rows.map((g) => (
            <Link key={g.id} to={`/exam2/grade/${g.attemptId}/${g.questionId}?${params.toString()}`} className="block bg-card border border-border rounded-xl p-5 hover:border-primary focus-visible:outline-2 focus-visible:outline-primary transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-foreground truncate">{g.attempt?.student?.user ? `${g.attempt.student.user.firstName} ${g.attempt.student.user.lastName}` : g.attempt?.student?.studentCode}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{g.attempt?.exam?.title} · {g.question?.type} · {g.answer?.maxPoints ?? g.question?.points ?? 0} points</p>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{g.answer?.answerText || '— no answer —'}</p>
                </div>
                <Badge variant={g.status === 'FINALIZED' ? 'secondary' : 'outline'} className={g.isFinalized ? 'bg-muted text-muted-foreground' : 'border-border text-foreground'}>{g.status}</Badge>
              </div>
            </Link>
          ))}
        </div>}
    </div>
  );
}
