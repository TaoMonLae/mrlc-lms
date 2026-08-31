import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router';

type Auth1Props = {
  brand: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  heroAlt: string;
  heroReady: boolean;
  heroSrc: string | null;
  schoolName: string;
};

export default function Auth1({ brand, children, footer, heroAlt, heroReady, heroSrc, schoolName }: Auth1Props) {
  const reduceMotion = useReducedMotion();
  const enter = (delay: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduceMotion ? 0 : 0.38, delay: reduceMotion ? 0 : delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <div className="min-h-screen bg-white text-[#112d40] lg:grid lg:grid-cols-[minmax(460px,0.82fr)_1.18fr]">
      <section className="flex min-h-screen flex-col border-r border-[#cad4d9] bg-white">
        <motion.header {...enter(0.03)} className="flex items-center justify-between gap-5 px-5 py-5 sm:px-8 lg:px-10">
          {brand}
          <Link
            to="/"
            className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-[#526875] transition-colors duration-150 hover:text-[#112d40] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#168c83] focus-visible:ring-offset-2"
          >
            <span aria-hidden="true" className="mr-2">←</span> School home
          </Link>
        </motion.header>

        <div className="mx-5 grid min-h-32 content-end bg-[#f4d35e] p-5 text-[#112d40] sm:mx-8 lg:hidden">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em]">MRLC school portal</p>
          <p className="mt-2 max-w-[20ch] text-2xl font-black leading-[1.02] tracking-[-0.035em]">Classes, records and learning in one place.</p>
        </div>

        <motion.main {...enter(0.1)} id="main-content" className="flex flex-1 items-center px-5 py-10 sm:px-8 lg:px-10 lg:py-12">
          <div className="mx-auto w-full max-w-[470px]">{children}</div>
        </motion.main>

        {footer && (
          <motion.footer {...enter(0.18)} className="px-5 pb-6 sm:px-8 lg:px-10 lg:pb-8">
            <div className="mx-auto w-full max-w-[470px]">{footer}</div>
          </motion.footer>
        )}
      </section>

      <motion.aside
        initial={reduceMotion ? false : { opacity: 0, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.48, delay: reduceMotion ? 0 : 0.06, ease: [0.22, 1, 0.36, 1] }}
        className="relative hidden min-h-screen overflow-hidden bg-[#112d40] lg:block"
        aria-label={`${schoolName} school portal`}
      >
        {heroReady && heroSrc ? (
          <img src={heroSrc} alt={heroAlt} width="1800" height="1200" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid content-between bg-[#112d40] p-8 text-white xl:p-12" aria-hidden="true">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">Mae Sot · school community</p>
            <p className="max-w-[8ch] text-[clamp(5rem,11vw,10rem)] font-black uppercase leading-[0.72] tracking-[-0.07em] text-white/10">MRLC</p>
          </div>
        )}
        {heroReady && heroSrc && <div className="absolute inset-0 bg-[#112d40]/25" />}

        <div className="absolute right-8 top-8 border border-white/60 bg-[#112d40]/85 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
          School portal · secure access
        </div>

        <div className="absolute bottom-0 left-0 w-[84%] max-w-3xl bg-[#f4d35e] p-8 text-[#112d40] xl:p-11">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]">One connected school day</p>
          <h2 className="mt-4 max-w-[12ch] text-balance text-4xl font-black leading-[0.94] tracking-[-0.055em] xl:text-6xl">
            Every lesson has a next step.
          </h2>
          <p className="mt-5 max-w-xl text-pretty text-sm leading-6 text-[#112d40]/78 xl:text-base xl:leading-7">
            Open classes, attendance, school records, the library and Learning Quest from the same trusted account.
          </p>
          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 border-y border-[#112d40]/25 py-4 text-xs font-bold uppercase tracking-[0.12em]">
            <span>Classes</span><span>GED practice</span><span>School records</span><span>Learning Quest</span>
          </div>
        </div>
      </motion.aside>
    </div>
  );
}
