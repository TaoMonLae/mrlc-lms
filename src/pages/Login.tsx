import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, ArrowRight, AlertCircle } from "lucide-react";
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

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string>("Mon Refugee Learning Centre");

  // Pull the school's branding (logo + name) from the public endpoint so the
  // login screen reflects the configured school. Falls back to the icon below.
  useEffect(() => {
    fetch("/api/public/branding")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.logoUrl) setLogoUrl(data.logoUrl);
        if (data?.name) setSchoolName(data.name);
      })
      .catch(() => {/* keep defaults */});
  }, []);

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
      // Route each role to a sensible landing page.
      let destination = "/dashboard";
      try {
        const stored = JSON.parse(sessionStorage.getItem("auth_user") || "{}");
        if (stored.role === "LIBRARIAN") destination = "/books";
      } catch {
        // fall back to the default destination
      }
      navigate(destination);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      {/* Skip navigation for accessibility */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4">
        Skip to main content
      </a>
      <main id="main-content" className="w-full" role="main">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center gap-6 mb-8">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${schoolName} logo`}
              className="h-16 w-16 rounded-2xl object-contain bg-white shadow-xl ring-1 ring-slate-200"
              onError={() => setLogoUrl(null)}
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-aubergine-600 text-white shadow-xl shadow-aubergine-600/20">
              <GraduationCap className="h-10 w-10" />
            </div>
          )}
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">{schoolName}</h1>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-[0.2em] font-bold">GED School LMS Portal</p>
          </div>
        </div>

        <Card className="bg-white text-slate-900 ring-slate-200 border-slate-200 shadow-xl shadow-slate-200/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-bold text-slate-900">Sign in</CardTitle>
            <CardDescription className="text-slate-500 font-medium">
              Enter your credentials to access the school portal
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-2" noValidate>
            <CardContent className="space-y-4">
              {serverError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert" aria-live="polite">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{serverError}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Email Address <span className="text-red-500" aria-hidden="true">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@mrlc.edu"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className="h-11 border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white transition-all dark:bg-slate-50/50 dark:border-slate-200 dark:text-slate-900"
                  {...register("email")}
                />
                {errors.email && (
                  <p id="email-error" className="text-xs text-red-500 font-medium" role="alert">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Password <span className="text-red-500" aria-hidden="true">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  className="h-11 border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white transition-all dark:bg-slate-50/50 dark:border-slate-200 dark:text-slate-900"
                  {...register("password")}
                />
                {errors.password && (
                  <p id="password-error" className="text-xs text-red-500 font-medium" role="alert">{errors.password.message}</p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                id="login-submit-btn"
                disabled={isSubmitting}
                className="w-full h-12 text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-all group"
                aria-label="Sign in to dashboard"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    SIGNING IN...
                  </span>
                ) : (
                  <>
                    CONTINUE TO DASHBOARD
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="text-center mt-8 space-y-4">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            Protected area for authorized personnel only
          </p>
          <p className="text-sm text-slate-500">
            Need help? <span className="text-aubergine-600 font-bold">Contact school admin</span>
          </p>
        </div>
      </motion.div>
      </main>
    </div>
  );
}
