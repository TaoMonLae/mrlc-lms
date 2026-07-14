import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true); setError('');
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not request a password reset');
      setSent(true);
    } catch (requestError: any) {
      setError(requestError.message || 'Could not request a password reset');
    } finally { setSubmitting(false); }
  };

  return <main className="min-h-screen bg-slate-100 px-4 py-10 flex items-center justify-center">
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><Mail aria-hidden="true" /></div>
      <h1 className="text-2xl font-bold text-slate-900">Reset your password</h1>
      <p className="mt-2 text-sm text-slate-600">Enter your email address or username. If it matches an active account, we’ll email a link that expires in 30 minutes.</p>
      {sent ? <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4" role="status">
        <p className="flex items-center gap-2 font-semibold text-emerald-800"><ShieldCheck className="h-5 w-5" aria-hidden="true" />Check your email</p>
        <p className="mt-1 text-sm text-emerald-800">If the account exists, a reset link has been sent. Check spam or junk folders too.</p>
      </div> : <form onSubmit={submit} className="mt-6 space-y-4">
        {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        <div className="space-y-2"><Label htmlFor="reset-identifier">Email or username</Label><Input id="reset-identifier" value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" required /></div>
        <Button type="submit" className="w-full" disabled={submitting}>{submitting ? 'Sending…' : 'Send reset link'}</Button>
      </form>}
      <Link to="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to sign in</Link>
    </div>
  </main>;
}
