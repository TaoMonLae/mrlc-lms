import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Headphones, Keyboard, LockKeyhole, Mail, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MrlcQuestBrand, TaoMonLaeCredit } from '@/src/components/games/MrlcQuestBrand';
import { LanguageQuestAvatar } from '@/src/components/games/LanguageQuestAvatar';
import { useAuth } from '@/src/providers/AuthProvider';
import { LANGUAGE_QUEST_AVATARS } from '@/shared/languageQuestAvatars';
import { safeAppReturnPath } from '@/shared/accountAccess';

export default function SignupPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', avatarId: 'owl' });

  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError('Use at least 8 characters for your password.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/public-learner-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not create your account.');
      const result = await login(form.email.trim().toLowerCase(), form.password, true);
      if (!result.success) throw new Error(result.error || 'Account created. Please sign in.');
      const returnPath = safeAppReturnPath((location.state as { from?: unknown } | null)?.from);
      navigate(returnPath || '/games/language-quest', { replace: true });
    } catch (caught: any) {
      setError(caught?.message || 'Could not create your account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="lq-mesh flex min-h-screen flex-col overflow-x-hidden px-3 py-4 sm:px-6 sm:py-7">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
        <MrlcQuestBrand compact />
        <Link to="/language-quest" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-slate-600 transition hover:bg-white/70 hover:text-violet-700">
          <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back to Learning Quest</span><span className="sm:hidden">Back</span>
        </Link>
      </div>

      <div className="mx-auto my-4 grid w-full max-w-6xl flex-1 overflow-hidden rounded-[1.75rem] border border-white bg-white shadow-[0_35px_90px_-35px_rgba(76,29,149,.45)] sm:my-7 lg:grid-cols-[.92fr_1.08fr] lg:rounded-[2.25rem]">
          <section className="relative overflow-hidden bg-gradient-to-br from-violet-800 via-fuchsia-700 to-rose-500 p-6 text-white sm:p-8 lg:flex lg:flex-col lg:justify-between lg:p-12">
            <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />
            <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" />
            <div className="relative">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-white/70"><Sparkles className="h-4 w-4 text-amber-300" /> A colorful learning journey</p>
              <h1 className="mt-4 max-w-xl text-3xl font-black leading-[1.05] tracking-[-0.04em] sm:text-4xl lg:mt-8 lg:text-5xl">Your sentences get stronger one short lesson at a time.</h1>
              <p className="mt-4 max-w-lg text-sm leading-6 text-white/75 sm:text-base sm:leading-7">A learner account saves your course path, streak, points, and completed practices.</p>
            </div>

            <div className="lq-hero-scene relative mx-auto my-8 hidden h-48 w-full max-w-sm sm:block lg:my-12">
              <div className="lq-hero-card absolute inset-x-4 top-0 rounded-3xl border border-white/25 bg-white/15 p-5 shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-400 text-white shadow-lg"><Headphones className="h-5 w-5" /></span>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black">Lesson 01</span>
                </div>
                <p className="mt-5 text-sm text-white/70">Listen, remember, then write:</p>
                <p className="mt-1 text-2xl font-black">“Good morning!”</p>
              </div>
              <span className="lq-float absolute -bottom-3 -left-1 grid h-14 w-14 place-items-center rounded-2xl bg-amber-400 text-amber-950 shadow-xl"><Keyboard className="h-6 w-6" /></span>
              <span className="lq-float-delayed absolute -right-1 top-6 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-400 text-emerald-950 shadow-xl"><CheckCircle2 className="h-6 w-6" /></span>
            </div>

            <div className="relative hidden space-y-3 text-sm font-semibold lg:block">
              {['Listen before you answer', 'Practise complete sentences', 'Get clear corrections and retry', 'Keep your learning separate from private school data'].map((item) => (
                <p key={item} className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-400 text-emerald-950"><CheckCircle2 className="h-4 w-4" /></span> {item}</p>
              ))}
            </div>
          </section>

          <main className="flex flex-col justify-center p-5 sm:p-9 lg:p-12 xl:p-14">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-700 sm:text-sm">Free learner account</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl">Start your Learning Quest</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">Join learners building useful language, mathematics, and GED skills one lesson at a time. Your account opens Learning Quest only; private school areas stay separate.</p>

            <form onSubmit={submit} className="mt-7 space-y-5" noValidate>
              {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}
              <div className="grid gap-4 sm:grid-cols-2">
                <label htmlFor="learner-first-name" className="block space-y-2 text-sm font-bold text-slate-700">
                  <span>First name</span>
                  <span className="relative block">
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-violet-500" />
                    <Input id="learner-first-name" required maxLength={80} autoComplete="given-name" value={form.firstName} onChange={(event) => update('firstName', event.target.value)} className="h-13 appearance-none rounded-xl border-2 border-slate-300 bg-white pl-11 text-base text-slate-950 shadow-sm placeholder:text-slate-400 focus-visible:border-violet-600 focus-visible:ring-violet-200 dark:bg-white dark:text-slate-950" placeholder="Your first name" />
                  </span>
                </label>
                <label htmlFor="learner-last-name" className="block space-y-2 text-sm font-bold text-slate-700">
                  <span>Last name</span>
                  <span className="relative block">
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-fuchsia-500" />
                    <Input id="learner-last-name" required maxLength={80} autoComplete="family-name" value={form.lastName} onChange={(event) => update('lastName', event.target.value)} className="h-13 appearance-none rounded-xl border-2 border-slate-300 bg-white pl-11 text-base text-slate-950 shadow-sm placeholder:text-slate-400 focus-visible:border-fuchsia-600 focus-visible:ring-fuchsia-200 dark:bg-white dark:text-slate-950" placeholder="Your last name" />
                  </span>
                </label>
              </div>
              <fieldset>
                <legend className="text-sm font-bold text-slate-700">Choose a learner avatar</legend>
                <p className="mt-1 text-xs text-slate-500">Built-in characters only—profile-photo uploads are not used in Learning Quest.</p>
                <div className="mt-3 grid grid-cols-6 gap-2">
                  {LANGUAGE_QUEST_AVATARS.map((avatar) => (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => update('avatarId', avatar.id)}
                      aria-label={avatar.label}
                      aria-pressed={form.avatarId === avatar.id}
                      className={`rounded-xl p-1.5 transition hover:-translate-y-0.5 ${form.avatarId === avatar.id ? 'bg-violet-100 ring-2 ring-violet-500' : 'bg-slate-50 ring-1 ring-slate-200'}`}
                    >
                      <LanguageQuestAvatar avatarId={avatar.id} className="mx-auto h-9 w-9 rounded-xl text-lg shadow-sm" />
                    </button>
                  ))}
                </div>
              </fieldset>
              <label htmlFor="learner-email" className="block space-y-2 text-sm font-bold text-slate-700">
                <span>Email address</span>
                <span className="relative block">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-sky-600" />
                  <Input id="learner-email" required type="email" autoComplete="email" value={form.email} onChange={(event) => update('email', event.target.value)} className="h-13 appearance-none rounded-xl border-2 border-slate-300 bg-white pl-11 text-base text-slate-950 shadow-sm placeholder:text-slate-400 focus-visible:border-sky-600 focus-visible:ring-sky-200 dark:bg-white dark:text-slate-950" placeholder="you@example.com" />
                </span>
              </label>
              <label htmlFor="learner-password" className="block space-y-2 text-sm font-bold text-slate-700">
                <span>Password</span>
                <span className="relative block">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-rose-500" />
                  <Input id="learner-password" required minLength={8} maxLength={128} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={(event) => update('password', event.target.value)} className="h-13 appearance-none rounded-xl border-2 border-slate-300 bg-white px-11 text-base text-slate-950 shadow-sm placeholder:text-slate-400 focus-visible:border-rose-500 focus-visible:ring-rose-200 dark:bg-white dark:text-slate-950" placeholder="At least 8 characters" />
                  <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 hover:bg-violet-50 hover:text-violet-700" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
                <span className="flex items-center gap-1.5 text-xs font-normal text-slate-500"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Use at least 8 characters.</span>
              </label>
              <Button type="submit" disabled={submitting} className="h-13 w-full rounded-xl bg-gradient-to-r from-violet-700 via-fuchsia-600 to-rose-500 font-black text-white shadow-xl shadow-violet-600/20 transition hover:-translate-y-0.5 hover:from-violet-800 hover:via-fuchsia-700 hover:to-rose-600">
                {submitting ? 'Creating your account…' : 'Create account and start'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">Already have an account? <Link to="/login" state={location.state} className="font-bold text-violet-700 hover:underline">Sign in</Link></p>
            <p className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs leading-5 text-slate-600">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> By continuing, you agree to use the learning experience respectfully. Never share your password.
            </p>
          </main>
      </div>

      <footer className="mx-auto w-full max-w-7xl py-2">
        <TaoMonLaeCredit />
      </footer>
    </div>
  );
}
