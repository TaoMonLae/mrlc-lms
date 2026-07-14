import React, { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type HealthStatus = 'ok' | 'warning' | 'error';

interface HealthCheck {
  id: string;
  label: string;
  status: HealthStatus;
  detail: string;
  required: boolean;
}

interface HealthResponse {
  status: HealthStatus;
  checkedAt: string;
  checks: HealthCheck[];
  backups: {
    total: number;
    newestDatabase: string | null;
    offsiteConfigured: boolean;
  };
}

const statusStyle: Record<HealthStatus, string> = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/10 dark:text-emerald-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/10 dark:text-amber-300',
  error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-900/10 dark:text-red-300',
};

function StatusIcon({ status }: { status: HealthStatus }) {
  if (status === 'ok') return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
  if (status === 'warning') return <AlertTriangle className="h-5 w-5 text-amber-500" />;
  return <XCircle className="h-5 w-5 text-red-500" />;
}

export default function SystemHealth() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadHealth = useCallback(async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const response = await fetch('/api/system/health', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok && !data.checks) throw new Error(data.error || 'Health check failed');
      setHealth(data);
    } catch (error: any) {
      toast.error(error.message || 'Could not load system health');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadHealth(); }, [loadHealth]);

  const statusLabel = health?.status === 'ok'
    ? 'All required systems operational'
    : health?.status === 'warning'
      ? 'Operational with optional features unavailable'
      : 'Required system check failed';

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="h-5 w-5" /> System Health
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">Live checks for the database, storage, backup utilities, media tools, and comic support.</p>
        </div>
        <Button variant="outline" onClick={() => void loadHealth()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {health && (
        <div className={`rounded-xl border p-4 flex items-start gap-3 ${statusStyle[health.status]}`}>
          <StatusIcon status={health.status} />
          <div>
            <p className="font-semibold">{statusLabel}</p>
            <p className="text-xs opacity-80 mt-1 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Checked {new Date(health.checkedAt).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-slate-200 dark:border-surface-raised p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Checks passed</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{health?.checks.filter((check) => check.status === 'ok').length ?? '—'}</p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-surface-raised p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Backup artifacts</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{health?.backups.total ?? '—'}</p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-surface-raised p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Off-site copy</p>
          <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{health?.backups.offsiteConfigured ? 'Configured' : 'Not configured'}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-surface-raised divide-y divide-slate-100 dark:divide-surface-raised overflow-hidden">
        {loading && !health && <div className="p-8 text-center text-sm text-slate-500">Running system checks…</div>}
        {health?.checks.map((check) => (
          <div key={check.id} className="p-4 flex items-start gap-3 bg-white dark:bg-surface-indigo">
            <StatusIcon status={check.status} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-slate-900 dark:text-white">{check.label}</p>
                {!check.required && <span className="text-[10px] uppercase tracking-wide text-slate-400">Optional</span>}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 break-all">{check.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
