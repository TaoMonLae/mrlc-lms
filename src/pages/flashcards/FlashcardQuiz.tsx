import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiGet, apiSend } from '../../lib/api';
import { MathText } from '@/src/components/MathText';
import {
  DeckGate, DeckShell, ModeIntro, ProgressRule, ResultSummary, StatePanel,
  normalizeAnswer, percent, shuffle, useDeck, useDeckRoutes,
  type DeckDetail, type FlashCard,
} from './shared';

type QType = 'MC' | 'TF' | 'FILL';

interface Question {
  cardId: string;
  type: QType;
  term: string;
  definition: string;
  imageUrl?: string | null;
  candidateDefinition?: string; // True/False: the definition being judged
  isMatchTrue?: boolean;        // True/False: whether it belongs to the term
  choices?: string[];           // Multiple choice: shuffled definitions
}
interface AnsweredRecord { type: QType; term: string; correct: string; picked: string; isCorrect: boolean }

const TYPE_OPTIONS: { key: QType; label: string; desc: string }[] = [
  { key: 'MC', label: 'Multiple choice', desc: 'Pick the right definition from up to four.' },
  { key: 'TF', label: 'True or false', desc: 'Decide whether a definition belongs to the term.' },
  { key: 'FILL', label: 'Write the term', desc: 'Read the definition and type the term.' },
];

function correctAnswerFor(q: Question): string {
  if (q.type === 'MC') return q.definition;
  if (q.type === 'TF') return q.isMatchTrue ? 'True' : 'False';
  return q.term;
}

function buildQuestions(cards: FlashCard[], types: QType[]): Question[] {
  return shuffle(cards).map((card) => {
    const otherDefinitions = Array.from(new Set(
      cards.filter((c) => c.id !== card.id && c.definition !== card.definition).map((c) => c.definition),
    ));
    const viable = types.filter((t) => t === 'FILL' || otherDefinitions.length > 0);
    const type = viable[Math.floor(Math.random() * viable.length)] ?? 'FILL';
    if (type === 'MC') {
      return { cardId: card.id, type, term: card.term, definition: card.definition, imageUrl: card.imageUrl,
        choices: shuffle([card.definition, ...shuffle(otherDefinitions).slice(0, 3)]) };
    }
    if (type === 'TF') {
      const isMatchTrue = Math.random() < 0.5;
      return { cardId: card.id, type, term: card.term, definition: card.definition, imageUrl: card.imageUrl,
        candidateDefinition: isMatchTrue ? card.definition : otherDefinitions[Math.floor(Math.random() * otherDefinitions.length)],
        isMatchTrue, choices: ['True', 'False'] };
    }
    return { cardId: card.id, type: 'FILL', term: card.term, definition: card.definition, imageUrl: card.imageUrl };
  });
}

export default function FlashcardQuiz() {
  const { id } = useParams<{ id: string }>();
  const routes = useDeckRoutes(id);
  const { deck, status, reload } = useDeck(id);
  return (
    <DeckGate status={status} deck={deck} reload={reload} listUrl={routes.list}>
      {(loaded) => (
        <DeckShell deck={loaded} routes={routes}>
          {loaded.cards.length < 2
            ? <StatePanel title="Quiz needs at least 2 cards" body="Add more cards to this deck, or study it with flashcards for now." />
            : <Quiz key={loaded.id} deck={loaded} routes={routes} />}
        </DeckShell>
      )}
    </DeckGate>
  );
}

