"use client";

import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Link } from "react-router";

type Hero1Props = {
  authenticated?: boolean;
  heroSrc?: string | null;
  schoolName?: string;
  logoSrc?: string | null;
};

const reveal = (delay: number, reduceMotion: boolean | null) => ({
  initial: reduceMotion ? false : { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: reduceMotion ? 0 : 0.55, delay: reduceMotion ? 0 : delay, ease: "easeOut" as const },
});

export function Hero1({ authenticated = false, heroSrc = null, schoolName = "Mon Refugee Learning Centre", logoSrc = null }: Hero1Props) {
  const reduceMotion = useReducedMotion();
  const [heroFailed, setHeroFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [defaultLogoFailed, setDefaultLogoFailed] = useState(false);

  useEffect(() => setHeroFailed(false), [heroSrc]);
  useEffect(() => {
    setLogoFailed(false);
    setDefaultLogoFailed(false);
  }, [logoSrc]);

  const showPhoto = Boolean(heroSrc && !heroFailed);
  const markSrc = logoSrc && !logoFailed ? logoSrc : "/icon-192.png";

  return (
    <section className="overflow-hidden bg-academic-navy-deep text-white" aria-labelledby="landing-title">
      <div className="mx-auto grid min-h-[640px] max-w-[1440px] lg:grid-cols-[1.08fr_0.92fr]">
        <div className="flex flex-col justify-center px-5 py-16 sm:px-8 lg:px-12 lg:py-20 xl:px-16">
          <motion.p {...reveal(0.06, reduceMotion)} className="mb-9 flex items-center gap-4 text-[11px] font-bold uppercase tracking-[0.2em] text-academic-gold">
            <span className="h-px w-10 bg-academic-gold" aria-hidden="true" />
            Mon Refugee Learning Centre · Malaysia
          </motion.p>

          <motion.h1 {...reveal(0.14, reduceMotion)} id="landing-title" className="max-w-[12ch] text-balance text-[clamp(3.5rem,6.6vw,6.5rem)] font-black leading-[0.9] tracking-[-0.065em]">
            A place to learn. <span className="text-academic-gold">A path forward.</span>
          </motion.h1>

          <motion.p {...reveal(0.24, reduceMotion)} className="mt-8 max-w-xl text-pretty text-base leading-8 text-white/72 sm:text-lg">
            MRLC is a GED school for refugee learners in Malaysia. Our learning community brings students, educators and families together around the next step.
          </motion.p>

          <motion.div {...reveal(0.32, reduceMotion)} className="mt-9 flex flex-wrap gap-3">
            <Link to="/about" className="inline-flex min-h-12 items-center justify-center gap-2 bg-academic-gold px-6 text-sm font-bold text-academic-navy-deep transition-[background-color,transform] duration-150 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-academic-navy-deep active:scale-[0.98]">
              Discover MRLC <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link to={authenticated ? "/dashboard" : "/login"} className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/40 px-6 text-sm font-bold text-white transition-[background-color,transform] duration-150 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-academic-gold active:scale-[0.98]">
              {authenticated ? "Open dashboard" : "Sign in to the portal"}
            </Link>
          </motion.div>

          <motion.p {...reveal(0.4, reduceMotion)} className="mt-12 border-t border-white/20 pt-5 text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
            Education · Dignity · Opportunity
          </motion.p>
        </div>

        <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 0.7, delay: reduceMotion ? 0 : 0.16 }} className="relative min-h-[430px] overflow-hidden bg-[#f4e9cc] text-academic-navy-deep lg:min-h-full">
          {showPhoto ? (
            <>
              <img src={heroSrc!} alt={`${schoolName} learning community`} width="1400" height="1100" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" onError={() => setHeroFailed(true)} />
              <div className="absolute inset-0 bg-gradient-to-t from-academic-navy-deep/65 via-transparent to-transparent" aria-hidden="true" />
              <p className="absolute bottom-0 left-0 right-0 px-7 pb-8 pt-16 text-sm font-semibold text-white sm:px-10">The people and purpose behind MRLC.</p>
            </>
          ) : (
            <div className="relative flex h-full min-h-[430px] flex-col justify-between overflow-hidden p-7 sm:p-10 lg:min-h-[640px]">
              <div className="absolute -right-24 top-16 size-[390px] rounded-full border border-academic-navy-deep/10 sm:size-[520px]" aria-hidden="true" />
              <div className="absolute -right-12 top-28 size-[310px] rounded-full border border-academic-navy-deep/10 sm:size-[430px]" aria-hidden="true" />
              <div className="relative flex items-start justify-between gap-5 border-b border-academic-navy-deep/25 pb-5 text-[11px] font-bold uppercase tracking-[0.18em]">
                <span>MRLC / GED</span><span>Malaysia</span>
              </div>
              <div className="relative flex flex-1 items-center justify-center py-8">
                <div className="grid size-52 place-items-center rounded-full bg-white/80 shadow-[0_24px_60px_rgba(12,37,56,0.12)] sm:size-64">
                  {defaultLogoFailed ? (
                    <span className="text-5xl font-black tracking-[-0.08em]" aria-label={schoolName}>MRLC</span>
                  ) : (
                    <img src={markSrc} alt={`${schoolName} emblem`} width="192" height="192" className="size-36 object-contain sm:size-44" onError={() => {
                      if (logoSrc && markSrc === logoSrc) setLogoFailed(true);
                      else setDefaultLogoFailed(true);
                    }} />
                  )}
                </div>
              </div>
              <div className="relative border-t border-academic-navy-deep/25 pt-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-academic-teal">Our school, our community</p>
                <p className="mt-3 max-w-[16ch] text-3xl font-black leading-[0.98] tracking-[-0.045em] sm:text-4xl">Learning belongs to every future.</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

export default Hero1;
