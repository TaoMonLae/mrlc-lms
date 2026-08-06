import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Minus, Plus, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  electronShells,
  randomElements,
  typicalNeutronCount,
  type PeriodicElement,
} from '@/shared/periodicTable';

// Protons/electrons never exceed 118 (no known element goes higher), but
// neutrons can: the heaviest elements (Ts, Lv, Og...) need up to ~177
// neutrons, so a shared 130 cap made roughly a quarter of the periodic
// table (everything from francium up) mathematically impossible to build
// correctly. Each control now gets a ceiling that fits what it actually
// needs, with a little headroom.
const MAX_PROTON_ELECTRON = 118;
const MAX_NEUTRONS = 190;

function AtomDiagram({ protons, neutrons, electrons, maxShells }: { protons: number; neutrons: number; electrons: number; maxShells: number }) {
  const size = 320;
  const center = size / 2;
  const shells = electronShells(electrons);
  // Defends against the ring layout being too small if the learner briefly
  // adds more electrons than the target needs -- the rings simply expand
  // rather than letting dots spill past the outermost ring.
  const ringCount = Math.max(maxShells, shells.length);
  const ringGap = ringCount > 0 ? (center - 60) / ringCount : 0;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-64 w-64 sm:h-80 sm:w-80" aria-hidden="true">
      {Array.from({ length: ringCount }, (_, shellIndex) => {
        const radius = 40 + (shellIndex + 1) * ringGap;
        return <circle key={shellIndex} cx={center} cy={center} r={radius} fill="none" stroke="currentColor" strokeOpacity={0.2} strokeWidth={1.5} className="text-slate-400" />;
      })}
      {shells.map((count, shellIndex) => {
        const radius = 40 + (shellIndex + 1) * ringGap;
        return Array.from({ length: count }, (_, dotIndex) => {
          const angle = (dotIndex / count) * Math.PI * 2;
          const x = center + radius * Math.cos(angle);
          const y = center + radius * Math.sin(angle);
          return <circle key={`${shellIndex}-${dotIndex}`} cx={x} cy={y} r={5} className="fill-sky-500" />;
        });
      })}
      <circle cx={center} cy={center} r={34} className="fill-slate-800 dark:fill-slate-200" />
      <text x={center} y={center - 4} textAnchor="middle" className="fill-white text-[11px] font-black dark:fill-slate-900">{protons}p</text>
      <text x={center} y={center + 12} textAnchor="middle" className="fill-white text-[11px] font-black dark:fill-slate-900">{neutrons}n</text>
    </svg>
  );
}

function ParticleControl({ label, value, max, onChange, color }: { label: string; value: number; max: number; onChange: (next: number) => void; color: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-surface-raised">
      <div>
        <p className={`text-xs font-black uppercase tracking-wide ${color}`}>{label}</p>
        <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="icon" onClick={() => onChange(Math.max(0, value - 1))} aria-label={`Remove ${label.toLowerCase()}`}>
          <Minus className="size-4" />
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={() => onChange(Math.min(max, value + 1))} aria-label={`Add ${label.toLowerCase()}`}>
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export default function BuildAtomPage() {
  const navigate = useNavigate();
  const [target, setTarget] = useState<PeriodicElement>(() => randomElements(1)[0]);
  const [protons, setProtons] = useState(0);
  const [neutrons, setNeutrons] = useState(0);
  const [electrons, setElectrons] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

  const targetNeutrons = useMemo(() => typicalNeutronCount(target), [target]);
  const maxShells = useMemo(() => electronShells(target.number).length, [target]);

  // Real elements have more than one stable isotope, and the "typical"
  // neutron count here is derived from a rounded average atomic mass -- for
  // a handful of elements (bromine, gallium, copper, silver, antimony,
  // thallium, europium...) that rounds to a mass number no real isotope
  // actually has. Accepting neutrons within 1 of the typical count covers
  // every real stable isotope for those elements instead of demanding an
  // exact number that can be chemically impossible.
  const neutronsClose = Math.abs(neutrons - targetNeutrons) <= 1;

  const check = () => {
    const correct = protons === target.number && neutronsClose && electrons === target.number;
    setFeedback(correct ? 'correct' : 'incorrect');
    if (correct) setScore((value) => value + 1);
  };

  const nextElement = () => {
    setTarget(randomElements(1)[0]);
    setProtons(0);
    setNeutrons(0);
    setElectrons(0);
    setFeedback(null);
  };

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Zap className="size-6" />
          Build an Atom
        </h1>
        <Button variant="outline" onClick={() => navigate('/games/periodic-table')}>{'◀ Back'}</Button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-surface-raised dark:bg-surface-indigo">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-600 dark:text-emerald-300">Score {score}</p>
          <p className="text-sm font-bold text-slate-500">Build: <span className="text-slate-900 dark:text-white">{target.name} ({target.symbol})</span></p>
        </div>

        <AtomDiagram protons={protons} neutrons={neutrons} electrons={electrons} maxShells={maxShells} />

        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <ParticleControl label="Protons" value={protons} max={MAX_PROTON_ELECTRON} onChange={setProtons} color="text-rose-600 dark:text-rose-300" />
          <ParticleControl label="Neutrons" value={neutrons} max={MAX_NEUTRONS} onChange={setNeutrons} color="text-slate-500 dark:text-slate-300" />
          <ParticleControl label="Electrons" value={electrons} max={MAX_PROTON_ELECTRON} onChange={setElectrons} color="text-sky-600 dark:text-sky-300" />
        </div>

        {feedback === 'correct' && (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-center font-black text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            That's a neutral {target.name} atom!
          </div>
        )}
        {feedback === 'incorrect' && (
          <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            <p className="font-black">Not quite yet:</p>
            <ul className="mt-1 list-disc pl-5">
              {protons !== target.number && <li>Protons should equal the atomic number.</li>}
              {!neutronsClose && <li>Neutron count isn't close to a real isotope of this element.</li>}
              {electrons !== target.number && <li>A neutral atom needs electrons equal to protons.</li>}
            </ul>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Button className="flex-1" onClick={check}>Check atom</Button>
          {feedback === 'correct' && <Button className="flex-1" variant="outline" onClick={nextElement}>Next element</Button>}
        </div>
      </div>
    </div>
  );
}
