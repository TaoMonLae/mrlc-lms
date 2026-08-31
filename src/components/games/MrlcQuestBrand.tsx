import { Link } from 'react-router';
import { Github, Sparkles } from 'lucide-react';

interface MrlcQuestBrandProps {
  to?: string;
  compact?: boolean;
  inverse?: boolean;
}

export function MrlcQuestBrand({ to = '/language-quest', compact = false, inverse = false }: MrlcQuestBrandProps) {
  return (
    <Link
      to={to}
      className={`group inline-flex min-w-0 items-center ${compact ? 'gap-2' : 'gap-3'}`}
      aria-label="MRLC Learning Quest home"
    >
      <span className={`relative grid shrink-0 place-items-center rounded-full bg-white shadow-[0_2px_0_#c5d0dc] ring-1 ring-black/5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:-rotate-3 ${compact ? 'h-10 w-10 p-1' : 'h-12 w-12 p-1.5'}`}>
        <img src="/icon-192.png" alt="MRLC logo" className="h-full w-full object-contain" />
        <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-[var(--lq-spring-mint)] text-[var(--lq-charcoal)] shadow-sm">
          <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
        </span>
      </span>
      <span className={`min-w-0 leading-tight ${compact ? 'max-[430px]:hidden' : ''}`}>
        <span className={`block text-[10px] font-black uppercase tracking-[0.2em] ${inverse ? 'text-white/65' : 'text-[var(--lq-signal-blue)]'}`}>MRLC</span>
        <span className={`block truncate font-black tracking-[-0.025em] ${compact ? 'text-base' : 'text-lg'} ${inverse ? 'text-white' : 'text-slate-950 dark:text-white'}`}>Learning Quest</span>
      </span>
    </Link>
  );
}

export function TaoMonLaeCredit({ inverse = false }: { inverse?: boolean }) {
  return (
    <p className={`text-center text-xs font-semibold tracking-wide ${inverse ? 'text-white/60' : 'text-slate-500 dark:text-slate-400'}`}>
      Developed by{' '}
      <a
        href="https://github.com/TaoMonLae"
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 font-black underline-offset-4 transition hover:underline ${
          inverse ? 'text-white' : 'text-[var(--lq-signal-blue)] dark:text-sky-300'
        }`}
        aria-label="Tao Mon Lae on GitHub"
      >
        Tao Mon Lae <Github className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </p>
  );
}
