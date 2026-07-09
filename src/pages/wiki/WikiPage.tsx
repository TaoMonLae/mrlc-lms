import React, { useEffect, useState } from 'react';
import { Library, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '../../lib/permissions';

type Status = 'checking' | 'ready' | 'unreachable';

export default function WikiPage() {
  const { user } = useUser();
  const [status, setStatus] = useState<Status>('checking');
  const [iframeKey, setIframeKey] = useState(0);

  const check = async () => {
    setStatus('checking');
    const token = sessionStorage.getItem('auth_token');
    try {
      // The iframe below can't send a Bearer header on its own requests, so
      // first get an httpOnly cookie set for the proxy path (same trick the
      // chat SSE stream uses), then confirm kiwix-serve is actually up.
      await fetch('/api/set-wiki-cookie', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const res = await fetch('/api/wiki/status', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => ({ reachable: false }));
      setStatus(data.reachable ? 'ready' : 'unreachable');
    } catch {
      setStatus('unreachable');
    }
  };

  useEffect(() => { check(); }, []);

  const retry = () => { setIframeKey((k) => k + 1); check(); };

  return (
    <div className="h-[calc(100vh-7rem)] -m-2 flex flex-col">
      <div className="flex items-center gap-3 px-1 pb-3 shrink-0">
        <Library className="h-5 w-5 text-accent-purple" />
        <div className="min-w-0 flex-1">
          <h1 className="font-semibold text-slate-900 dark:text-white">Offline Wiki</h1>
          <p className="text-xs text-slate-500">Browse an offline encyclopedia — works with no internet connection.</p>
        </div>
        {status === 'unreachable' && (
          <Button variant="outline" size="sm" onClick={retry}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-0 rounded-lg border border-slate-200 dark:border-surface-raised overflow-hidden bg-white dark:bg-surface-indigo">
        {status === 'checking' ? (
          <div className="h-full flex items-center justify-center text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Connecting to the offline wiki…
          </div>
        ) : status === 'unreachable' ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <AlertTriangle className="h-8 w-8 text-amber-500 mb-3" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">The offline wiki isn't available right now.</p>
            {user?.role === 'ADMIN' ? (
              <div className="mt-3 max-w-md text-left text-xs text-slate-500 bg-slate-50 dark:bg-surface-raised/50 rounded-lg p-4 space-y-2">
                <p className="font-medium text-slate-600 dark:text-slate-300">Setup (one-time, on the server):</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Install <code>kiwix-tools</code> and download a ZIM file from <span className="whitespace-nowrap">library.kiwix.org</span></li>
                  <li>
                    Run: <code className="block mt-0.5 bg-slate-100 dark:bg-surface-raised rounded px-1.5 py-1">kiwix-serve --port=8080 --urlRootLocation=kiwix-proxy your-file.zim</code>
                  </li>
                  <li>Set <code>KIWIX_URL</code> in <code>.env</code> to that server's address (default <code>http://127.0.0.1:8080</code>), then restart the app</li>
                </ol>
                <p className="text-slate-400">See the README's "Kiwix / Offline Wiki" section for details.</p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-1">Please check back later, or let an administrator know.</p>
            )}
          </div>
        ) : (
          <iframe
            key={iframeKey}
            src="/kiwix-proxy/"
            title="Offline Wiki"
            className="w-full h-full border-0"
          />
        )}
      </div>
    </div>
  );
}
