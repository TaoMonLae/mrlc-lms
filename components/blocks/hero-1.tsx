"use client";

import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Link } from "react-router";

type Hero1Props = {
  authenticated?: boolean;
  heroSrc?: string | null;
  schoolName?: string;
};

const DEFAULT_HERO = "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=86&w=1800";

const reveal = (delay: number, reduceMotion: boolean | null) => ({
  initial: reduceMotion ? false : { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: reduceMotion ? 0 : 0.42, delay: reduceMotion ? 0 : delay },
});

export function Hero1({ authenticated = false, heroSrc = null, schoolName = "Mon Refugee Learning Centre" }: Hero1Props) {
  const reduceMotion = useReducedMotion();
  const [heroFailed, setHeroFailed] = useState(false);

  useEffect(() => setHeroFailed(false), [heroSrc]);

  const imageSrc = heroSrc && !heroFailed ? heroSrc : DEFAULT_HERO;

  return (
    <section className="overflow-hidden bg-academic-coral text-academic-navy-deep">
      <div className="mx-auto grid min-h-[680px] max-w-[1440px] grid-cols-1 items-stretch lg:grid-cols-[0.92fr_1.08fr]">
        <div className="flex flex-col justify-center border-r border-academic-navy-deep/15 px-5 py-14 sm:px-8 lg:px-12 lg:py-16 xl:px-16">
          <motion.div
            {...reveal(0.08, reduceMotion)}
            className="mb-8 flex items-center gap-4 text-[11px] font-bold uppercase tracking-[0.16em]"
          >
            <span className="h-px w-10 bg-academic-navy-deep" aria-hidden="true" />
            GED school · Malaysia
          </motion.div>

          <motion.h1
            {...reveal(0.16, reduceMotion)}
            className="max-w-[11ch] text-balance text-[clamp(3.25rem,5.4vw,5.25rem)] font-black leading-[0.91] tracking-[-0.055em]"
          >
            A clearer path through every school day.
          </motion.h1>

          <motion.p
            {...reveal(0.24, reduceMotion)}
            className="mt-8 max-w-xl text-pretty text-base leading-7 text-academic-navy-deep/78 sm:text-lg"
          >
            Classes, attendance, exams, learning resources and Language Quest—connected in one secure place for MRLC learners, families and educators.
          </motion.p>

          <motion.div {...reveal(0.32, reduceMotion)} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              to={authenticated ? "/dashboard" : "/login"}
              className="inline-flex min-h-12 items-center justify-center gap-2 bg-academic-navy-deep px-6 text-sm font-bold tracking-[0.015em] text-white transition-[background-color,transform] duration-150 hover:bg-academic-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-academic-coral active:scale-[0.98]"
            >
              {authenticated ? "Open Dashboard" : "Login to MRLC"}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              to="/language-quest"
              className="inline-flex min-h-12 items-center justify-center gap-2 border border-academic-navy-deep/45 px-6 text-sm font-bold tracking-[0.015em] transition-[background-color,transform] duration-150 hover:bg-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-academic-navy-deep focus-visible:ring-offset-2 focus-visible:ring-offset-academic-coral active:scale-[0.98]"
            >
              Explore Language Quest
            </Link>
          </motion.div>

          <motion.div {...reveal(0.4, reduceMotion)} className="mt-11 grid gap-3 border-t border-academic-navy-deep/20 pt-6 sm:grid-cols-[auto_1fr] sm:items-start sm:gap-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-academic-navy-deep/60">One school system</p>
            <p className="max-w-[34ch] text-sm font-bold leading-5">Students · Families · Educators<br /><span className="font-medium text-academic-navy-deep/70">A shared route through each school day.</span></p>
          </motion.div>
        </div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : 0.2 }}
          className="relative min-h-[440px] overflow-hidden lg:min-h-full"
        >
          <img
            src={imageSrc}
            alt={`${schoolName} learning community`}
            width="1800"
            height="1200"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => {
              if (heroSrc && imageSrc === heroSrc) setHeroFailed(true);
            }}
          />
          <div className="absolute inset-0 bg-academic-navy-deep/15" />

          <div className="absolute bottom-0 left-0 right-20 bg-white p-5 text-academic-navy-deep sm:right-auto sm:w-[410px] sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-academic-teal">Today at MRLC</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-academic-navy-deep/45">School day 01</p>
            </div>
            <div className="mt-4">
              {[
                ["08:30", "English · Reading & vocabulary"],
                ["10:15", "Mathematics · GED practice"],
                ["13:00", "Language Quest · Independent study"],
              ].map(([time, lesson]) => (
                <div key={time} className="grid grid-cols-[3.3rem_1fr] gap-3 border-t border-academic-navy-deep/15 py-3 text-sm last:pb-0">
                  <span className="font-black tabular-nums">{time}</span>
                  <span className="text-academic-navy-deep/65">{lesson}</span>
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
