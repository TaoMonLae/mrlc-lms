import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { apiGet, authHeaders } from '../../lib/api';
import { PlayCircle, RotateCcw, Lock, Clock } from 'lucide-react';

type Avail = {
  id: string; title: string; durationMinutes: number | null; openNow: boolean;
  requiresAccessCode: boolean; attemptLimit: number; attemptsUsed: number;
  activeAttemptId: string | null; availableUntil: string | null;
};

export default function ResumeAttempt() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Avail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { apiGet<Avail[]>('/api/exam2/available').then((d) => setExams(d || [])).catch(() => setExams([])).finally(() => setLoading(false)); }, []);

  const start = async (e: Avail) => {
    let accessCode: string | undefined;
    if (e.requiresAccessCode && !e.activeAttemptId) {
      accessCode = window.prompt('Enter the exam access code') || undefined;
      if (!accessCode) return;
    }
    const res = await fetch(`/api/exam2/${e.id}/start`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ accessCode, deviceInfo: { ua: navigator.userAgent, w: screen.width, h: screen.height } }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error || 'Could not start exam'); return; }
    navigate(`/exam2/attempts/${data.attempt.id}/play`);
  };

  if (loading) return <div className="py-20 text-center text-slate-500">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Exams</h1>
        <p className="text-sm text-slate-500 mt-1">Start a new attempt or resume one in progress.</p>
      </div>
      {exams.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 dark:border-surface-raised p-10 text-center text-slate-500">No exams available right now.</div>}
      {exams.map((e) => {
        const exhausted = e.attemptsUsed >= e.attemptLimit && !e.activeAttemptId;
        return (
          <div key={e.id} className="flex items-center justify-between bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-5">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">{e.title}</h3>
              <div className="flex items-center gap-3 text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                {e.durationMinutes && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {e.durationMinutes}m</span>}
                <span>Attempt {Math.min(e.attemptsUsed + (e.activeAttemptId ? 0 : 1), e.attemptLimit)}/{e.attemptLimit}</span>
                {e.requiresAccessCode && <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Code</span>}
              </div>
            </div>
            {e.activeAttemptId ? (
              <Button onClick={() => navigate(`/exam2/attempts/${e.activeAttemptId}/play`)} className="bg-amber-500 hover:bg-amber-600 text-white"><RotateCcw className="h-4 w-4 mr-1" /> Resume</Button>
            ) : exhausted ? (
              <Button disabled variant="outline">No attempts left</Button>
            ) : !e.openNow ? (
              <Button disabled variant="outline">Not open</Button>
            ) : (
              <Button onClick={() => start(e)} className="bg-primary text-primary-foreground"><PlayCircle className="h-4 w-4 mr-1" /> Start</Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
