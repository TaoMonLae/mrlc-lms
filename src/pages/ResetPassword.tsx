import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (!token) { setError('This password reset link is incomplete.'); return; }
    if (password.length < 8) { setError('Password must contain at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Password reset failed');
      setComplete(true);
    } catch (requestError: any) {
      setError(requestError.message || 'Password reset failed');
    } finally { setSubmitting(false); }
  };

  return <main className="min-h-screen bg-slate-100 px-4 py-10 flex items-center justify-center">
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><KeyRound aria-hidden="true" /></div>
      <h1 className="text-2xl font-bold text-slate-900">Choose a new password</h1>
      {complete ? <div className="mt-6 space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4" role="status"><p className="flex items-center gap-2 font-semibold text-emerald-800"><CheckCircle2 className="h-5 w-5" aria-hidden="true" />Password updated</p><p className="mt-1 text-sm text-emerald-800">All previous sessions were signed out for your protection.</p></div>
        <Button className="w-full" render={<Link to="/login" />}>Continue to sign in</Button>
      </div> : <form onSubmit={submit} className="mt-6 space-y-4">
        <p className="text-sm text-slate-600">Use at least 8 characters and avoid reusing a password from another service.</p>
        {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        <div className="space-y-2"><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required /></div>
        <div className="space-y-2"><Label htmlFor="confirm-password">Confirm new password</Label><Input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required /></div>
        <Button type="submit" className="w-full" disabled={submitting || !token}>{submitting ? 'Updating…' : 'Update password'}</Button>
      </form>}
    </div>
  </main>;
}
