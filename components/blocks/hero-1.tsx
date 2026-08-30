"use client";

import { ArrowRight, BookOpen, GraduationCap, Users } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Link } from "react-router";

type Hero1Props = {
  authenticated?: boolean;
};

const reveal = (delay: number, reduceMotion: boolean | null) => ({
  initial: reduceMotion ? false : { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: reduceMotion ? 0 : 0.42, delay: reduceMotion ? 0 : delay },
});

export function Hero1({ authenticated = false }: Hero1Props) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="overflow-hidden bg-academic-coral text-academic-navy-deep">
      <div className="mx-auto grid min-h-[650px] max-w-[1440px] grid-cols-1 items-stretch lg:grid-cols-[0.95fr_1.05fr]">
        <div className="flex flex-col justify-center px-5 py-14 sm:px-8 lg:px-12 lg:py-16 xl:px-16">
          <motion.div
            {...reveal(0.08, reduceMotion)}
            className="mb-7 flex w-fit items-center gap-2 border border-academic-navy-deep/25 bg-white/25 px-3 py-2 text-xs font-semibold tracking-[0.08em]"
          >
            <GraduationCap className="size-4" aria-hidden="true" />
            MRLC GED School · Malaysia
          </motion.div>

          <motion.h1
            {...reveal(0.16, reduceMotion)}
            className="max-w-[12ch] text-balance text-[clamp(3rem,5vw,4.75rem)] font-semibold leading-[0.98] tracking-[-0.045em]"
          >
            A clearer path through every school day.
          </motion.h1>

          <motion.p
            {...reveal(0.24, reduceMotion)}
            className="mt-7 max-w-xl text-pretty text-base leading-7 text-academic-navy-deep/80 sm:text-lg"
          >
            Classes, attendance, exams, learning resources and Language Quest—connected in one secure place for MRLC learners, families and educators.
          </motion.p>

          <motion.div {...reveal(0.32, reduceMotion)} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              to={authenticated ? "/dashboard" : "/login"}
              className="inline-flex min-h-12 items-center justify-center gap-2 bg-academic-navy-deep px-6 text-sm font-semibold tracking-[0.015em] text-white transition-[background-color,transform] duration-150 hover:bg-academic-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-academic-coral active:scale-[0.98]"
            >
              {authenticated ? "Open Dashboard" : "Login to MRLC"}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              to="/language-quest"
              className="inline-flex min-h-12 items-center justify-center gap-2 border border-academic-navy-deep/35 bg-white/20 px-6 text-sm font-semibold tracking-[0.015em] transition-[background-color,transform] duration-150 hover:bg-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-academic-navy-deep focus-visible:ring-offset-2 focus-visible:ring-offset-academic-coral active:scale-[0.98]"
            >
              Explore Language Quest
            </Link>
          </motion.div>

          <motion.div {...reveal(0.4, reduceMotion)} className="mt-10 flex items-center gap-4 border-t border-academic-navy-deep/20 pt-6">
            <div className="flex -space-x-2" aria-hidden="true">
              {[BookOpen, Users, GraduationCap].map((Icon, index) => (
                <span key={index} className="grid size-10 place-items-center border-2 border-academic-coral bg-academic-navy-deep text-white">
                  <Icon className="size-4" />
                </span>
              ))}
            </div>
            <p className="max-w-[27ch] text-sm font-medium leading-5">
              One shared learning journey for students, families and educators.
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : 0.2 }}
          className="relative min-h-[440px] overflow-hidden lg:min-h-full"
        >
          <img
            src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=86&w=1800"
            alt="Students learning together in a bright classroom"
            width="1800"
            height="1200"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-academic-navy-deep/10" />

          <div className="absolute bottom-5 left-5 right-20 bg-white p-5 text-academic-navy-deep shadow-[0_16px_40px_rgba(12,37,56,0.18)] sm:bottom-8 sm:left-8 sm:max-w-sm sm:p-6">
            <p className="text-xs font-semibold tracking-[0.08em] text-academic-teal">TODAY AT MRLC</p>
            <div className="mt-4 space-y-3">
              {[
                ["08:30", "English · Reading & vocabulary"],
                ["10:15", "Mathematics · GED practice"],
                ["13:00", "Language Quest · Independent study"],
              ].map(([time, lesson]) => (
                <div key={time} className="grid grid-cols-[3.3rem_1fr] gap-3 border-t border-slate-200 pt-3 text-sm first:border-t-0 first:pt-0">
                  <span className="font-semibold tabular-nums">{time}</span>
                  <span className="text-slate-600">{lesson}</span>
                </div>
              ))}
            </div>
          </div>

          <a
            href="#learning-path"
            aria-label="See the MRLC learning path"
            className="absolute bottom-0 right-0 grid size-20 place-items-center bg-academic-navy-deep text-white transition-[background-color,transform] duration-150 hover:bg-academic-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset active:scale-[0.97] sm:size-28"
          >
            <ArrowRight className="size-6 rotate-45 sm:size-7" aria-hidden="true" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}

export default Hero1;
