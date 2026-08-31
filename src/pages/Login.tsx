import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, LoaderCircle, School, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { LanguageQuestAuthShell } from '@/src/components/games/LanguageQuestAuthShell';
import { safeAppReturnPath } from '@/shared/accountAccess';
import { useAuth } from '../providers/AuthProvider';

const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Enter your email or username.'),
  password: z.string().min(1, 'Enter your password.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type LoginRouteState = { from?: unknown; accountCreated?: boolean; identifier?: unknown };

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { login } = useAuth();
  const routeState = (location.state && typeof location.state === 'object' ? location.state : null) as LoginRouteState | null;
  const presetIdentifier = typeof routeState?.identifier === 'string' ? routeState.identifier : '';
  const [serverError, setServerError] = useState<string | null>(null);
  const [showAccountCreated, setShowAccountCreated] = useState(Boolean(routeState?.accountCreated));
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState('Mon Refugee Learning Centre');
  const [contactEmail, setContactEmail] = useState<string | null>(null);
  const [contactPhone, setContactPhone] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  // Shared classroom devices are common, so persistent sessions are opt-in.
  const [rememberMe, setRememberMe] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');

  useEffect(() => {
    fetch(`/api/public/branding?t=${Date.now()}`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.logoUrl) setLogoUrl(data.logoUrl);
        if (data?.name) setSchoolName(data.name);
        if (data?.contactEmail) setContactEmail(data.contactEmail);
        if (data?.contactPhone) setContactPhone(data.contactPhone);
      })
      .catch(() => undefined);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: presetIdentifier, password: '' },
  });

  const clearFeedback = () => {
    setServerError(null);
    setShowAccountCreated(false);
  };

  const onSubmit = async (data: LoginFormValues) => {
    clearFeedback();

    if (mfaRequired && mfaCode.trim().length < 6) {
      setServerError('Enter the 6-digit authentication code or an unused recovery code.');
      return;
    }

    const result = await login(data.identifier, data.password, rememberMe, mfaCode.trim() || undefined);

    if (result.mfaRequired && !result.error) {
      setMfaRequired(true);
      requestAnimationFrame(() => document.getElementById('mfa-code')?.focus());
      return;
    }

    if (!result.success) {
      if (result.mfaRequired) setMfaRequired(true);
      setServerError(result.error ?? 'We could not sign you in. Check your details and try again.');
      return;
    }

    const returnPath = safeAppReturnPath(routeState?.from);
    let destination = returnPath || '/dashboard';

    try {
      const stored = JSON.parse(sessionStorage.getItem('auth_user') || '{}');
      if (!returnPath && stored.isExternalLearner) destination = '/games/language-quest';
      else if (!returnPath && stored.role === 'LIBRARIAN') destination = '/books';
    } catch {
      // Keep the safe default destination.
    }

    navigate(destination, { replace: true });
  };

  const support = contactEmail ? (
    <a href={`mailto:${contactEmail}`} className="font-bold text-[var(--lq-signal-blue)] underline-offset-4 hover:underline">Contact support</a>
  ) : contactPhone ? (
    <a href={`tel:${contactPhone}`} className="font-bold text-[var(--lq-signal-blue)] underline-offset-4 hover:underline">Call support</a>
  ) : (
    <Link to="/forgot-password" className="font-bold text-[var(--lq-signal-blue)] underline-offset-4 hover:underline">Account help</Link>
  );

  const footer = (
    <div className="flex flex-col gap-4 border-t border-[var(--lq-steel-border)] pt-5 text-xs leading-5 text-[var(--lq-slate-caption)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {logoUrl ? (
          <img src={logoUrl} alt="" width="36" height="36" className="h-9 w-9 shrink-0 rounded-full border border-[var(--lq-steel-border)] bg-white object-contain p-1" onError={() => setLogoUrl(null)} />
        ) : (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eaf2ff] text-[var(--lq-signal-blue)]"><School className="h-4 w-4" aria-hidden="true" /></span>
        )}
        <span className="min-w-0"><strong className="block truncate text-[var(--lq-charcoal)]">{schoolName}</strong>School and learner access</span>
      </div>
      <p className="shrink-0">{support}</p>
    </div>
  );

  return (
    <LanguageQuestAuthShell mode="login" footer={footer}>
      <div className="mb-7">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--lq-signal-blue)]">{mfaRequired ? 'One more step' : 'Welcome back'}</p>
        <h1 className="mt-3 text-balance text-4xl font-black leading-[1.02] tracking-[-0.045em] text-[var(--lq-charcoal)] sm:text-5xl">
          {mfaRequired ? 'Check your authenticator.' : 'Sign in and keep going.'}
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-[var(--lq-slate-caption)] sm:text-base">
          {mfaRequired ? 'Enter the current code from your authenticator app, or use one unused recovery code.' : 'Learning Quest learners and MRLC school members use the same secure sign-in.'}
        </p>
      </div>

      <form id="login-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate aria-busy={isSubmitting}>
        <AnimatePresence initial={false}>
          {showAccountCreated && (
            <motion.div initial={reduceMotion ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -8 }} className="flex items-start gap-3 border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-5 text-emerald-800" role="status">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              Your account is ready. Sign in to begin your quest.
            </motion.div>
          )}
          {serverError && (
            <motion.div initial={reduceMotion ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -8 }} className="flex items-start gap-3 border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm font-semibold leading-5 text-red-700" role="alert" aria-live="polite">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{serverError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-2">
          <label htmlFor="identifier" className="block text-sm font-bold text-[var(--lq-charcoal)]">Email or username</label>
          <Input id="identifier" type="text" autoComplete="username" spellCheck={false} placeholder="Email or school username" aria-invalid={Boolean(errors.identifier)} aria-describedby={errors.identifier ? 'identifier-error' : undefined} className="lq-auth-input" {...register('identifier', { onChange: clearFeedback })} />
          {errors.identifier && <p id="identifier-error" className="text-xs font-semibold text-red-600" role="alert">{errors.identifier.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="password" className="block text-sm font-bold text-[var(--lq-charcoal)]">Password</label>
            <Link to="/forgot-password" className="text-sm font-bold text-[var(--lq-signal-blue)] underline-offset-4 hover:underline">Forgot password?</Link>
          </div>
          <div className="relative">
            <Input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : undefined} className="lq-auth-input pr-12" {...register('password', { onChange: clearFeedback })} />
            <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-0 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center text-[var(--lq-slate-caption)] transition hover:text-[var(--lq-signal-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--lq-signal-blue)]">
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
          {errors.password && <p id="password-error" className="text-xs font-semibold text-red-600" role="alert">{errors.password.message}</p>}
        </div>

        <AnimatePresence initial={false}>
          {mfaRequired && (
            <motion.div initial={reduceMotion ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={reduceMotion ? undefined : { opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="space-y-2 border-l-4 border-[var(--lq-signal-blue)] bg-[#eef5ff] px-4 py-4">
                <label htmlFor="mfa-code" className="block text-sm font-bold text-[var(--lq-charcoal)]">Authentication code</label>
                <Input id="mfa-code" value={mfaCode} onChange={(event) => { setMfaCode(event.target.value); setServerError(null); }} placeholder="6-digit or recovery code" autoComplete="one-time-code" autoCapitalize="none" spellCheck={false} inputMode="text" className="lq-auth-input bg-white font-mono tracking-[0.08em]" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-[var(--lq-charcoal)]">
            <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-5 w-5 rounded border-[var(--lq-steel-border)] accent-[var(--lq-signal-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lq-signal-blue)] focus-visible:ring-offset-2" />
            Keep me signed in on this device
          </label>
          <p className="mt-1 pl-8 text-xs leading-5 text-[var(--lq-slate-caption)]">Leave this off on a shared school or library computer.</p>
        </div>

        <button type="submit" id="login-submit-btn" disabled={isSubmitting} className="lq-btn-primary lq-auth-action h-13 w-full text-base">
          {isSubmitting ? <><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Signing in…</> : mfaRequired ? 'Verify and sign in' : 'Sign in and continue'}
        </button>

        <div className="border-t border-[var(--lq-steel-border)] pt-5">
          <p className="text-sm text-[var(--lq-slate-caption)]">New to Learning Quest?{' '}<Link to="/signup" state={location.state} className="font-black text-[var(--lq-signal-blue)] underline-offset-4 hover:underline">Create a free learner account</Link></p>
          <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-[var(--lq-slate-caption)]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--lq-signal-blue)]" aria-hidden="true" />Your school and learner account areas remain separate after sign-in.</p>
        </div>
      </form>
    </LanguageQuestAuthShell>
  );
}
