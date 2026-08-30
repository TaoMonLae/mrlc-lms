import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff, LoaderCircle, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router";
import * as z from "zod";
import Auth1 from "@/components/blocks/auth-1";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { safeAppReturnPath } from "@/shared/accountAccess";
import { useAuth } from "../providers/AuthProvider";

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or username."),
  password: z.string().min(1, "Enter your password."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const DEFAULT_HERO = "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=86&w=1800";

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState("Mon Refugee Learning Centre");
  const [contactEmail, setContactEmail] = useState<string | null>(null);
  const [contactPhone, setContactPhone] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [heroUrl, setHeroUrl] = useState(DEFAULT_HERO);
  const [heroReady, setHeroReady] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");

  useEffect(() => {
    fetch(`/api/public/branding?t=${Date.now()}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.logoUrl) setLogoUrl(data.logoUrl);
        if (data?.name) setSchoolName(data.name);
        if (data?.contactEmail) setContactEmail(data.contactEmail);
        if (data?.contactPhone) setContactPhone(data.contactPhone);
        setHeroUrl(data?.loginHeroUrl || DEFAULT_HERO);
      })
      .catch(() => {
        setHeroUrl(DEFAULT_HERO);
      });
  }, []);

  useEffect(() => {
    const image = new Image();
    image.onload = () => setHeroReady(true);
    image.onerror = () => {
      setHeroReady(false);
      if (heroUrl !== DEFAULT_HERO) setHeroUrl(DEFAULT_HERO);
    };
    image.src = heroUrl;
  }, [heroUrl]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormValues) => {
    setServerError(null);

    if (mfaRequired && mfaCode.trim().length < 6) {
      setServerError("Enter the 6-digit authentication code or an unused recovery code.");
      return;
    }

    const result = await login(data.identifier, data.password, rememberMe, mfaCode.trim() || undefined);

    if (result.mfaRequired && !result.error) {
      setMfaRequired(true);
      requestAnimationFrame(() => document.getElementById("mfa-code")?.focus());
      return;
    }

    if (!result.success) {
      if (result.mfaRequired) setMfaRequired(true);
      setServerError(result.error ?? "We could not sign you in. Check your details and try again.");
      return;
    }

    const returnPath = safeAppReturnPath((location.state as { from?: unknown } | null)?.from);
    let destination = returnPath || "/dashboard";

    try {
      const stored = JSON.parse(sessionStorage.getItem("auth_user") || "{}");
      if (!returnPath && stored.isExternalLearner) destination = "/games/language-quest";
      else if (!returnPath && stored.role === "LIBRARIAN") destination = "/books";
    } catch {
      // Keep the safe default destination.
    }

    navigate(destination, { replace: true });
  };

  const brand = (
    <Link
      to="/"
      aria-label={`${schoolName} home`}
      className="flex min-w-0 items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          width="44"
          height="44"
          className="size-11 shrink-0 border border-border bg-white object-contain p-1"
          onError={() => setLogoUrl(null)}
        />
      ) : (
        <span className="grid size-11 shrink-0 place-items-center bg-academic-navy-deep text-base font-semibold text-white">M</span>
      )}
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-semibold tracking-[-0.01em] text-foreground">{schoolName}</span>
        <span className="block text-[11px] font-medium tracking-[0.06em] text-academic-teal">GED SCHOOL LMS</span>
      </span>
    </Link>
  );

  const support = contactEmail ? (
    <a href={`mailto:${contactEmail}`} className="font-semibold text-foreground underline-offset-4 hover:underline">Contact school support</a>
  ) : contactPhone ? (
    <a href={`tel:${contactPhone}`} className="font-semibold text-foreground underline-offset-4 hover:underline">Call school support</a>
  ) : (
    <Link to="/forgot-password" className="font-semibold text-foreground underline-offset-4 hover:underline">Account help</Link>
  );

  const footer = (
    <div className="flex flex-col gap-3 border-t border-border pt-5 text-xs leading-5 text-muted-foreground sm:flex-row sm:items-start sm:justify-between">
      <p className="flex max-w-[28ch] items-start gap-2">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-academic-teal" aria-hidden="true" />
        Secure access for MRLC school members and Learning Quest learners.
      </p>
      <p>{support}</p>
    </div>
  );

  return (
    <Auth1
      brand={brand}
      footer={footer}
      heroAlt={`${schoolName} learning community`}
      heroReady={heroReady}
      heroSrc={heroUrl}
    >
      <a href="#login-form" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-background focus:px-4 focus:py-3 focus:text-foreground focus:shadow-lg">
        Skip to sign in
      </a>

      <div className="mb-8">
        <p className="text-xs font-semibold tracking-[0.08em] text-academic-teal">
          {mfaRequired ? "ONE MORE STEP" : "SECURE SCHOOL ACCESS"}
        </p>
        <h1 className="mt-3 text-balance text-4xl font-semibold leading-[1.03] tracking-[-0.035em] sm:text-5xl">
          {mfaRequired ? "Check your authenticator." : "Sign in to your school day."}
        </h1>
        <p className="mt-4 max-w-md text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
          {mfaRequired
            ? "Enter the current code from your authenticator app. You can also use one unused recovery code."
            : "Use your school email or username to open classes, records and Language Quest."}
        </p>
      </div>

      <form id="login-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate aria-busy={isSubmitting}>
        {serverError && (
          <div className="flex items-start gap-3 border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm leading-5 text-destructive" role="alert" aria-live="polite">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{serverError}</span>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="identifier" className="block text-sm font-semibold">Email or username</label>
          <Input
            id="identifier"
            type="text"
            autoComplete="username"
            spellCheck={false}
            placeholder="Enter your school email or username…"
            aria-invalid={Boolean(errors.identifier)}
            aria-describedby={errors.identifier ? "identifier-error" : undefined}
            className="h-12 rounded-sm border-input bg-background px-4 text-base shadow-none focus-visible:border-academic-teal focus-visible:ring-academic-teal/25"
            {...register("identifier")}
          />
          {errors.identifier && <p id="identifier-error" className="text-xs font-medium text-destructive" role="alert">{errors.identifier.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="password" className="block text-sm font-semibold">Password</label>
            <Link to="/forgot-password" className="text-sm font-semibold text-academic-teal underline-offset-4 hover:underline">Forgot password?</Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password…"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
              className="h-12 rounded-sm border-input bg-background px-4 pr-12 text-base shadow-none focus-visible:border-academic-teal focus-visible:ring-academic-teal/25"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-0 top-1/2 grid size-11 -translate-y-1/2 place-items-center text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
            </button>
          </div>
          {errors.password && <p id="password-error" className="text-xs font-medium text-destructive" role="alert">{errors.password.message}</p>}
        </div>

        {mfaRequired && (
          <div className="space-y-2 border-y border-border bg-accent/45 px-4 py-4">
            <label htmlFor="mfa-code" className="block text-sm font-semibold">Authentication code</label>
            <Input
              id="mfa-code"
              value={mfaCode}
              onChange={(event) => setMfaCode(event.target.value)}
              placeholder="6-digit or recovery code…"
              autoComplete="one-time-code"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="text"
              className="h-12 rounded-sm border-input bg-background px-4 font-mono text-base tracking-[0.08em] shadow-none focus-visible:border-academic-teal focus-visible:ring-academic-teal/25"
            />
          </div>
        )}

        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            className="size-4 rounded-sm border-border accent-academic-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          Keep me signed in on this device
        </label>

        <Button
          type="submit"
          id="login-submit-btn"
          disabled={isSubmitting}
          className="h-12 w-full rounded-sm bg-academic-navy-deep px-6 text-sm font-semibold tracking-[0.015em] text-white transition-[background-color,transform] duration-150 hover:bg-academic-teal active:scale-[0.99] disabled:opacity-70"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Signing in…</span>
          ) : mfaRequired ? (
            "Verify & sign in"
          ) : (
            "Sign in to MRLC"
          )}
        </Button>

        <p className="text-xs leading-5 text-muted-foreground">Using a shared computer? Leave “Keep me signed in” unchecked and sign out when you finish.</p>

        <div className="border-t border-border pt-5">
          <p className="text-sm text-muted-foreground">
            New to Language Quest?{" "}
            <Link to="/signup" state={location.state} className="font-semibold text-foreground underline decoration-academic-gold decoration-2 underline-offset-4 hover:text-academic-teal">
              Create a free learner account
            </Link>
          </p>
        </div>
      </form>
    </Auth1>
  );
}
