import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PeriodicTableGrid, type ElementTileState } from '@/src/components/games/periodic-table/PeriodicTableGrid';
import { CATEGORY_LABELS, PERIODIC_ELEMENTS, type ElementCategory, type PeriodicElement } from '@/shared/periodicTable';

const GAME_SECONDS = 60;

interface Criterion {
  label: string;
  test: (element: PeriodicElement) => boolean;
}

function buildCriteria(): Criterion[] {
  const categoryCriteria: Criterion[] = (Object.keys(CATEGORY_LABELS) as ElementCategory[]).map((category) => ({
    label: `Tap every ${CATEGORY_LABELS[category]}`,
    test: (element) => element.category === category,
  }));
  const phaseCriteria: Criterion[] = [
    { label: 'Tap every element that is a gas at room temperature', test: (element) => element.phase === 'gas' },
    { label: 'Tap every element that is a solid at room temperature', test: (element) => element.phase === 'solid' },
  ];
  const periodCriteria: Criterion[] = [1, 2, 3, 4].map((period) => ({
    label: `Tap every Period ${period} element`,
    test: (element) => element.period === period && element.group != null,
  }));
  return [...categoryCriteria, ...phaseCriteria, ...periodCriteria];
}

function pickCriterion(all: Criterion[]): Criterion {
  return all[Math.floor(Math.random() * all.length)];
}

export default function SpeedTapPage() {
  const navigate = useNavigate();
  const criteria = useMemo(() => buildCriteria(), []);
  const [criterion, setCriterion] = useState<Criterion>(() => pickCriterion(criteria));
  const [found, setFound] = useState<Set<number>>(new Set());
  const [flash, setFlash] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [roundsCleared, setRoundsCleared] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(GAME_SECONDS);
  const [running, setRunning] = useState(true);
  const flashTimeout = useRef<number | null>(null);

  const targetNumbers = useMemo(
    () => new Set(PERIODIC_ELEMENTS.filter((element) => criterion.test(element)).map((element) => element.number)),
    [criterion],
  );

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          setRunning(false);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [running]);

  const nextRound = (bonus: number) => {
    setScore((value) => value + bonus);
    setRoundsCleared((value) => value + 1);
    setFound(new Set());
    setCriterion(pickCriterion(criteria));
  };

  const tap = (element: PeriodicElement) => {
    if (!running || found.has(element.number)) return;
    if (targetNumbers.has(element.number)) {
      const nextFound = new Set(found).add(element.number);
      setFound(nextFound);
      setScore((value) => value + 10);
      if (nextFound.size === targetNumbers.size) {
        window.setTimeout(() => nextRound(25), 300);
      }
    } else {
      setScore((value) => Math.max(0, value - 5));
      setFlash(element.number);
      if (flashTimeout.current) window.clearTimeout(flashTimeout.current);
      flashTimeout.current = window.setTimeout(() => setFlash(null), 250);
    }
  };

  const tileState = (element: PeriodicElement): ElementTileState => {
    if (found.has(element.number)) return 'correct';
    if (flash === element.number) return 'wrong';
    return 'default';
  };

  const playAgain = () => {
    setScore(0);
    setRoundsCleared(0);
    setSecondsLeft(GAME_SECONDS);
    setFound(new Set());
    setCriterion(pickCriterion(criteria));
    setRunning(true);
  };

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Timer className="size-6" />
          Speed Tap
        </h1>
        <Button variant="outline" onClick={() => navigate('/games/periodic-table')}>{'◀ Back'}</Button>
      </div>

      {running ? (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-500/10">
            <p className="font-black text-amber-900 dark:text-amber-200">{criterion.label}</p>
            <div className="flex items-center gap-4 text-sm font-bold text-amber-800 dark:text-amber-300">
              <span>Score {score}</span>
              <span>Rounds {roundsCleared}</span>
              <span>{secondsLeft}s left</span>
            </div>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-surface-raised dark:bg-surface-indigo sm:p-5">
            <div className="min-w-[720px]">
              <PeriodicTableGrid onTileClick={tap} tileState={tileState} />
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-surface-raised dark:bg-surface-indigo">
          <p className="text-xs font-black uppercase tracking-wide text-violet-600 dark:text-violet-300">Time's up</p>
          <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">{score} points</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">Rounds cleared: {roundsCleared}</p>
          <Button className="mt-6" onClick={playAgain}>Play again</Button>
        </div>
      )}
    </div>
  );
}
