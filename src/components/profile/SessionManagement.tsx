import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Laptop, Loader2, LogOut, ShieldCheck, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { apiGet, apiSend } from '@/src/lib/api';
import { useAuth } from '@/src/providers/AuthProvider';

type Session = {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  lastSeenAt: string;
  expiresAt: string;
  createdAt: string;
  current: boolean;
};

function deviceName(userAgent: string | null) {
  if (!userAgent) return 'Unknown device';
  const browser = /Edg\//.test(userAgent) ? 'Edge'
    : /Firefox\//.test(userAgent) ? 'Firefox'
      : /Chrome\//.test(userAgent) ? 'Chrome'
        : /Safari\//.test(userAgent) ? 'Safari'
          : 'Browser';
  const platform = /iPhone|iPad/.test(userAgent) ? 'iOS'
    : /Android/.test(userAgent) ? 'Android'
      : /Mac OS/.test(userAgent) ? 'macOS'
        : /Windows/.test(userAgent) ? 'Windows'
          : /Linux/.test(userAgent) ? 'Linux'
            : 'device';
  return `${browser} on ${platform}`;
}

export function SessionManagement() {
  const { logout } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      setSessions(await apiGet<Session[]>('/api/auth/sessions'));
    } catch (error: any) {
      toast.error(error.message || 'Could not load signed-in devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const revoke = async (session: Session) => {
    setBusyId(session.id);
    try {
      await apiSend(`/api/auth/sessions/${session.id}`, 'DELETE');
      if (session.current) {
        logout();
        return;
      }
      setSessions((items) => items.filter((item) => item.id !== session.id));
      toast.success('Device signed out');
    } catch (error: any) {
      toast.error(error.message || 'Could not sign out device');
    } finally {
      setBusyId(null);
    }
  };

  const revokeOthers = async () => {
    setBusyId('others');
    try {
      await apiSend('/api/auth/sessions/revoke-others', 'POST');
      setSessions((items) => items.filter((item) => item.current));
      toast.success('Other devices signed out');
    } catch (error: any) {
      toast.error(error.message || 'Could not sign out other devices');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm space-y-4" aria-labelledby="signed-in-devices-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="signed-in-devices-title" className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Signed-in devices
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">Review active sessions and sign out devices you do not recognize.</p>
        </div>
        {sessions.some((session) => !session.current) && (
          <Button variant="outline" size="sm" onClick={revokeOthers} disabled={busyId !== null}>
            {busyId === 'others' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />}
            Sign out other devices
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading devices…
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-slate-500">No managed sessions found. Your current session may predate this security update.</p>
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-surface-raised">
          {sessions.map((session) => {
            const mobile = /iPhone|iPad|Android/.test(session.userAgent || '');
            const DeviceIcon = mobile ? Smartphone : Laptop;
            return (
              <li key={session.id} className="py-3 flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-100 dark:bg-surface-raised flex items-center justify-center">
                  <DeviceIcon className="h-5 w-5 text-slate-600 dark:text-slate-300" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm text-slate-900 dark:text-white">
                    {deviceName(session.userAgent)} {session.current && <span className="ml-1 text-xs text-emerald-700 dark:text-emerald-400">Current device</span>}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Active {formatDistanceToNow(new Date(session.lastSeenAt), { addSuffix: true })}
                    {session.ipAddress ? ` · ${session.ipAddress}` : ''}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => void revoke(session)}
                  disabled={busyId !== null}
                  aria-label={`Sign out ${deviceName(session.userAgent)}${session.current ? ', current device' : ''}`}
                >
                  {busyId === session.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : 'Sign out'}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
