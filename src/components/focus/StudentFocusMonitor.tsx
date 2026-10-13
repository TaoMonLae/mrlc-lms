import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, ShieldAlert, Timer } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { apiSend } from '../../lib/api';
import { isMrlcKiosk } from '../../lib/kiosk';

type FocusSession = {
  id: string;
  endsAt: string;
  status: 'ACTIVE' | 'RELEASED' | 'COMPLETED';
  releaseRequestedAt: string | null;
};

export function StudentFocusMonitor() {
  const { user, isSessionVerified } = useAuth();
  const kiosk = isMrlcKiosk();
  const eligible = user?.role === 'STUDENT' && !user.isExternalLearner && !user.mustChangePassword && isSessionVerified;
  const [session, setSession] = useState<FocusSession | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [fullscreen, setFullscreen] = useState(kiosk || Boolean(document.fullscreenElement));
  const sending = useRef(false);
  const sessionRef = useRef<FocusSession | null>(null);
  sessionRef.current = session;

  const report = useCallback(async () => {
    if (!sessionRef.current || sessionRef.current.status !== 'ACTIVE' || sending.current) return;
    sending.current = true;
    try {
      const next = await apiSend<FocusSession>('/api/focus/heartbeat', 'POST', {
        focused: document.visibilityState === 'visible' && document.hasFocus(),
        fullscreen: kiosk || Boolean(document.fullscreenElement),
      }, { keepalive: true });
      setSession(next);
      setError('');
    } catch {
      setError('Focus status could not reach the school server. Reconnect to continue tracking.');
    } finally {
      sending.current = false;
    }
  }, [kiosk]);

  useEffect(() => {
    if (!eligible) { setSession(null); return; }
    let cancelled = false;
    apiSend<FocusSession>('/api/focus/session', 'POST').then((row) => {
      if (!cancelled) { setSession(row); setError(''); }
    }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not start focus session'); });
    return () => { cancelled = true; };
  }, [eligible, user?.id]);

  useEffect(() => {
    if (!eligible || !session || session.status !== 'ACTIVE') return;
    const onChange = () => { setFullscreen(kiosk || Boolean(document.fullscreenElement)); void report(); };
    document.addEventListener('visibilitychange', onChange);
    document.addEventListener('fullscreenchange', onChange);
    window.addEventListener('focus', onChange);
    window.addEventListener('blur', onChange);
    const interval = window.setInterval(() => { setNow(Date.now()); void report(); }, 15_000);
    void report();
    return () => {
      document.removeEventListener('visibilitychange', onChange);
      document.removeEventListener('fullscreenchange', onChange);
      window.removeEventListener('focus', onChange);
      window.removeEventListener('blur', onChange);
      window.clearInterval(interval);
    };
  }, [eligible, session?.id, session?.status, report, kiosk]);

  if (!eligible || (!session && !error)) return null;
  const active = session?.status === 'ACTIVE' && new Date(session.endsAt).getTime() > now;
  const minutes = session ? Math.max(0, Math.ceil((new Date(session.endsAt).getTime() - now) / 60_000)) : 0;
  if (!active && !error) return null;

  return (
    <aside aria-label="Focus session" className="fixed bottom-4 right-4 z-[100] w-[min(360px,calc(100vw-2rem))] rounded-xl border border-amber-300 bg-white p-4 text-slate-900 shadow-2xl dark:border-amber-700 dark:bg-slate-900 dark:text-white">
      <div className="flex items-center gap-2 font-bold"><Timer className="h-4 w-4 text-amber-600" /> Focus session {active ? `· ${minutes} min left` : ''}</div>
      {active && <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">Stay in the LMS during your assigned time. Your teacher can see when this page loses focus or exits full screen.</p>}
      {error && <p role="alert" className="mt-2 text-xs text-red-700 dark:text-red-300">{error}</p>}
      {active && !fullscreen && <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> Full screen requires your click. Your browser may still let you leave it.</div>}
      {active && <div className="mt-3 flex flex-wrap gap-2">
        {!fullscreen && <button type="button" onClick={() => { void document.documentElement.requestFullscreen().catch(() => setError('Full screen was blocked by your browser. Please allow it and try again.')); }} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white dark:bg-white dark:text-slate-900"><Maximize2 className="h-3.5 w-3.5" /> Enter full screen</button>}
        <button type="button" disabled={Boolean(session?.releaseRequestedAt)} onClick={() => { void apiSend<FocusSession>('/api/focus/release-request', 'POST').then(setSession).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not request release')); }} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold disabled:opacity-60 dark:border-slate-600">{session?.releaseRequestedAt ? 'Release requested' : 'Request release'}</button>
      </div>}
    </aside>
  );
}
