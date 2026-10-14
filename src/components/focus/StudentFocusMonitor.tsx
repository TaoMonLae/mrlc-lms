import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Maximize2, ShieldAlert, Timer } from 'lucide-react';
import { useLocation } from 'react-router';
import { useAuth } from '../../providers/AuthProvider';
import { apiSend } from '../../lib/api';
import { canRequestFocusFullscreen, getFocusPresentationMode } from '../../lib/focusPresentation';

type FocusSession = {
  id: string;
  endsAt: string;
  status: 'ACTIVE' | 'RELEASED' | 'COMPLETED';
  releaseRequestedAt: string | null;
};

export function StudentFocusMonitor() {
  const { pathname } = useLocation();
  const { user, isSessionVerified } = useAuth();
  const eligible = user?.role === 'STUDENT' && !user.isExternalLearner && !user.mustChangePassword && isSessionVerified;
  const [session, setSession] = useState<FocusSession | null>(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [presentationMode, setPresentationMode] = useState(getFocusPresentationMode);
  const sending = useRef(false);
  const sessionRef = useRef<FocusSession | null>(null);
  sessionRef.current = session;

  const report = useCallback(async () => {
    if (!sessionRef.current || sessionRef.current.status !== 'ACTIVE' || sending.current) return;
    sending.current = true;
    try {
      const mode = getFocusPresentationMode();
      const next = await apiSend<FocusSession>('/api/focus/heartbeat', 'POST', {
        focused: document.visibilityState === 'visible' && document.hasFocus(),
        fullscreen: mode === 'KIOSK' || mode === 'FULLSCREEN',
        presentationMode: mode,
      }, { keepalive: true });
      setSession(next);
      setError('');
    } catch {
      setError('Focus status could not reach the school server. Reconnect to continue tracking.');
    } finally {
      sending.current = false;
    }
  }, []);

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
    const onChange = () => { setPresentationMode(getFocusPresentationMode()); void report(); };
    document.addEventListener('visibilitychange', onChange);
    document.addEventListener('fullscreenchange', onChange);
    window.addEventListener('focus', onChange);
    window.addEventListener('blur', onChange);
    window.addEventListener('mrlc-kiosk-statechange', onChange);
    const interval = window.setInterval(() => { setNow(Date.now()); void report(); }, 15_000);
    void report();
    return () => {
      document.removeEventListener('visibilitychange', onChange);
      document.removeEventListener('fullscreenchange', onChange);
      window.removeEventListener('focus', onChange);
      window.removeEventListener('blur', onChange);
      window.removeEventListener('mrlc-kiosk-statechange', onChange);
      window.clearInterval(interval);
    };
  }, [eligible, session?.id, session?.status, report]);

  if (pathname === '/focus-app' || !eligible || (!session && !error)) return null;
  const active = session?.status === 'ACTIVE' && new Date(session.endsAt).getTime() > now;
  const minutes = session ? Math.max(0, Math.ceil((new Date(session.endsAt).getTime() - now) / 60_000)) : 0;
  const canFullscreen = canRequestFocusFullscreen();
  if (!active && !error) return null;

  return (
    <aside aria-label="Focus session" className={`fixed z-[100] max-w-[calc(100vw-1.5rem)] rounded-xl border bg-white text-slate-900 shadow-lg dark:bg-slate-900 dark:text-white ${error ? 'border-red-400 dark:border-red-700' : 'border-amber-300 dark:border-amber-700'} ${expanded ? 'w-[min(360px,calc(100vw-1.5rem))]' : 'w-auto'}`} style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)', right: 'calc(env(safe-area-inset-right, 0px) + 12px)' }}>
      <button type="button" aria-expanded={expanded} aria-controls="student-focus-details" onClick={() => setExpanded((value) => !value)} className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600">
        {error ? <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" /> : <Timer className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />}
        <span className="min-w-0 flex-1 truncate">{error ? 'Focus connection issue' : session?.releaseRequestedAt ? `Release requested · ${minutes} min left` : `Focus · ${minutes} min left`}</span>
        {expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" /> : <ChevronUp className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />}
      </button>
      {error && !expanded && <span role="alert" className="sr-only">{error}</span>}
      <div id="student-focus-details" hidden={!expanded} className="max-h-[min(65vh,420px)] overflow-y-auto border-t border-slate-200 px-3 pb-3 pt-2 dark:border-slate-700">
        {active && <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">Stay in the LMS during your assigned time. Your teacher can see when this app loses focus or full screen closes.</p>}
        {error && <p role="alert" className="mt-2 text-xs text-red-700 dark:text-red-300">{error}</p>}
        {active && presentationMode === 'BROWSER' && <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {canFullscreen ? 'Tap Enter full screen to reduce distractions.' : 'For a cleaner view, use your browser menu to add or install the LMS on your home screen.'} You can still switch apps or tabs on a personal device.</div>}
        {active && presentationMode === 'WEB_APP' && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">App view active. You can still switch apps on a personal device; your LMS focus is reported.</p>}
        {active && <div className="mt-3 flex flex-wrap gap-2">
          {presentationMode === 'BROWSER' && canFullscreen && <button type="button" onClick={() => { void document.documentElement.requestFullscreen().catch(() => setError('Full screen was blocked by your browser. Please allow it and try again.')); }} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white dark:bg-white dark:text-slate-900"><Maximize2 className="h-3.5 w-3.5" aria-hidden="true" /> Enter full screen</button>}
          <button type="button" disabled={Boolean(session?.releaseRequestedAt)} onClick={() => { void apiSend<FocusSession>('/api/focus/release-request', 'POST').then(setSession).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not request release')); }} className="min-h-10 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold disabled:opacity-60 dark:border-slate-600">{session?.releaseRequestedAt ? 'Release requested' : 'Request release'}</button>
        </div>}
      </div>
    </aside>
  );
}
