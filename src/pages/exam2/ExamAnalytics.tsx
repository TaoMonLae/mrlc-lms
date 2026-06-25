import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../../lib/api';
import { BarChart3, RefreshCw, ClipboardCheck } from 'lucide-react';

const FLAG_LABEL: Record<string, string> = {
  TOO_EASY: 'Too easy', TOO_HARD: 'Too difficult', POOR_DISCRIMINATION: 'Poor discrimination',
  UNUSED_DISTRACTOR: 'Unused distractor', SLOW: 'Slow', ABNORMAL_PATTERN: 'Abnormal pattern',
};

export default function ExamAnalytics() {
  const { examId } = useParams();
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = () => apiGet(`/api/exams/${examId}/analytics`).then(setData).catch(() => setData({ attempts: 0, questions: [] }));
  useEffect(() => { load(); }, [examId]);

  const recompute = async () => {
    setBusy(true);
    try { await apiSend(`/api/exams/${examId}/analyze`, 'POST'); toast.success('Item analysis recomputed'); await load(); }
    catch (e: any) { toast.error(e.message || 'Failed'); } finally { setBusy(false); }
  };

  if (!data) return <div className="py-20 text-center text-slate-500">Loading…</div>;
  const r1 = (n: any) => n == null ? '—' : (Math.round(n * 100) / 100);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><BarChart3 className="h-6 w-6 text-aubergine-600" /> Exam Results &amp; Analytics</h1>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link to={`/exam2/grading?examId=${examId}`} />} nativeButton={false}><ClipboardCheck className="h-4 w-4 mr-1" /> Grading queue</Button>
          <Button onClick={recompute} disabled={busy} variant="outline"><RefreshCw className={`h-4 w-4 mr-1 ${busy ? 'animate-spin' : ''}`} /> Recompute</Button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[['Attempts', data.attempts], ['Avg score', r1(data.avgScore)], ['Median', r1(data.medianScore)], ['Pass rate', data.passRate != null ? `${Math.round(data.passRate * 100)}%` : '—']].map(([l, v]) => (
          <div key={l as string} className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-slate-900 dark:text-white">{v as any}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{l as string}</div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-surface-raised/40 text-[11px] uppercase tracking-widest text-slate-400">
            <tr><th className="text-left px-4 py-3">Question</th><th className="px-3">Difficulty</th><th className="px-3">Discrim.</th><th className="px-3">Avg time</th><th className="px-3">Flags</th><th></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {(data.questions || []).map((q: any) => (
              <tr key={q.questionId} className="hover:bg-slate-50 dark:hover:bg-surface-raised/30">
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200 max-w-[280px] truncate">{q.question?.text || q.questionId}</td>
                <td className="px-3 text-center">{r1(q.difficultyIndex)}</td>
                <td className="px-3 text-center">{r1(q.discriminationIndex)}</td>
                <td className="px-3 text-center">{q.avgResponseSeconds ? `${Math.round(q.avgResponseSeconds)}s` : '—'}</td>
                <td className="px-3 text-center">{(q.flags || []).map((f: string) => <Badge key={f} className="bg-amber-100 text-amber-700 text-[9px] mr-1">{FLAG_LABEL[f] || f}</Badge>)}</td>
                <td className="px-3 text-right"><Link className="text-aubergine-600 text-xs font-semibold" to={`/exam2/${examId}/questions/${q.questionId}/analytics`}>Detail →</Link></td>
              </tr>
            ))}
            {(!data.questions || data.questions.length === 0) && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No statistics yet — click Recompute after attempts are submitted.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
