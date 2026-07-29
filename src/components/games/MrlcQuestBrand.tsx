import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

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
      aria-label="MRLC Language Quest home"
    >
      <span className={`relative grid shrink-0 place-items-center rounded-2xl bg-white shadow-lg ring-1 ring-black/5 transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105 ${compact ? 'h-10 w-10 p-1' : 'h-12 w-12 p-1.5'}`}>
        <img src="/icon-192.png" alt="MRLC logo" className="h-full w-full object-contain" />
        <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-amber-400 text-white shadow-sm">
          <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
        </span>
      </span>
      <span className={`min-w-0 leading-tight ${compact ? 'max-[430px]:hidden' : ''}`}>
        <span className={`block text-[10px] font-black uppercase tracking-[0.2em] ${inverse ? 'text-white/65' : 'text-violet-600'}`}>MRLC</span>
        <span className={`block truncate font-black tracking-[-0.025em] ${compact ? 'text-base' : 'text-lg'} ${inverse ? 'text-white' : 'text-slate-950 dark:text-white'}`}>Language Quest</span>
      </span>
    </Link>
  );
}

export function TaoMonLaeCredit({ inverse = false }: { inverse?: boolean }) {
  return (
    <p className={`text-center text-xs font-semibold tracking-wide ${inverse ? 'text-white/60' : 'text-slate-500 dark:text-slate-400'}`}>
      Developed by <span className={inverse ? 'font-black text-white' : 'font-black text-violet-700 dark:text-violet-300'}>Tao Mon Lae</span>
    </p>
  );
}
