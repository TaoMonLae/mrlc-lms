import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  HelpCircle,
  Users,
  BookOpen,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "../providers/AuthProvider";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// The login background comes from Settings → Branding (loginHeroUrl). As a
// fallback, a file at public/login-hero.jpg is used; otherwise a branded
// gradient is shown.
const HERO_FALLBACK = "/login-hero.jpg";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string>("Mon Refugee Learning Centre");
  const [contactEmail, setContactEmail] = useState<string | null>(null);
  const [contactPhone, setContactPhone] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [heroUrl, setHeroUrl] = useState<string>(HERO_FALLBACK);
  const [heroOk, setHeroOk] = useState(false);

  // Pull the school's branding (logo + name + contact + login background) from
  // the public endpoint.
  useEffect(() => {
    fetch(`/api/public/branding?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.logoUrl) setLogoUrl(data.logoUrl);
        if (data?.name) setSchoolName(data.name);
        if (data?.contactEmail) setContactEmail(data.contactEmail);
        if (data?.contactPhone) setContactPhone(data.contactPhone);
        setHeroUrl(data?.loginHeroUrl || HERO_FALLBACK);
      })
      .catch(() => {/* keep defaults */});
  }, []);

  // Probe whichever hero image we ended up with so a 404 doesn't show a broken
  // graphic — fall back to the gradient if it can't load.
  useEffect(() => {
    if (!heroUrl) {
      setHeroOk(false);
      return;
    }
    const img = new Image();
    img.onload = () => setHeroOk(true);
    img.onerror = () => setHeroOk(false);
    img.src = heroUrl;
  }, [heroUrl]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setServerError(null);
    const result = await login(data.email, data.password);
    if (!result.success) {
      setServerError(result.error ?? "Login failed. Please try again.");
    } else {
      let destination = "/dashboard";
      try {
        const stored = JSON.parse(sessionStorage.getItem("auth_user") || "{}");
        if (stored.role === "LIBRARIAN") destination = "/books";
      } catch {
        /* fall back to the default destination */
      }
      navigate(destination);
    }
  };

  const helpHref = contactEmail
    ? `mailto:${contactEmail}`
    : contactPhone
    ? `tel:${contactPhone}`
    : "#";

  const Logo = (
    <div className="flex items-center gap-3">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`${schoolName} logo`}
          className="h-12 w-12 rounded-xl object-contain bg-white/80 ring-1 ring-slate-200 p-1"
          onError={() => setLogoUrl(null)}
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-700 text-white shadow-lg shadow-blue-700/20">
          <GraduationCap className="h-7 w-7" />
        </div>
      )}
      <div className="leading-tight">
        <p className="text-sm font-extrabold uppercase tracking-tight text-slate-900">{schoolName}</p>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">GED School LMS Portal</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-slate-100 font-sans lg:h-screen lg:overflow-hidden">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50">
        Skip to main content
      </a>

      {/* Left: hero photo (branded gradient fallback). Hidden on small screens. */}
      <div className="relative hidden lg:block lg:w-1/2 lg:h-screen">
        {heroOk ? (
          <img src={heroUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-blue-200 via-slate-200 to-emerald-100" />
        )}
        {/* Subtle darken at the bottom for the overlaid tagline */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold text-white drop-shadow">
            <span className="flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Quality Education</span>
            <span className="hidden h-4 w-px bg-white/40 sm:block" />
            <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Community Support</span>
            <span className="hidden h-4 w-px bg-white/40 sm:block" />
            <span className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> Bright Futures</span>
          </div>
        </div>
      </div>

      {/* Right: scrollable content pane that always fits the viewport */}
      <main
        id="main-content"
        role="main"
        className="flex w-full flex-col lg:w-1/2 lg:h-screen lg:overflow-y-auto"
      >
        {/* Logo */}
        <header className="flex items-center justify-center px-6 pt-6 sm:justify-end sm:px-10 sm:pt-8">
          {Logo}
        </header>

        {/* Centered hero + card */}
        <div className="flex flex-1 items-center justify-center px-6 py-6 sm:px-10">
          <div className="w-full max-w-md">
            {/* Hero text */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-6 hidden sm:block"
            >
              <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight xl:text-5xl">
                <span className="block text-blue-700">Learn.</span>
                <span className="block text-emerald-600">Grow.</span>
                <span className="block text-blue-700">Achieve.</span>
              </h1>
              <div className="mt-4 h-1 w-12 rounded-full bg-blue-700" />
              <p className="mt-4 max-w-sm text-sm font-medium text-slate-600">
                Empowering refugee learners through quality education and accessible
                learning every day.
              </p>
            </motion.div>

            {/* Login card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="w-full rounded-2xl border border-slate-200/70 bg-white p-6 shadow-2xl shadow-slate-400/20 sm:p-8"
            >
              <div className="text-center">
                <h2 className="text-2xl font-extrabold text-blue-800">Welcome Back</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">Access your GED Learning Portal</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4" noValidate>
                {serverError && (
                  <div
                    className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    role="alert"
                    aria-live="polite"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{serverError}</span>
                  </div>
                )}

                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="sr-only">Email address</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      autoComplete="email"
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? "email-error" : undefined}
                      className="h-12 border-slate-200 bg-slate-50/70 pl-10 text-slate-900 placeholder:text-slate-400 focus:bg-white dark:bg-slate-50/70 dark:border-slate-200 dark:text-slate-900"
                      {...register("email")}
                    />
                  </div>
                  {errors.email && (
                    <p id="email-error" className="text-xs font-medium text-red-500" role="alert">{errors.email.message}</p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label htmlFor="password" className="sr-only">Password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      aria-invalid={!!errors.password}
                      aria-describedby={errors.password ? "password-error" : undefined}
                      className="h-12 border-slate-200 bg-slate-50/70 px-10 text-slate-900 placeholder:text-slate-400 focus:bg-white dark:bg-slate-50/70 dark:border-slate-200 dark:text-slate-900"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p id="password-error" className="text-xs font-medium text-red-500" role="alert">{errors.password.message}</p>
                  )}
                </div>

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                    />
                    Remember me
                  </label>
                  <a href={helpHref} className="text-sm font-semibold text-blue-700 hover:text-blue-800 hover:underline">
                    Forgot Password?
                  </a>
                </div>

                {/* Sign in */}
                <Button
                  type="submit"
                  id="login-submit-btn"
                  disabled={isSubmitting}
                  className="h-12 w-full bg-blue-700 text-sm font-bold text-white transition-all hover:bg-blue-800 disabled:opacity-70"
                  aria-label="Sign in"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <LogIn className="h-4 w-4" />
                      Sign In
                    </span>
                  )}
                </Button>

                {/* Divider */}
                <div className="flex items-center gap-3 py-0.5 text-xs font-medium text-slate-400">
                  <span className="h-px flex-1 bg-slate-200" />
                  or
                  <span className="h-px flex-1 bg-slate-200" />
                </div>

                {/* Help */}
                <a
                  href={helpHref}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white text-sm font-bold text-blue-700 transition-colors hover:bg-blue-50"
                >
                  <HelpCircle className="h-4 w-4" />
                  Help &amp; Support
                </a>
              </form>
            </motion.div>
          </div>
        </div>

        {/* Footer note */}
        <footer className="px-6 pb-6 sm:px-10">
          <div className="text-center sm:text-right">
            <p className="flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 sm:justify-end">
              <ShieldCheck className="h-4 w-4" /> Protected area for authorized personnel only
            </p>
            {(contactEmail || contactPhone) && (
              <p className="mt-1 text-sm text-slate-500">
                Need help?{" "}
                {contactEmail && (
                  <a className="font-bold text-blue-700 hover:underline" href={`mailto:${contactEmail}`}>{contactEmail}</a>
                )}
                {contactEmail && contactPhone ? <span className="text-slate-400"> &nbsp;•&nbsp; </span> : null}
                {contactPhone && (
                  <a className="font-bold text-slate-600 hover:underline" href={`tel:${contactPhone}`}>{contactPhone}</a>
                )}
              </p>
            )}
          </div>
        </footer>
      </main>
    </div>
  );
}