function Quiz({ deck, routes }: { deck: DeckDetail; routes: ReturnType<typeof useDeckRoutes> }) {
  const [enabledTypes, setEnabledTypes] = useState<QType[]>(['MC', 'TF', 'FILL']);
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState<{ value: string; isCorrect: boolean } | null>(null);
  const [draft, setDraft] = useState('');
  const [answers, setAnswers] = useState<AnsweredRecord[]>([]);
  const [finished, setFinished] = useState(false);
  const [best, setBest] = useState<{ score: number; total: number } | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const loadBest = () => {
    apiGet<{ bestByMode: Record<string, { score: number; total: number }> }>(`/api/flashcards/decks/${deck.id}/attempts`)
      .then((r) => setBest(r?.bestByMode?.QUIZ ? { score: r.bestByMode.QUIZ.score, total: r.bestByMode.QUIZ.total } : null))
      .catch(() => {});
  };
  useEffect(() => { if (routes.isStudentRoute) loadBest(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [deck.id]);

  const toggleType = (t: QType) =>
    setEnabledTypes((prev) => (prev.includes(t) ? (prev.length > 1 ? prev.filter((x) => x !== t) : prev) : [...prev, t]));

  const start = () => {
    setQuestions(buildQuestions(deck.cards, enabledTypes));
    setIndex(0); setAnswered(null); setDraft(''); setAnswers([]); setFinished(false);
    setStarted(true);
    startedAtRef.current = Date.now();
  };

  const current = questions[index];
  const score = useMemo(() => answers.filter((a) => a.isCorrect).length, [answers]);

  const record = (value: string) => {
    if (answered || !current) return;
    const correct = correctAnswerFor(current);
    const isCorrect = current.type === 'FILL' ? normalizeAnswer(value) === normalizeAnswer(correct) : value === correct;
    setAnswered({ value, isCorrect });
    setAnswers((prev) => [...prev, { type: current.type, term: current.term, correct, picked: value, isCorrect }]);
    requestAnimationFrame(() => nextRef.current?.focus());
  };

  const next = () => {
    setAnswered(null); setDraft('');
    if (index + 1 >= questions.length) {
      setFinished(true);
      requestAnimationFrame(() => resultRef.current?.querySelector<HTMLElement>('#result-heading')?.focus());
      if (routes.isStudentRoute) {
        const durationMs = startedAtRef.current ? Date.now() - startedAtRef.current : null;
        apiSend(`/api/flashcards/decks/${deck.id}/attempts`, 'POST', { mode: 'QUIZ', score: answers.filter((a) => a.isCorrect).length, total: questions.length, durationMs })
          .then(loadBest)
          .catch(() => toast.error('Your quiz result could not be saved'));
      }
      return;
    }
    setIndex((i) => i + 1);
  };

  // Number keys pick an answer; Enter moves on once answered.
  useEffect(() => {
    if (!started || finished || !current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea')) return;
      const n = Number(e.key);
      if (!answered && current.choices && n >= 1 && n <= current.choices.length) { e.preventDefault(); record(current.choices[n - 1]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, finished, current, answered]);

  if (!started) {
    return (
      <ModeIntro title="Quiz yourself" action={<Button size="lg" onClick={start} className="w-full sm:w-auto">Start quiz · {deck.cards.length} questions</Button>}>
        <p className="text-sm text-muted-foreground">Every card becomes one question, using a type you choose below.</p>
        <fieldset>
          <legend className="text-sm font-semibold text-foreground">Question types</legend>
          <div className="mt-2 divide-y divide-border border border-border">
            {TYPE_OPTIONS.map((opt) => (
              <label key={opt.key} className="flex min-h-12 cursor-pointer items-start gap-3 px-4 py-3 hover:bg-muted/40">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-[var(--color-academic-teal)]"
                  checked={enabledTypes.includes(opt.key)}
                  onChange={() => toggleType(opt.key)}
                  disabled={enabledTypes.length === 1 && enabledTypes.includes(opt.key)}
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">{opt.label}</span>
                  <span className="block text-sm text-muted-foreground">{opt.desc}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">At least one type stays selected.</p>
        </fieldset>
        {best && <p className="text-sm text-muted-foreground">Your best: <span className="font-semibold tabular-nums text-foreground">{best.score} / {best.total}</span> ({percent(best.score, best.total)}%)</p>}
      </ModeIntro>
    );
  }

  if (finished) {
    const missed = answers.filter((a) => !a.isCorrect).map((a) => ({ term: a.term, given: a.picked, correct: a.correct }));
    return (
      <div ref={resultRef}>
        <ResultSummary
          heading={score === questions.length ? 'Every answer right.' : `${score} of ${questions.length} right.`}
          stats={[
            { label: 'Score', value: `${percent(score, questions.length)}%`, strong: true },
            { label: 'Correct', value: String(score) },
            { label: 'To review', value: String(questions.length - score) },
            { label: 'Your best', value: best ? `${percent(best.score, best.total)}%` : '—' },
          ]}
          missed={missed}
          missedTitle="Questions to review"
          actions={<>
            <Button onClick={start}>Take the quiz again</Button>
            <Button variant="outline" onClick={() => setStarted(false)}>Change question types</Button>
            <Button variant="ghost" render={<Link to={routes.study} />} nativeButton={false}>Back to the cards</Button>
          </>}
        />
      </div>
    );
  }

  if (!current) return null;
  const correctValue = correctAnswerFor(current);

  return (
    <section aria-label={`Question ${index + 1} of ${questions.length}`}>
      <div className="flex items-center justify-between pb-2 text-sm">
        <span className="font-semibold tabular-nums text-foreground">Question {index + 1} of {questions.length}</span>
        <span className="tabular-nums text-muted-foreground">{score} right so far</span>
      </div>
      <ProgressRule value={index} max={questions.length} label="Quiz progress" />

      <div className="mt-4 border border-border bg-card">
        <div className="border-b border-border px-5 py-5 sm:px-8 sm:py-7">
          <p className="text-xs font-medium text-muted-foreground">
            {current.type === 'MC' ? 'Choose the definition' : current.type === 'TF' ? 'Does this definition belong to the term?' : 'Write the term for this definition'}
          </p>
          {current.imageUrl && current.type !== 'FILL' && <img src={current.imageUrl} alt="" className="mt-4 max-h-32 w-auto object-contain" />}
          {current.type === 'FILL'
            ? <p className="mt-2 text-lg leading-relaxed text-foreground [overflow-wrap:anywhere]"><MathText>{current.definition}</MathText></p>
            : <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground [overflow-wrap:anywhere]"><MathText>{current.term}</MathText></p>}
          {current.type === 'TF' && (
            <p className="mt-4 border border-border bg-background px-4 py-3 text-base leading-relaxed text-foreground [overflow-wrap:anywhere]"><MathText>{current.candidateDefinition ?? ''}</MathText></p>
          )}
        </div>

        <div className="px-5 py-5 sm:px-8">
          {current.choices ? (
            <div className={current.type === 'TF' ? 'grid grid-cols-2 gap-2' : 'grid gap-2'} role="group" aria-label="Answers">
              {current.choices.map((choice, i) => {
                const isPicked = answered?.value === choice;
                const isRight = choice === correctValue;
                const state = !answered ? 'idle' : isRight ? 'right' : isPicked ? 'wrong' : 'dim';
                return (
                  <button
                    key={`${i}-${choice}`}
                    type="button"
                    onClick={() => record(choice)}
                    disabled={!!answered}
                    aria-keyshortcuts={String(i + 1)}
                    className={`group flex min-h-12 w-full items-start gap-3 border px-4 py-3 text-left text-sm transition-colors ${
                      state === 'right' ? 'border-academic-teal bg-accent text-accent-foreground' :
                      state === 'wrong' ? 'border-destructive bg-destructive/10 text-foreground' :
                      state === 'dim' ? 'border-border text-muted-foreground' :
                      'border-input bg-card text-foreground hover:border-foreground'
                    }`}
                  >
                    <span aria-hidden="true" className={`grid h-6 w-6 shrink-0 place-items-center border text-xs font-semibold tabular-nums ${state === 'idle' ? 'border-input text-muted-foreground group-hover:border-foreground group-hover:text-foreground' : 'border-current'}`}>
                      {state === 'right' ? <Check className="h-3.5 w-3.5" /> : state === 'wrong' ? <X className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1 pt-0.5 [overflow-wrap:anywhere]"><MathText>{choice}</MathText></span>
                    {state === 'right' && <span className="sr-only">(correct answer)</span>}
                    {state === 'wrong' && <span className="sr-only">(your answer, incorrect)</span>}
                  </button>
                );
              })}
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (answered) next(); else if (draft.trim()) record(draft); }}>
              <label htmlFor="quiz-answer" className="text-sm font-medium text-foreground">Your answer</label>
              <Input
                id="quiz-answer"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type the term"
                readOnly={!!answered}
                aria-readonly={!!answered}
                autoComplete="off"
                autoFocus
                className={`mt-1.5 h-12 text-lg ${answered ? (answered.isCorrect ? 'border-academic-teal' : 'border-destructive') : ''}`}
              />
            </form>
          )}
          <p className="mt-3 min-h-5 text-sm font-medium" aria-live="assertive">
            {answered && (answered.isCorrect
              ? <span className="text-accent-foreground">Correct.</span>
              : <span className="text-destructive">Not quite. {current.type === 'FILL' ? `The term is “${current.term}”.` : current.type === 'TF' ? `The answer is ${correctValue}.` : 'The right definition is marked.'}</span>)}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 sm:px-8">
          <span className="hidden text-xs text-muted-foreground sm:block">{current.choices ? `Press 1–${current.choices.length} to answer` : 'Press Enter to check'}</span>
          {current.type === 'FILL' && !answered ? (
            <Button className="ml-auto" onClick={() => record(draft)} disabled={!draft.trim()}>Check answer</Button>
          ) : (
            <Button ref={nextRef} className="ml-auto" onClick={next} disabled={!answered}>
              {index + 1 >= questions.length ? 'See results' : 'Next question'}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
