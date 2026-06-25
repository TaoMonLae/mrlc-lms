import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../lib/api';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck } from 'lucide-react';

export default function ManualGradingQueue() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');

  useEffect(() => {
    setLoading(true);
    apiGet(`/api/grading/queue${filter ? `?status=${filter}` : ''}`).then((d) => setRows(d || [])).catch(() => setRows([])).finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><ClipboardCheck className="h-6 w-6 text-aubergine-600" /> Manual Grading Queue</h1>
          <p className="text-sm text-slate-500 mt-1">Essays, short answers, file and spoken responses awaiting marking.</p>
        </div>
        <select className="h-10 rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas px-3 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="PENDING">Pending</option>
          <option value="IN_REVIEW">In review</option>
          <option value="GRADED">Graded</option>
          <option value="FINALIZED">Finalized</option>
          <option value="">All</option>
        </select>
      </div>
      {loading ? <div className="py-16 text-center text-slate-500">Loading…</div> :
        rows.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 dark:border-surface-raised p-10 text-center text-slate-500">Nothing to grade.</div> :
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
