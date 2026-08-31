import type { ReactNode } from 'react';
import { ArrowLeft, CheckCircle2, Headphones, Keyboard, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router';
import { MrlcQuestBrand, TaoMonLaeCredit } from './MrlcQuestBrand';
import { QuestDepthStage, QuestStaggeredText } from './LanguageQuestMotion';

type LanguageQuestAuthShellProps = {
  children: ReactNode;
  footer?: ReactNode;
  mode: 'login' | 'signup';
};

const copy = {
  login: {
    eyebrow: 'Your learning space',
    title: 'Your next lesson is waiting.',
    body: 'Return to your courses, keep your streak moving, and practise one useful sentence at a time.',
    prompt: 'Complete the sentence',
    sentence: 'I am ready to learn.',
    progress: '4 of 7 practices complete',
  },
  signup: {
    eyebrow: 'A fresh start',
    title: 'Make space for your next win.',
    body: 'Create a private learner profile, choose a guide, and start with a short lesson whenever you are ready.',
    prompt: 'Today’s useful phrase',
    sentence: 'I can try again.',
    progress: 'Your first course is ready',
  },
} as const;

export function LanguageQuestAuthShell({ children, footer, mode }: LanguageQuestAuthShellProps) {
  const content = copy[mode];

  return (
    <div className="lq-mesh min-h-screen overflow-x-hidden bg-white text-[var(--lq-charcoal)]">
      <a
        href="#auth-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:px-4 focus:py-3 focus:font-bold focus:text-[var(--lq-signal-blue)] focus:shadow-lg"
      >
        Skip to account form
      </a>

      <div className="min-h-screen lg:grid lg:grid-cols-[minmax(390px,0.88fr)_minmax(560px,1.12fr)]">
        <aside className="lq-hero-gradient relative isolate overflow-hidden px-5 pb-7 pt-5 text-white sm:px-8 sm:pb-9 lg:flex lg:min-h-screen lg:flex-col lg:px-10 lg:pb-10 lg:pt-8 xl:px-14">
          <div className="lq-hero-grid pointer-events-none absolute inset-0 -z-10 opacity-60" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-28 -left-28 -z-10 h-80 w-80 rounded-full bg-[#06d2ff]/20 blur-3xl" aria-hidden="true" />

          <div className="flex items-center justify-between gap-4">
            <MrlcQuestBrand inverse compact />
            <Link
              to="/language-quest"
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-bold text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Explore first</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </div>

          <div className="mt-10 max-w-xl lg:my-auto lg:mt-16">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/65">{content.eyebrow}</p>
            <QuestStaggeredText
              text={content.title}
              as="h2"
              className="mt-3 max-w-[11ch] text-balance text-4xl font-black leading-[0.98] tracking-[-0.045em] sm:text-5xl lg:text-6xl"
            />
            <p className="mt-5 max-w-[38rem] text-sm leading-6 text-white/75 sm:text-base sm:leading-7 lg:max-w-md">
              {content.body}
            </p>

            <QuestDepthStage className="relative mt-9 hidden max-w-lg sm:block lg:mt-12">
              <img
                src={mode === 'login' ? '/icons/LanguageQuests_Graphics/Owl School 8.svg' : '/icons/LanguageQuests_Graphics/Owl School 12.svg'}
                alt=""
                aria-hidden="true"
                className="lq-float-delayed pointer-events-none absolute -right-4 -top-16 z-20 h-28 w-28 object-contain drop-shadow-xl lg:h-32 lg:w-32"
              />
              <div className="relative overflow-hidden rounded-2xl border border-white/25 bg-white p-5 text-[var(--lq-charcoal)] shadow-[0_18px_45px_rgba(23,36,85,.22)] sm:p-6">
                <div className="lq-depth-1 flex items-center justify-between gap-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--lq-signal-blue)]">{content.prompt}</p>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#eaf2ff] text-[var(--lq-signal-blue)]">
                    <Headphones className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
                <p className="lq-depth-2 mt-5 text-2xl font-black tracking-[-0.03em] sm:text-3xl">“{content.sentence}”</p>
                <div className="lq-depth-1 mt-6 flex items-center gap-3 border-t border-[var(--lq-steel-border)] pt-4 text-sm font-bold text-[var(--lq-slate-caption)]">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--lq-spring-mint)] text-[var(--lq-charcoal)]">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {content.progress}
                </div>
              </div>
            </QuestDepthStage>

            <div className="mt-7 hidden items-center gap-5 text-xs font-bold text-white/70 lg:flex">
              <span className="inline-flex items-center gap-2"><Headphones className="h-4 w-4" aria-hidden="true" /> Listen</span>
              <span className="inline-flex items-center gap-2"><Keyboard className="h-4 w-4" aria-hidden="true" /> Practise</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> Save progress</span>
            </div>
          </div>
        </aside>

        <section className="flex min-h-[calc(100vh-210px)] flex-col bg-white lg:min-h-screen">
          <main id="auth-content" className="flex flex-1 items-center px-5 py-9 sm:px-8 sm:py-12 lg:px-12 xl:px-20">
            <div className="mx-auto w-full max-w-[580px]">{children}</div>
          </main>

          <footer className="px-5 pb-6 sm:px-8 lg:px-12 lg:pb-8 xl:px-20">
            <div className="mx-auto w-full max-w-[580px]">
              {footer}
              <div className={footer ? 'mt-5' : ''}>
                <TaoMonLaeCredit />
              </div>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}
