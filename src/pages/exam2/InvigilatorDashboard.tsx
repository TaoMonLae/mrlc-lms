import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../../lib/api';
import { Monitor, Wifi, WifiOff, Clock, ShieldAlert } from 'lucide-react';

const STATE_COLOR: Record<string, string> = {
  NOT_STARTED: 'bg-slate-200 text-slate-600', IN_PROGRESS: 'bg-emerald-100 text-emerald-700',
  PAUSED: 'bg-amber-100 text-amber-700', SUBMITTED: 'bg-blue-100 text-blue-700',
  AUTO_SUBMITTED: 'bg-blue-100 text-blue-700', PENDING_GRADING: 'bg-purple-100 text-purple-700',
  FINALIZED: 'bg-slate-200 text-slate-700', RELEASED: 'bg-slate-200 text-slate-700', INVALIDATED: 'bg-red-100 text-red-700',
};

export default function InvigilatorDashboard() {
  const { examId } = useParams();
  const [data, setData] = useState<any>(null);

  const load = useCallback(() => { apiGet(`/api/exams/${examId}/invigilator`).then(setData).catch(() => {}); }, [examId]);
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]); // live: refresh every 10s

  const act = async (attemptId: string, action: string) => {
    let extra: any = {};
    if (action === 'EXTRA_TIME') { const m = window.prompt('Extra minutes?', '10'); if (!m) return; extra.minutes = Number(m); }
    if (action === 'INCIDENT_NOTE') { const note = window.prompt('Incident note'); if (!note) return; extra.note = note; }
    if (['INVALIDATE', 'FORCE_SUBMIT', 'REOPEN'].includes(action) && !confirm(`${action.replace('_', ' ')} this attempt?`)) return;
    try { await apiSend(`/api/attempts/${attemptId}/invigilate`, 'POST', { action, ...extra }); toast.success(`${action} applied`); load(); }
    catch (e: any) { toast.error(e.message || 'Action failed'); }
  };

  if (!data) return <div className="py-20 text-center text-slate-500">Loading live session…</div>;
  const fmt = (s: number | null) => s == null ? '—' : `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Monitor className="h-6 w-6 text-aubergine-600" /> Invigilator Dashboard</h1>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[['Not started', data.summary.notStarted], ['In progress', data.summary.inProgress], ['Paused', data.summary.paused], ['Submitted', data.summary.submitted], ['Disconnected', data.summary.disconnected]].map(([l, v]) => (
          <div key={l as string} className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-slate-900 dark:text-white">{v as number}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{l as string}</div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-surface-raised/40 text-[11px] uppercase tracking-widest text-slate-400">
            <tr><th className="text-left px-4 py-3">Student</th><th className="px-3">State</th><th className="px-3">Time left</th><th className="px-3">Last save</th><th className="px-3">Conn</th><th className="px-3">Warnings</th><th className="px-3">IP</th><th className="px-3">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.students.map((s: any) => (
              <tr key={s.studentId} className="hover:bg-slate-50 dark:hover:bg-surface-raised/30">
                <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white">{s.name}</td>
                <td className="px-3 text-center"><Badge className={`${STATE_COLOR[s.state] || ''} text-[9px]`}>{s.state.replace('_', ' ')}</Badge></td>
                <td className="px-3 text-center font-mono"><span className="inline-flex items-center gap-1"><Clock className="h-3 w-3 text-slate-400" />{fmt(s.remainingSeconds)}</span></td>
                <td className="px-3 text-center text-xs text-slate-500">{s.lastSavedAt ? new Date(s.lastSavedAt).toLocaleTimeString() : '—'}</td>
                <td className="px-3 text-center">{s.disconnected ? <WifiOff className="h-4 w-4 text-red-500 mx-auto" /> : <Wifi className="h-4 w-4 text-emerald-500 mx-auto" />}</td>
                <td className="px-3 text-center">{s.securityWarnings > 0 ? <span className="inline-flex items-center gap-1 text-amber-600 font-bold"><ShieldAlert className="h-3.5 w-3.5" />{s.securityWarnings}</span> : '0'}</td>
                <td className="px-3 text-center text-[10px] text-slate-400 font-mono">{s.ipAddress || '—'}</td>
                <td className="px-3 py-2">
                  {s.attemptId ? (
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => act(s.attemptId, 'EXTRA_TIME')}>+Time</Button>
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => act(s.attemptId, s.state === 'PAUSED' ? 'RESUME' : 'PAUSE')}>{s.state === 'PAUSED' ? 'Resume' : 'Pause'}</Button>
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => act(s.attemptId, 'FORCE_SUBMIT')}>Submit</Button>
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => act(s.attemptId, 'REOPEN')}>Reopen</Button>
                      <Button size="sm" variant="outline" className="h-7 text-[10px] text-red-600" onClick={() => act(s.attemptId, 'INVALIDATE')}>Void</Button>
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => act(s.attemptId, 'INCIDENT_NOTE')}>Note</Button>
                    </div>
                  ) : <span className="text-xs text-slate-400">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
