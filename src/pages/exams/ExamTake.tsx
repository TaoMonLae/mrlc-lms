import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';
import { authHeaders } from '../../lib/api';

/**
 * Unified exam delivery: the legacy /exams/:id/take route now funnels into the
 * single Phase 2 player. It starts (or resumes) an attempt server-side and
 * forwards to /exam2/attempts/:attemptId/play. This removes the duplicate take
 * engine while keeping every existing link/bookmark working.
 */
export default function ExamTake() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/exam2/${id}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ deviceInfo: { ua: navigator.userAgent, w: screen.width, h: screen.height } }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          // Access codes / windows / assignments are handled on the player's list.
          if (res.status === 403 && /access code/i.test(data.error || '')) { navigate('/exam2/resume', { replace: true }); return; }
          setError(data.error || 'This exam could not be started.');
          return;
        }
        navigate(`/exam2/attempts/${data.attempt.id}/play`, { replace: true });
      } catch {
        if (!cancelled) setError('Network error while starting the exam.');
      }
    })();
    return () => { cancelled = true; };
  }, [id, navigate]);

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-24 p-8 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 text-center space-y-3">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Can't open this exam</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
        <Button onClick={() => navigate('/exam2/resume')}>Go to my exams</Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-32 text-slate-500">
      <Loader2 className="h-6 w-6 animate-spin mr-2" /> Preparing your exam…
    </div>
  );
}
