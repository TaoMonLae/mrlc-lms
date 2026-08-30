"use client";

import type { ReactNode } from "react";
import { ArrowLeft, BookOpen, GraduationCap, Languages } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Link } from "react-router";

type Auth1Props = {
  brand: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  heroAlt: string;
  heroReady: boolean;
  heroSrc: string;
};

export function Auth1({ brand, children, footer, heroAlt, heroReady, heroSrc }: Auth1Props) {
  const reduceMotion = useReducedMotion();
  const enter = (delay: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduceMotion ? 0 : 0.42, delay: reduceMotion ? 0 : delay },
  });

  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[minmax(460px,0.82fr)_1.18fr]">
      <section className="flex min-h-screen flex-col border-r border-border bg-background">
        <motion.header {...enter(0.04)} className="flex items-center justify-between gap-5 px-5 py-5 sm:px-8 lg:px-10">
          {brand}
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 px-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">School home</span>
          </Link>
        </motion.header>

        <div className="mx-5 grid min-h-32 content-end overflow-hidden bg-academic-coral p-5 text-academic-navy-deep sm:mx-8 lg:hidden">
          <p className="text-xs font-semibold tracking-[0.08em]">YOUR SCHOOL DAY</p>
          <p className="mt-2 max-w-[18ch] text-2xl font-semibold leading-[1.05] tracking-[-0.025em]">Every lesson has a next step.</p>
        </div>

        <motion.main {...enter(0.12)} id="main-content" className="flex flex-1 items-center px-5 py-10 sm:px-8 lg:px-10 lg:py-12">
          <div className="mx-auto w-full max-w-[470px]">{children}</div>
        </motion.main>

        {footer && (
          <motion.footer {...enter(0.22)} className="px-5 pb-6 sm:px-8 lg:px-10 lg:pb-8">
            <div className="mx-auto w-full max-w-[470px]">{footer}</div>
          </motion.footer>
        )}
      </section>

      <motion.aside
        initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : 0.08 }}
        className="relative hidden min-h-screen overflow-hidden bg-academic-coral lg:block"
        aria-label="MRLC learning community"
      >
        {heroReady ? (
          <img
            src={heroSrc}
            alt={heroAlt}
            width="1800"
            height="1200"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-academic-coral" />
        )}
        <div className="absolute inset-0 bg-academic-navy-deep/20" />

        <div className="absolute right-8 top-8 border border-white/50 bg-academic-navy-deep/75 px-4 py-3 text-xs font-semibold tracking-[0.08em] text-white backdrop-blur-sm">
          MRLC GED SCHOOL · MALAYSIA
        </div>

        <div className="absolute bottom-0 left-0 w-[82%] max-w-2xl bg-academic-coral p-8 text-academic-navy-deep xl:p-10">
          <p className="text-xs font-semibold tracking-[0.08em]">YOUR SCHOOL DAY</p>
          <h2 className="mt-4 max-w-[11ch] text-balance text-4xl font-semibold leading-[0.98] tracking-[-0.04em] xl:text-6xl">
            Every lesson has a next step.
          </h2>
          <p className="mt-5 max-w-xl text-pretty text-sm leading-6 text-academic-navy-deep/80 xl:text-base xl:leading-7">
            From the morning register to GED practice and Language Quest, the path forward stays clear.
          </p>
          <div className="mt-7 grid grid-cols-3 divide-x divide-academic-navy-deep/25 border-y border-academic-navy-deep/25 py-4">
            {[
              [BookOpen, "Classes"],
              [GraduationCap, "GED practice"],
              [Languages, "Language Quest"],
            ].map(([Icon, label]) => {
              const ItemIcon = Icon as typeof BookOpen;
              return (
                <div key={label as string} className="flex items-center gap-2 px-3 first:pl-0 last:pr-0">
                  <ItemIcon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="text-xs font-semibold xl:text-sm">{label as string}</span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.aside>
    </div>
  );
}

export default Auth1;
