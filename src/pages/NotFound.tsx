import { useEffect, useState } from 'react';
import { ArrowLeft, Home } from 'lucide-react';
import Lottie from 'lottie-react';
import { Link, useNavigate } from 'react-router';
import errorAnimation from '../../404-error-page.json';
import { Button } from '@/components/ui/button';

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  return prefersReducedMotion;
}

export default function NotFoundPage() {
  const navigate = useNavigate();
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Page not found | MRLC';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10 dark:bg-canvas sm:px-6">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.14),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.10),_transparent_38%)]"
      />

      <section className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-white/70 bg-white/90 px-6 py-8 text-center shadow-2xl shadow-indigo-950/10 backdrop-blur dark:border-white/10 dark:bg-surface-indigo/90 sm:px-10 sm:py-10">
        <div
          aria-hidden="true"
          className="mx-auto w-full max-w-sm"
        >
          <Lottie
            animationData={errorAnimation}
            autoplay={!prefersReducedMotion}
            loop={!prefersReducedMotion}
            rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
          />
        </div>

        <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-300">
          Error 404
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
          This page wandered off
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
          The page you were looking for may have moved, been removed, or never existed.
          Let&apos;s get you back to somewhere familiar.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button render={<Link to="/" />} nativeButton={false}>
            <Home className="h-4 w-4" />
            Return home
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </Button>
        </div>
      </section>
    </main>
  );
}
