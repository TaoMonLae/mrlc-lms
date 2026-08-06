import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle2, Grid3x3, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CATEGORY_LABELS,
  PERIODIC_ELEMENTS,
  randomElements,
  type PeriodicElement,
} from '@/shared/periodicTable';

const ROUND_LENGTH = 10;

type QuestionKind = 'symbol' | 'name' | 'number' | 'category';

interface Question {
  kind: QuestionKind;
  element: PeriodicElement;
  prompt: string;
  options: string[];
  correctIndex: number;
}

function optionsFor(kind: QuestionKind, element: PeriodicElement): { prompt: string; options: string[]; correctIndex: number } {
  const distractors = randomElements(3, new Set([element.number]));
  if (kind === 'symbol') {
    const options = [element.symbol, ...distractors.map((d) => d.symbol)];
    const shuffled = shuffleWithAnswer(options, element.symbol);
    return { prompt: `What is the chemical symbol for ${element.name}?`, ...shuffled };
  }
  if (kind === 'name') {
    const options = [element.name, ...distractors.map((d) => d.name)];
    const shuffled = shuffleWithAnswer(options, element.name);
    return { prompt: `Which element has the symbol "${element.symbol}"?`, ...shuffled };
  }
  if (kind === 'number') {
    const options = [element.number, ...distractors.map((d) => d.number)].map(String);
    const shuffled = shuffleWithAnswer(options, String(element.number));
    return { prompt: `What is the atomic number of ${element.name}?`, ...shuffled };
  }
  const categoryPool = Array.from(new Set(PERIODIC_ELEMENTS.map((e) => e.category))).filter((c) => c !== element.category);
  const wrongLabels = categoryPool
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((c) => CATEGORY_LABELS[c]);
  const options = [CATEGORY_LABELS[element.category], ...wrongLabels];
  const shuffled = shuffleWithAnswer(options, CATEGORY_LABELS[element.category]);
  return { prompt: `Which category does ${element.name} belong to?`, ...shuffled };
}

function shuffleWithAnswer(options: string[], answer: string): { options: string[]; correctIndex: number } {
  const shuffled = [...options].sort(() => Math.random() - 0.5);
  return { options: shuffled, correctIndex: shuffled.indexOf(answer) };
}

function buildRound(): Question[] {
  const kinds: QuestionKind[] = ['symbol', 'name', 'number', 'category'];
  const elements = randomElements(ROUND_LENGTH);
  return elements.map((element) => {
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const { prompt, options, correctIndex } = optionsFor(kind, element);
    return { kind, element, prompt, options, correctIndex };
  });
}

export default function ElementQuizPage() {
  const navigate = useNavigate();
  const [round, setRound] = useState<Question[]>(() => buildRound());
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const question = round[index];
  const finished = index >= round.length;

  const answer = (optionIndex: number) => {
    if (selected != null) return;
    setSelected(optionIndex);
    const correct = optionIndex === question.correctIndex;
    if (correct) {
      setScore((value) => value + 1);
      setStreak((value) => {
        const next = value + 1;
        setBestStreak((best) => Math.max(best, next));
        return next;
      });
    } else {
      setStreak(0);
    }
  };

  const next = () => {
    setSelected(null);
    setIndex((value) => value + 1);
  };

  const playAgain = () => {
    setRound(buildRound());
    setIndex(0);
    setSelected(null);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
  };

  const optionLetters = useMemo(() => ['A', 'B', 'C', 'D'], []);

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Grid3x3 className="size-6" />
          Element Quiz
        </h1>
        <Button variant="outline" onClick={() => navigate('/games/periodic-table')}>{'◀ Back'}</Button>
      </div>

      {!finished ? (
        <>
          <div className="mb-4 flex items-center gap-4">
            <Progress value={(index / round.length) * 100} className="flex-1" />
            <span className="shrink-0 text-sm font-bold text-slate-500">{index + 1} / {round.length}</span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-surface-raised dark:bg-surface-indigo">
            <p className="text-xs font-black uppercase tracking-wide text-violet-600 dark:text-violet-300">Score {score} &middot; Streak {streak}</p>
            <h2 className="mt-2 text-xl font-black text-slate-900 dark:text-white">{question.prompt}</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {question.options.map((option, optionIndex) => {
                const isCorrect = selected != null && optionIndex === question.correctIndex;
                const isWrong = selected === optionIndex && optionIndex !== question.correctIndex;
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={selected != null}
                    onClick={() => answer(optionIndex)}
                    className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left font-semibold transition ${
                      isCorrect
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                        : isWrong
                          ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/10'
                          : 'border-slate-200 bg-white hover:border-violet-300 hover:-translate-y-0.5 dark:border-surface-raised dark:bg-surface-indigo'
                    }`}
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-black text-slate-500 dark:bg-surface-raised dark:text-slate-300">{optionLetters[optionIndex]}</span>
                    <span className="min-w-0 flex-1 text-slate-800 dark:text-white">{option}</span>
                    {isCorrect && <CheckCircle2 className="size-5 text-emerald-600" />}
                    {isWrong && <XCircle className="size-5 text-rose-600" />}
                  </button>
                );
              })}
            </div>
            {selected != null && (
              <Button className="mt-6 w-full" onClick={next}>
                {index + 1 === round.length ? 'See results' : 'Next question'}
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-surface-raised dark:bg-surface-indigo">
          <p className="text-xs font-black uppercase tracking-wide text-violet-600 dark:text-violet-300">Round complete</p>
          <p className="mt-3 text-4xl font-black text-slate-900 dark:text-white">{score} / {round.length}</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">Best streak: {bestStreak}</p>
          <Button className="mt-6" onClick={playAgain}>Play again</Button>
        </div>
      )}
    </div>
  );
}
