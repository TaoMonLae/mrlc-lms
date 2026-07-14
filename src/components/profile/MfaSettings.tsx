import { useEffect, useState } from 'react';
import { CheckCircle2, Copy, Download, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiGet, apiSend } from '@/src/lib/api';
import { useAuth } from '@/src/providers/AuthProvider';

type Status = { enabled: boolean; enrolledAt: string | null; recoveryCodesRemaining: number; recommendedForRole: boolean };
type Setup = { manualKey: string; otpAuthUrl: string; qrCodeDataUrl: string };

export function MfaSettings() {
  const { updateUser } = useAuth();
  const [status, setStatus] = useState<Status | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState('');

  const load = async () => setStatus(await apiGet<Status>('/api/auth/mfa'));
  useEffect(() => { void load().catch(() => toast.error('Could not load MFA status')); }, []);

  const beginSetup = async () => {
    if (!password) { toast.error('Enter your current password'); return; }
    setBusy('setup');
    try {
      setSetup(await apiSend<Setup>('/api/auth/mfa/setup', 'POST', { password }));
      setCode('');
    } catch (error: any) { toast.error(error.message || 'Could not begin MFA setup'); }
    finally { setBusy(''); }
  };

  const enable = async () => {
    setBusy('enable');
    try {
      const response = await apiSend<{ recoveryCodes: string[] }>('/api/auth/mfa/enable', 'POST', { code });
      setRecoveryCodes(response.recoveryCodes); setSetup(null); setPassword(''); setCode('');
      updateUser({ mfaEnabled: true, mfaRecommended: false }); await load();
      toast.success('Multi-factor authentication enabled');
    } catch (error: any) { toast.error(error.message || 'Could not enable MFA'); }
    finally { setBusy(''); }
  };

  const disable = async () => {
    if (!confirm('Disable multi-factor authentication for this account?')) return;
    setBusy('disable');
    try {
      await apiSend('/api/auth/mfa/disable', 'POST', { password, code });
      setPassword(''); setCode(''); setRecoveryCodes([]); updateUser({ mfaEnabled: false }); await load();
      toast.success('Multi-factor authentication disabled');
    } catch (error: any) { toast.error(error.message || 'Could not disable MFA'); }
    finally { setBusy(''); }
  };

  const regenerate = async () => {
    setBusy('recovery');
    try {
      const response = await apiSend<{ recoveryCodes: string[] }>('/api/auth/mfa/recovery-codes', 'POST', { password, code });
      setRecoveryCodes(response.recoveryCodes); setPassword(''); setCode(''); await load();
      toast.success('New recovery codes created; previous codes no longer work');
    } catch (error: any) { toast.error(error.message || 'Could not regenerate recovery codes'); }
    finally { setBusy(''); }
  };

  const copyCodes = async () => {
    await navigator.clipboard.writeText(recoveryCodes.join('\n'));
    toast.success('Recovery codes copied');
  };
  const downloadCodes = () => {
    const url = URL.createObjectURL(new Blob([`MRLC LMS recovery codes\nGenerated ${new Date().toLocaleString()}\n\n${recoveryCodes.join('\n')}\n`], { type: 'text/plain' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'mrlc-recovery-codes.txt'; anchor.click(); URL.revokeObjectURL(url);
  };

  return <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 dark:border-surface-raised dark:bg-surface-indigo" aria-labelledby="mfa-settings-title">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="mfa-settings-title" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-900 dark:text-white"><ShieldCheck className="h-4 w-4" aria-hidden="true" />Multi-factor authentication</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Protect sign-in with a 6-digit code from any TOTP authenticator app.</p></div>
      {status?.enabled ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" />Enabled</span> : status?.recommendedForRole ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">Recommended for your role</span> : null}
    </div>

    {!status ? <p className="flex items-center gap-2 text-sm text-slate-600" role="status"><Loader2 className="h-4 w-4 animate-spin" />Loading security status…</p> : !status.enabled ? <>
      {!setup ? <div className="max-w-sm space-y-3"><div className="space-y-2"><Label htmlFor="mfa-password">Current password</Label><Input id="mfa-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></div><Button onClick={beginSetup} disabled={busy !== ''}>{busy === 'setup' ? 'Preparing…' : 'Set up authenticator'}</Button></div> : <div className="grid gap-5 md:grid-cols-[240px_1fr]">
        <img src={setup.qrCodeDataUrl} alt="QR code for adding MRLC LMS to an authenticator app" className="h-60 w-60 rounded-lg border bg-white p-2" />
        <div className="space-y-3"><div><p className="font-semibold text-slate-900 dark:text-white">1. Scan the QR code</p><p className="text-sm text-slate-600 dark:text-slate-300">If scanning is unavailable, enter this key manually:</p><code className="mt-1 block break-all rounded bg-slate-100 p-2 text-sm dark:bg-surface-raised">{setup.manualKey}</code></div><div className="space-y-2"><Label htmlFor="mfa-enable-code">2. Enter the current 6-digit code</Label><Input id="mfa-enable-code" value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} /></div><div className="flex gap-2"><Button onClick={enable} disabled={busy !== '' || code.length !== 6}>{busy === 'enable' ? 'Verifying…' : 'Verify and enable'}</Button><Button variant="ghost" onClick={() => { setSetup(null); setCode(''); }}>Cancel</Button></div></div>
      </div>}
    </> : <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">Enabled {status.enrolledAt ? new Date(status.enrolledAt).toLocaleDateString() : ''} · {status.recoveryCodesRemaining} recovery codes remaining.</p>
      <div className="grid max-w-xl gap-3 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="mfa-manage-password">Current password</Label><Input id="mfa-manage-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></div><div className="space-y-2"><Label htmlFor="mfa-manage-code">Authentication or recovery code</Label><Input id="mfa-manage-code" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" /></div></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={regenerate} disabled={busy !== '' || !password || code.length < 6}><KeyRound className="mr-2 h-4 w-4" />{busy === 'recovery' ? 'Generating…' : 'Generate new recovery codes'}</Button><Button variant="ghost" className="text-destructive hover:text-destructive" onClick={disable} disabled={busy !== '' || !password || code.length < 6}>{busy === 'disable' ? 'Disabling…' : 'Disable MFA'}</Button></div>
    </div>}

    {recoveryCodes.length > 0 && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950" role="status"><p className="font-semibold">Save these one-time recovery codes now</p><p className="mt-1 text-sm">They will not be shown again. Each code works once if your authenticator is unavailable.</p><div className="mt-3 grid grid-cols-1 gap-1 font-mono text-sm sm:grid-cols-2">{recoveryCodes.map((recoveryCode) => <code key={recoveryCode}>{recoveryCode}</code>)}</div><div className="mt-3 flex gap-2"><Button variant="outline" size="sm" onClick={copyCodes}><Copy className="mr-2 h-4 w-4" />Copy</Button><Button variant="outline" size="sm" onClick={downloadCodes}><Download className="mr-2 h-4 w-4" />Download</Button></div></div>}
  </section>;
}
