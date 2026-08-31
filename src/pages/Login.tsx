import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';
import * as z from 'zod';
import Auth1 from '@/components/blocks/auth-1';
import { Input } from '@/components/ui/input';
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
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [heroReady, setHeroReady] = useState(false);
  const [schoolName, setSchoolName] = useState('Mon Refugee Learning Centre');
  const [contactEmail, setContactEmail] = useState<string | null>(null);
  const [contactPhone, setContactPhone] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');

  useEffect(() => {
    fetch(`/api/public/branding?t=${Date.now()}`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.logoUrl) setLogoUrl(data.logoUrl);
        if (data?.loginHeroUrl) setHeroUrl(data.loginHeroUrl);
        if (data?.name) setSchoolName(data.name);
        if (data?.contactEmail) setContactEmail(data.contactEmail);
        if (data?.contactPhone) setContactPhone(data.contactPhone);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!heroUrl) {
      setHeroReady(false);
      return;
    }
    const image = new Image();
    image.onload = () => setHeroReady(true);
    image.onerror = () => { setHeroReady(false); setHeroUrl(null); };
    image.src = heroUrl;
  }, [heroUrl]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
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

  const brand = (
    <Link to="/" aria-label={`${schoolName} home`} className="flex min-w-0 items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#168c83] focus-visible:ring-offset-2">
      {logoUrl ? (
        <img src={logoUrl} alt="" width="44" height="44" className="size-11 shrink-0 border border-[#cad4d9] bg-white object-contain p-1" onError={() => setLogoUrl(null)} />
      ) : (
        <span className="grid size-11 shrink-0 place-items-center bg-[#112d40] text-base font-black text-white">M</span>
      )}
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-bold tracking-[-0.01em] text-[#112d40]">{schoolName}</span>
        <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#168c83]">School management portal</span>
      </span>
    </Link>
  );

  const support = contactEmail ? (
    <a href={`mailto:${contactEmail}`} className="font-bold text-[#112d40] underline decoration-[#168c83] underline-offset-4">Contact school support</a>
  ) : contactPhone ? (
    <a href={`tel:${contactPhone}`} className="font-bold text-[#112d40] underline decoration-[#168c83] underline-offset-4">Call school support</a>
  ) : (
    <Link to="/forgot-password" className="font-bold text-[#112d40] underline decoration-[#168c83] underline-offset-4">Account help</Link>
  );

  const footer = (
    <div className="flex flex-col gap-3 border-t border-[#cad4d9] pt-5 text-xs leading-5 text-[#526875] sm:flex-row sm:items-start sm:justify-between">
      <p className="max-w-[30ch]"><strong className="text-[#112d40]">Secure MRLC access.</strong> Leave persistent sign-in off on shared classroom devices.</p>
      <p>{support}</p>
    </div>
  );

  return (
    <Auth1 brand={brand} footer={footer} heroAlt={`${schoolName} learning community`} heroReady={heroReady} heroSrc={heroUrl} schoolName={schoolName}>
      <div className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#168c83]">{mfaRequired ? 'One more step' : 'Secure school access'}</p>
        <h1 className="mt-3 text-balance text-4xl font-black leading-[0.98] tracking-[-0.05em] text-[#112d40] sm:text-5xl">
          {mfaRequired ? 'Check your authenticator.' : 'Sign in to your school day.'}
        </h1>
        <p className="mt-4 max-w-md text-pretty text-sm leading-6 text-[#526875] sm:text-base">
          {mfaRequired ? 'Enter the current code from your authenticator app, or use one unused recovery code.' : 'Use your school email or username to open classes, records, the library and learning tools.'}
        </p>
      </div>

      <form id="login-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate aria-busy={isSubmitting}>
        <AnimatePresence initial={false}>
          {showAccountCreated && (
            <motion.div initial={reduceMotion ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -8 }} className="flex items-start gap-3 border border-[#168c83]/35 bg-[#168c83]/10 px-4 py-3 text-sm font-semibold leading-5 text-[#0d655f]" role="status">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> Your learner account is ready. Sign in with the details you created.
            </motion.div>
          )}
          {serverError && (
            <motion.div initial={reduceMotion ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -8 }} className="flex items-start gap-3 border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold leading-5 text-red-700" role="alert" aria-live="polite">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>{serverError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-2">
          <label htmlFor="identifier" className="block text-sm font-bold text-[#112d40]">Email or username</label>
          <Input id="identifier" type="text" autoComplete="username" spellCheck={false} placeholder="Enter your school email or username" aria-invalid={Boolean(errors.identifier)} aria-describedby={errors.identifier ? 'identifier-error' : undefined} className="h-12 rounded-none border-[#aebdc4] bg-white px-4 text-base shadow-none focus-visible:border-[#168c83] focus-visible:ring-[#168c83]/25" {...register('identifier', { onChange: clearFeedback })} />
          {errors.identifier && <p id="identifier-error" className="text-xs font-semibold text-red-600" role="alert">{errors.identifier.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="password" className="block text-sm font-bold text-[#112d40]">Password</label>
            <Link to="/forgot-password" className="text-sm font-bold text-[#0d716a] underline-offset-4 hover:underline">Forgot password?</Link>
          </div>
          <div className="relative">
            <Input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : undefined} className="h-12 rounded-none border-[#aebdc4] bg-white px-4 pr-12 text-base shadow-none focus-visible:border-[#168c83] focus-visible:ring-[#168c83]/25" {...register('password', { onChange: clearFeedback })} />
            <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-0 top-1/2 grid size-11 -translate-y-1/2 place-items-center text-[#526875] transition-colors duration-150 hover:text-[#112d40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#168c83]">
              {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
            </button>
          </div>
          {errors.password && <p id="password-error" className="text-xs font-semibold text-red-600" role="alert">{errors.password.message}</p>}
        </div>

        <AnimatePresence initial={false}>
          {mfaRequired && (
            <motion.div initial={reduceMotion ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={reduceMotion ? undefined : { opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="space-y-2 border-y border-[#cad4d9] bg-[#edf5f4] px-4 py-4">
                <label htmlFor="mfa-code" className="block text-sm font-bold text-[#112d40]">Authentication code</label>
                <Input id="mfa-code" value={mfaCode} onChange={(event) => { setMfaCode(event.target.value); setServerError(null); }} placeholder="6-digit or recovery code" autoComplete="one-time-code" autoCapitalize="none" spellCheck={false} inputMode="text" className="h-12 rounded-none border-[#aebdc4] bg-white px-4 font-mono tracking-[0.08em] focus-visible:border-[#168c83] focus-visible:ring-[#168c83]/25" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-[#112d40]">
            <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="size-5 rounded-none border-[#aebdc4] accent-[#168c83] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#168c83] focus-visible:ring-offset-2" />
            Keep me signed in on this device
          </label>
          <p className="mt-1 pl-8 text-xs leading-5 text-[#526875]">Leave this off on a shared school or library computer.</p>
        </div>

        <button type="submit" id="login-submit-btn" disabled={isSubmitting} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-none bg-[#112d40] px-6 text-sm font-black text-white transition-[background-color,transform] duration-150 hover:bg-[#168c83] active:scale-[0.99] disabled:opacity-60">
          {isSubmitting ? <><LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Signing in…</> : mfaRequired ? 'Verify and sign in' : 'Sign in to MRLC'}
        </button>

        <div className="border-t border-[#cad4d9] pt-5">
          <p className="text-sm text-[#526875]">Need a public learner account for Language Quest? <Link to="/signup" state={location.state} className="font-black text-[#112d40] underline decoration-[#f4d35e] decoration-2 underline-offset-4">Create learner account</Link></p>
        </div>
      </form>
    </Auth1>
  );
}
