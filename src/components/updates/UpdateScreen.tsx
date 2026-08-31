import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, MousePointer2, Route, Sparkles, X } from 'lucide-react';
import type { AppRelease, ReleaseHighlight } from '../../data/releases';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const ICONS = {
  sparkles: Sparkles,
  cursor: MousePointer2,
  map: Route,
} as const;

const ACCENTS: Record<ReleaseHighlight['accent'], { wash: string; solid: string; text: string }> = {
  blue: { wash: 'bg-[#e1edff]', solid: 'bg-[#2727e6]', text: 'text-[#2727e6]' },
  mint: { wash: 'bg-[#dff8ee]', solid: 'bg-[#16ab59]', text: 'text-[#087b3c]' },
  coral: { wash: 'bg-[#fff0ec]', solid: 'bg-[#ff6f59]', text: 'text-[#b93222]' },
};

export function UpdateScreen({
  open,
  onClose,
  release,
}: {
  open: boolean;
  onClose: () => void;
  release: AppRelease;
}) {
  const [step, setStep] = useState(0);
  const reduceMotion = useReducedMotion();
  const highlight = release.highlights[step];
  const accent = ACCENTS[highlight.accent];
  const Icon = ICONS[highlight.icon];
  const isLast = step === release.highlights.length - 1;

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const next = () => {
    if (isLast) onClose();
    else setStep((current) => Math.min(current + 1, release.highlights.length - 1));
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="z-[120] grid max-h-[calc(100dvh-2rem)] w-[min(980px,calc(100vw-2rem))] max-w-none grid-cols-1 grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-[24px] border-0 bg-white p-0 text-[#111118] shadow-[0_32px_90px_rgba(8,14,35,0.35)] sm:max-w-none lg:grid-cols-[0.38fr_0.62fr] lg:grid-rows-1"
      >
        <DialogTitle className="sr-only">What’s New: {release.title}</DialogTitle>
        <DialogDescription className="sr-only">{release.summary}</DialogDescription>

        <aside className="relative isolate min-h-0 overflow-hidden bg-[#2727e6] p-6 text-white sm:p-8 lg:min-h-[620px] lg:p-10">
          <div aria-hidden="true" className="absolute -right-12 -top-16 size-52 rounded-full bg-[#ffda00]" />
          <div aria-hidden="true" className="absolute -bottom-20 -left-20 size-64 rotate-12 rounded-[56px] bg-[#16ab59]" />
          <div aria-hidden="true" className="absolute bottom-20 right-[-3rem] size-36 rotate-45 bg-[#ffbac4]" />

          <div className="relative z-10 flex h-full flex-col justify-between gap-4 lg:gap-10">
            <div className="flex items-center justify-between gap-4">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
                What’s New · {release.version}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex size-10 items-center justify-center rounded-full border border-white/35 bg-white/10 text-white transition-[background-color,transform] duration-150 hover:bg-white/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Close What’s New"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-w-xs">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffda00]">
                Release {String(step + 1).padStart(2, '0')} / {String(release.highlights.length).padStart(2, '0')}
              </p>
              <p aria-hidden="true" className="mt-1 font-sans text-6xl font-medium leading-[0.78] tracking-[-0.08em] text-white/95 lg:mt-2 lg:text-[clamp(5rem,10vw,8.5rem)]">
                {String(step + 1).padStart(2, '0')}
              </p>
              <p className="mt-7 hidden max-w-[24ch] text-base leading-6 text-white/80 lg:block">{release.summary}</p>
            </div>

            <div className="flex items-center gap-2" aria-label={`Slide ${step + 1} of ${release.highlights.length}`}>
              {release.highlights.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setStep(index)}
                  className={cn(
                    'h-2 rounded-full transition-[width,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                    index === step ? 'w-9 bg-white' : 'w-2 bg-white/40 hover:bg-white/70',
                  )}
                  aria-label={`Show update ${index + 1}: ${item.title}`}
                  aria-current={index === step ? 'step' : undefined}
                />
              ))}
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col bg-white">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-5 pt-8 sm:px-10 sm:pt-10 lg:px-14 lg:pb-8 lg:pt-14">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={highlight.title}
                initial={reduceMotion ? false : { opacity: 0, x: 22, filter: 'blur(6px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={reduceMotion ? undefined : { opacity: 0, x: -14, filter: 'blur(4px)' }}
                transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className={cn('flex size-14 items-center justify-center rounded-2xl', accent.wash, accent.text)}>
                  <Icon className="size-6" aria-hidden="true" />
                </div>
                <p className={cn('mt-8 font-mono text-[11px] font-bold uppercase tracking-[0.18em]', accent.text)}>
                  {highlight.eyebrow}
                </p>
                <h2 className="mt-3 max-w-[14ch] text-[clamp(2rem,4vw,3.25rem)] font-medium leading-[0.98] tracking-[-0.055em] text-[#111118]">
                  {highlight.title}
                </h2>
                <p className="mt-5 max-w-[54ch] text-base leading-7 text-[#4b5260] sm:text-lg">
                  {highlight.description}
                </p>

                <ul className="mt-8 divide-y divide-[#d9deea] border-y border-[#d9deea]">
                  {highlight.details.map((detail) => (
                    <li key={detail} className="flex gap-3 py-4 text-sm leading-6 text-[#2f3540] sm:text-[15px]">
                      <span className={cn('mt-1 flex size-5 shrink-0 items-center justify-center rounded-full text-white', accent.solid)}>
                        <Check className="size-3" aria-hidden="true" />
                      </span>
                      {detail}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-[#d9deea] bg-[#f7f9fc] px-6 py-4 sm:px-10 lg:px-14">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((current) => Math.max(current - 1, 0))}
              disabled={step === 0}
              className="rounded-full px-4 text-[#343b48] hover:bg-[#e9edf5]"
            >
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button
              type="button"
              onClick={next}
              className="h-11 rounded-full border-[#2727e6] bg-[#2727e6] px-5 text-white hover:border-[#1111b8] hover:bg-[#1111b8]"
            >
              {isLast ? 'Start Exploring' : 'Next Change'}
              {isLast ? <Sparkles className="size-4" /> : <ArrowRight className="size-4" />}
            </Button>
          </footer>
        </section>
      </DialogContent>
    </Dialog>
  );
}
