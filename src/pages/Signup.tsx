import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LoaderCircle, ShieldCheck } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { LanguageQuestAuthShell } from '@/src/components/games/LanguageQuestAuthShell';
import { LanguageQuestAvatar } from '@/src/components/games/LanguageQuestAvatar';
import { useAuth } from '@/src/providers/AuthProvider';
import { LANGUAGE_QUEST_AVATARS } from '@/shared/languageQuestAvatars';
import { safeAppReturnPath } from '@/shared/accountAccess';

const accountSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name.').max(80, 'First name must be 80 characters or fewer.'),
  lastName: z.string().trim().min(1, 'Enter your last name.').max(80, 'Last name must be 80 characters or fewer.'),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.').max(128, 'Password must be 128 characters or fewer.'),
});

type AccountField = keyof z.infer<typeof accountSchema>;

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  avatarId: 'owl',
};

export default function SignupPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { login } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showAllAvatars, setShowAllAvatars] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<AccountField, string>>>({});
  const [form, setForm] = useState(initialForm);

  const update = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
    if (field in fieldErrors) {
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const validateAccount = () => {
    const result = accountSchema.safeParse(form);
    if (result.success) {
      setFieldErrors({});
      return true;
    }

    const nextErrors: Partial<Record<AccountField, string>> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as AccountField;
      if (!nextErrors[field]) nextErrors[field] = issue.message;
    }
    setFieldErrors(nextErrors);
    const firstInvalidField = result.error.issues[0]?.path[0];
    requestAnimationFrame(() => document.getElementById(`learner-${String(firstInvalidField)}`)?.focus());
    return false;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (step === 1) {
      if (validateAccount()) setStep(2);
      return;
    }

    if (!validateAccount()) {
      setStep(1);
      return;
    }

    setSubmitting(true);
    const normalizedForm = {
      ...form,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
    };

    try {
      const response = await fetch('/api/auth/public-learner-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizedForm),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not create your account.');

      // New public learner sessions stay device-local and temporary by default.
      const result = await login(normalizedForm.email, normalizedForm.password, false);
      if (!result.success) {
        const previousState = location.state && typeof location.state === 'object' ? location.state : {};
        navigate('/login', {
          replace: true,
          state: { ...previousState, accountCreated: true, identifier: normalizedForm.email },
        });
        return;
      }

      const returnPath = safeAppReturnPath((location.state as { from?: unknown } | null)?.from);
      navigate(returnPath || '/games/language-quest', { replace: true });
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Could not create your account.');
    } finally {
      setSubmitting(false);
    }
  };

  const visibleAvatars = showAllAvatars ? LANGUAGE_QUEST_AVATARS : LANGUAGE_QUEST_AVATARS.slice(0, 12);
  const selectedAvatar = LANGUAGE_QUEST_AVATARS.find((avatar) => avatar.id === form.avatarId) ?? LANGUAGE_QUEST_AVATARS[0];
  const transition = reduceMotion ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const };

  const footer = (
    <div className="flex flex-col gap-3 border-t border-[var(--lq-steel-border)] pt-5 text-xs leading-5 text-[var(--lq-slate-caption)] sm:flex-row sm:items-start sm:justify-between">
      <p className="flex max-w-[36ch] items-start gap-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--lq-signal-blue)]" aria-hidden="true" />
        Learning Quest accounts cannot open private school records.
      </p>
      <p>Never share your password.</p>
    </div>
  );

  return (
    <LanguageQuestAuthShell mode="signup" footer={footer}>
      <div className="mb-7 flex items-center justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--lq-signal-blue)]">Free learner account</p>
          <p className="mt-1 text-sm font-bold text-[var(--lq-slate-caption)]">Step {step} of 2</p>
        </div>
        <ol className="flex items-center" aria-label="Account creation progress">
          {[1, 2].map((item) => (
            <li key={item} className="flex items-center" aria-current={step === item ? 'step' : undefined}>
              {item > 1 && <span className={`h-0.5 w-8 sm:w-12 ${step >= item ? 'bg-[var(--lq-signal-blue)]' : 'bg-[var(--lq-steel-border)]'}`} aria-hidden="true" />}
              <span className={`grid h-9 w-9 place-items-center rounded-full border-2 text-xs font-black transition-colors ${step >= item ? 'border-[var(--lq-signal-blue)] bg-[var(--lq-signal-blue)] text-white' : 'border-[var(--lq-steel-border)] bg-white text-[var(--lq-slate-caption)]'}`}>
                {step > item ? <Check className="h-4 w-4" aria-hidden="true" /> : item}
                <span className="sr-only">{item === 1 ? 'Account details' : 'Choose a guide'}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <form onSubmit={submit} noValidate aria-busy={submitting}>
        {error && (
          <div role="alert" aria-live="polite" className="mb-5 border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm font-semibold leading-5 text-red-700">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          {step === 1 ? (
            <motion.div key="account" initial={reduceMotion ? false : { opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? undefined : { opacity: 0, x: -18 }} transition={transition}>
              <h1 className="text-balance text-4xl font-black leading-[1.02] tracking-[-0.045em] text-[var(--lq-charcoal)] sm:text-5xl">Create your account.</h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-[var(--lq-slate-caption)] sm:text-base">Four details now, then choose the character that will travel with you.</p>

              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <AccountFieldInput id="learner-firstName" label="First name" value={form.firstName} onChange={(value) => update('firstName', value)} error={fieldErrors.firstName} autoComplete="given-name" placeholder="Your first name" maxLength={80} />
                <AccountFieldInput id="learner-lastName" label="Last name" value={form.lastName} onChange={(value) => update('lastName', value)} error={fieldErrors.lastName} autoComplete="family-name" placeholder="Your last name" maxLength={80} />
              </div>

              <div className="mt-5 space-y-5">
                <AccountFieldInput id="learner-email" label="Email address" type="email" value={form.email} onChange={(value) => update('email', value)} error={fieldErrors.email} autoComplete="email" placeholder="you@example.com" />

                <div className="space-y-2">
                  <label htmlFor="learner-password" className="block text-sm font-bold text-[var(--lq-charcoal)]">Password</label>
                  <div className="relative">
                    <Input id="learner-password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => update('password', event.target.value)} autoComplete="new-password" placeholder="At least 8 characters" maxLength={128} aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? 'learner-password-error' : 'learner-password-hint'} className="lq-auth-input pr-12" />
                    <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-0 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center text-[var(--lq-slate-caption)] transition hover:text-[var(--lq-signal-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--lq-signal-blue)]" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </div>
                  {fieldErrors.password ? <p id="learner-password-error" className="text-xs font-semibold text-red-600" role="alert">{fieldErrors.password}</p> : <p id="learner-password-hint" className="text-xs text-[var(--lq-slate-caption)]">Use 8–128 characters.</p>}
                </div>
              </div>

              <button type="submit" className="lq-btn-primary lq-auth-action mt-7 h-13 w-full text-base">Choose my guide <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
            </motion.div>
          ) : (
            <motion.div key="avatar" initial={reduceMotion ? false : { opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? undefined : { opacity: 0, x: 18 }} transition={transition}>
              <div className="flex items-start gap-4">
                <LanguageQuestAvatar avatarId={form.avatarId} className="h-16 w-16 rounded-full text-3xl shadow-none ring-4 ring-[#ddebff]" />
                <div>
                  <h1 className="text-balance text-4xl font-black leading-[1.02] tracking-[-0.045em] text-[var(--lq-charcoal)] sm:text-5xl">Choose your guide.</h1>
                  <p className="mt-2 text-sm leading-6 text-[var(--lq-slate-caption)]">{selectedAvatar.label} will cheer on your practice. You can change this later.</p>
                </div>
              </div>

              <fieldset className="mt-7">
                <legend className="sr-only">Choose a learner avatar</legend>
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                  {visibleAvatars.map((avatar) => {
                    const selected = form.avatarId === avatar.id;
                    return (
                      <button key={avatar.id} type="button" onClick={() => update('avatarId', avatar.id)} aria-label={avatar.label} aria-pressed={selected} className={`group relative grid aspect-square place-items-center rounded-full border-2 transition-[border-color,background-color,transform] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lq-signal-blue)] focus-visible:ring-offset-2 ${selected ? 'border-[var(--lq-signal-blue)] bg-[#eaf2ff]' : 'border-[var(--lq-steel-border)] bg-white hover:border-[#87b6f6]'}`}>
                        <LanguageQuestAvatar avatarId={avatar.id} className="h-[72%] w-[72%] rounded-full text-2xl shadow-none ring-0" />
                        {selected && <span className="absolute -right-0.5 -top-0.5 grid h-6 w-6 place-items-center rounded-full bg-[var(--lq-signal-blue)] text-white ring-2 ring-white"><Check className="h-3.5 w-3.5" aria-hidden="true" /></span>}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <button type="button" onClick={() => setShowAllAvatars((current) => !current)} className="mt-4 min-h-11 text-sm font-bold text-[var(--lq-signal-blue)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lq-signal-blue)]">
                {showAllAvatars ? 'Show fewer guides' : `See all ${LANGUAGE_QUEST_AVATARS.length} guides`}
              </button>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                <button type="button" onClick={() => setStep(1)} className="lq-btn-outline h-13 flex-1 text-base"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back</button>
                <button type="submit" disabled={submitting} className="lq-btn-primary lq-auth-action h-13 flex-[1.55] text-base">
                  {submitting ? <><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Creating account…</> : <>Start Learning Quest <ArrowRight className="h-4 w-4" aria-hidden="true" /></>}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--lq-slate-caption)]">Already have an account?{' '}<Link to="/login" state={location.state} className="font-black text-[var(--lq-signal-blue)] underline-offset-4 hover:underline">Sign in</Link></p>
    </LanguageQuestAuthShell>
  );
}
function AccountFieldInput({ id, label, type = 'text', value, onChange, error, autoComplete, placeholder, maxLength }: { id: string; label: string; type?: string; value: string; onChange: (value: string) => void; error?: string; autoComplete: string; placeholder: string; maxLength?: number }) {
  const errorId = `${id}-error`;
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-bold text-[var(--lq-charcoal)]">{label}</label>
      <Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} placeholder={placeholder} maxLength={maxLength} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} className="lq-auth-input" />
      {error && <p id={errorId} className="text-xs font-semibold text-red-600" role="alert">{error}</p>}
    </div>
  );
}
