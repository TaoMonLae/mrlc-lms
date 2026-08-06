import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Atom, Blocks, Grid3x3, Timer, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { PeriodicTableGrid } from '@/src/components/games/periodic-table/PeriodicTableGrid';
import {
  CATEGORY_LABELS,
  CATEGORY_STYLES,
  electronShells,
  typicalNeutronCount,
  type ElementCategory,
  type PeriodicElement,
} from '@/shared/periodicTable';

const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS) as ElementCategory[];

const GAME_CARDS = [
  {
    to: '/games/periodic-table/quiz',
    icon: Grid3x3,
    title: 'Element Quiz',
    description: 'Multiple-choice questions on symbols, names, atomic numbers, and categories.',
    tone: 'from-sky-500 to-cyan-500',
  },
  {
    to: '/games/periodic-table/match',
    icon: Blocks,
    title: 'Element Match',
    description: 'Flip cards to match each element’s symbol with its name.',
    tone: 'from-violet-500 to-fuchsia-500',
  },
  {
    to: '/games/periodic-table/speed-tap',
    icon: Timer,
    title: 'Speed Tap',
    description: 'Tap every element in a category before the clock runs out.',
    tone: 'from-amber-500 to-orange-500',
  },
  {
    to: '/games/periodic-table/build-atom',
    icon: Zap,
    title: 'Build an Atom',
    description: 'Add protons, neutrons, and electrons to match a target element.',
    tone: 'from-emerald-500 to-teal-500',
  },
] as const;

function ElementDetailDialog({ element, onOpenChange }: { element: PeriodicElement | null; onOpenChange: (open: boolean) => void }) {
  if (!element) return null;
  const style = CATEGORY_STYLES[element.category];
  const electrons = element.number;
  const neutrons = typicalNeutronCount(element);
  const shells = electronShells(electrons);
  return (
    <Dialog open={Boolean(element)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className={`grid size-12 place-items-center rounded-xl border text-xl font-black ${style.bg} ${style.text} ${style.border}`}>
              {element.symbol}
            </span>
            {element.name}
          </DialogTitle>
          <DialogDescription>Atomic number {element.number} &middot; {CATEGORY_LABELS[element.category]}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-slate-200 p-3 dark:border-surface-raised">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Atomic mass</p>
            <p className="mt-1 font-black text-slate-900 dark:text-white">{element.mass}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3 dark:border-surface-raised">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Phase at room temp</p>
            <p className="mt-1 font-black capitalize text-slate-900 dark:text-white">{element.phase}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3 dark:border-surface-raised">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Period</p>
            <p className="mt-1 font-black text-slate-900 dark:text-white">{element.period}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3 dark:border-surface-raised">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Group</p>
            <p className="mt-1 font-black text-slate-900 dark:text-white">{element.group ?? '—'}</p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-surface-raised">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Protons / neutrons / electrons</p>
          <p className="mt-1 font-black text-slate-900 dark:text-white">{element.number} / {neutrons} / {electrons}</p>
          <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-400">Electron shells</p>
          <p className="mt-1 font-black text-slate-900 dark:text-white">{shells.join(', ')}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PeriodicTableHubPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<PeriodicElement | null>(null);

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Atom className="size-6" />
            Periodic Table
          </h1>
          <Button variant="outline" onClick={() => navigate(-1)}>{'◀ Back'}</Button>
        </div>
        <p className="text-muted-foreground">Explore all 118 elements, then practice with a game below. Tap any element for details.</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-surface-raised dark:bg-surface-indigo sm:p-5">
        <div className="min-w-[720px]">
          <PeriodicTableGrid onTileClick={setSelected} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {CATEGORY_ORDER.map((category) => {
          const style = CATEGORY_STYLES[category];
          return (
            <Badge key={category} variant="outline" className={`${style.bg} ${style.text} ${style.border}`}>
              {CATEGORY_LABELS[category]}
            </Badge>
          );
        })}
      </div>

      <h2 className="mt-10 text-lg font-bold">Play a game</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {GAME_CARDS.map(({ to, icon: Icon, title, description, tone }) => (
          <Link
            key={to}
            to={to}
            className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-surface-raised dark:bg-surface-indigo"
          >
            <div className={`flex items-center justify-center bg-gradient-to-br ${tone} p-6 text-white`}>
              <Icon className="size-9" />
            </div>
            <div className="p-4">
              <p className="font-black text-slate-900 dark:text-white">{title}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{description}</p>
            </div>
          </Link>
        ))}
      </div>

      <ElementDetailDialog element={selected} onOpenChange={(open) => { if (!open) setSelected(null); }} />
    </div>
  );
}
