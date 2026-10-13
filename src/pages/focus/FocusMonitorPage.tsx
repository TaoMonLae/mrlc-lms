import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Clock3, Maximize2, ShieldCheck } from 'lucide-react';
import { apiGet, apiSend } from '../../lib/api';

type FocusRow = {
  id: string;
  studentName: string;
  className: string;
  startedAt: string;
  endsAt: string;
  lastHeartbeatAt: string | null;
  isFocused: boolean;
  isFullscreen: boolean;
  presentationMode: 'KIOSK' | 'FULLSCREEN' | 'WEB_APP' | 'BROWSER';
  releaseRequestedAt: string | null;
  events: { id: string; type: string; createdAt: string }[];
};

function label(type: string) {
  return ({ LMS_LOST_FOCUS: 'LMS lost focus', FOCUS_RETURNED: 'Returned to LMS', FULLSCREEN_EXITED: 'Exited full screen', FULLSCREEN_ENTERED: 'Entered full screen', RELEASE_REQUESTED: 'Asked for release', RELEASE_DENIED: 'Release request declined', TIME_CHANGED: 'Time changed', RELEASE_APPROVED: 'Released by staff' } as Record<string, string>)[type] || type;
}

export default function FocusMonitorPage() {
  const [rows, setRows] = useState<FocusRow[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const load = useCallback(async () => {
    try { setRows(await apiGet<FocusRow[]>('/api/focus/monitor')); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load focus sessions'); }
  }, []);

  useEffect(() => {
    void load();
    const poll = window.setInterval(() => { setNow(Date.now()); void load(); }, 10_000);
    return () => window.clearInterval(poll);
  }, [load]);

  const update = async (id: string, action: 'extend' | 'reduce' | 'release' | 'deny', endsAt?: string) => {
    setBusy(id);
    try {
      if (action === 'release' || action === 'deny') await apiSend(`/api/focus/sessions/${id}/${action}`, 'POST');
      else {
        const current = Math.max(0, Math.ceil((new Date(endsAt!).getTime() - Date.now()) / 60_000));
        const minutesRemaining = action === 'extend' ? Math.min(480, current + 15) : Math.max(0, current - 15);
        await apiSend(`/api/focus/sessions/${id}/time`, 'PATCH', { minutesRemaining });
      }
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not update session'); }
    finally { setBusy(null); }
  };

  const warnings = rows.filter((row) => row.releaseRequestedAt || !row.isFocused || row.presentationMode === 'BROWSER' || !row.lastHeartbeatAt || now - new Date(row.lastHeartbeatAt).getTime() > 45_000).length;
  return <div className="mx-auto max-w-6xl space-y-6 pb-10">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-aubergine-700 dark:text-aubergine-300">Supervised learning</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Focus monitor</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Track school students during their assigned LMS time. Focus alerts mean the LMS page lost focus; browsers cannot tell which tab or app was opened. App view labels are reported by the student device and do not prove a device lock.</p></div>
      <div className="flex gap-3 text-sm"><span className="rounded-lg border bg-card px-4 py-2 font-semibold">{rows.length} active</span><span className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-100">{warnings} need attention</span></div>
    </header>
    {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-100">{error}</p>}
    {rows.length === 0 ? <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">No active student focus sessions in your classes.</div> :
      <div className="grid gap-4 md:grid-cols-2">{rows.map((row) => {
        const stale = !row.lastHeartbeatAt || now - new Date(row.lastHeartbeatAt).getTime() > 45_000;
        const minutes = Math.max(0, Math.ceil((new Date(row.endsAt).getTime() - now) / 60_000));
        const alert = stale || !row.isFocused || row.presentationMode === 'BROWSER' || Boolean(row.releaseRequestedAt);
        return <article key={row.id} className={`rounded-xl border bg-card p-5 shadow-sm ${alert ? 'border-amber-300 dark:border-amber-700' : 'border-border'}`}>
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">{row.studentName}</h2><p className="text-xs text-muted-foreground">{row.className} · Started {new Date(row.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div><span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-bold"><Clock3 className="h-3 w-3" /> {minutes} min left</span></div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            {stale ? <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-red-800"><AlertTriangle className="h-3 w-3" /> Connection missing</span> : row.isFocused ? <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-800">LMS focused</span> : <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-900">LMS lost focus</span>}
            <span className={`flex items-center gap-1 rounded-full px-2 py-1 ${row.presentationMode === 'BROWSER' ? 'bg-amber-100 text-amber-900' : row.presentationMode === 'WEB_APP' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}><Maximize2 className="h-3 w-3" /> {{ KIOSK: 'Kiosk window', FULLSCREEN: 'Browser full screen', WEB_APP: 'Installed web app', BROWSER: 'Browser view' }[row.presentationMode]}</span>
            {row.releaseRequestedAt && <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-800">Release requested</span>}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{row.lastHeartbeatAt ? `Last contact ${new Date(row.lastHeartbeatAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'No contact yet'} · Ends {new Date(row.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          {row.events.length > 0 && <div className="mt-4 border-t pt-3"><p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Recent activity</p><ul className="mt-2 space-y-1 text-xs">{row.events.map((event) => <li key={event.id} className="flex justify-between gap-2"><span>{label(event.type)}</span><time className="text-muted-foreground">{new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></li>)}</ul></div>}
          <div className="mt-4 flex flex-wrap gap-2 border-t pt-4"><button disabled={busy === row.id} onClick={() => void update(row.id, 'extend', row.endsAt)} className="rounded-lg border px-3 py-2 text-xs font-bold hover:bg-muted disabled:opacity-50">+15 min</button><button disabled={busy === row.id} onClick={() => void update(row.id, 'reduce', row.endsAt)} className="rounded-lg border px-3 py-2 text-xs font-bold hover:bg-muted disabled:opacity-50">−15 min</button>{row.releaseRequestedAt && <button disabled={busy === row.id} onClick={() => void update(row.id, 'deny')} className="rounded-lg border px-3 py-2 text-xs font-bold hover:bg-muted disabled:opacity-50">Decline request</button>}<button disabled={busy === row.id} onClick={() => void update(row.id, 'release')} className="ml-auto inline-flex items-center gap-1 rounded-lg bg-aubergine-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50 dark:bg-aubergine-500"><ShieldCheck className="h-3.5 w-3.5" /> Approve release</button></div>
        </article>;
      })}</div>}
  </div>;
}
