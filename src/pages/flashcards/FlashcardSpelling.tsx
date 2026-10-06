import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Volume2 } from 'lucide-react';
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

const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

function speak(text: string) {
  if (!speechSupported) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
}

export default function FlashcardSpelling() {
  const { id } = useParams<{ id: string }>();
  const routes = useDeckRoutes(id);
  const { deck, status, reload } = useDeck(id);
  return (
    <DeckGate status={status} deck={deck} reload={reload} listUrl={routes.list}>
      {(loaded) => (
        <DeckShell deck={loaded} routes={routes}>
          {loaded.cards.length < 1
            ? <StatePanel title="This deck has no words to spell yet" />
            : <Spelling key={loaded.id} deck={loaded} routes={routes} />}
        </DeckShell>
      )}
    </DeckGate>
  );
}

function Spelling({ deck, routes }: { deck: DeckDetail; routes: ReturnType<typeof useDeckRoutes> }) {
  const [started, setStarted] = useState(false);
  const [readAloud, setReadAloud] = useState(speechSupported);
  const [order, setOrder] = useState<FlashCard[]>([]);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [checked, setChecked] = useState<{ correct: boolean } | null>(null);
  const [answers, setAnswers] = useState<{ term: string; typed: string; correct: boolean }[]>([]);
  const [finished, setFinished] = useState(false);
  const [best, setBest] = useState<{ score: number; total: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const startedAtRef = useRef<number | null>(null);

  const loadBest = () => {
    apiGet<{ bestByMode: Record<string, { score: number; total: number }> }>(`/api/flashcards/decks/${deck.id}/attempts`)
      .then((r) => setBest(r?.bestByMode?.SPELL ? { score: r.bestByMode.SPELL.score, total: r.bestByMode.SPELL.total } : null))
      .catch(() => {});
  };
  useEffect(() => { if (routes.isStudentRoute) loadBest(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [deck.id]);
  useEffect(() => () => { if (speechSupported) window.speechSynthesis.cancel(); }, []);

  const current = order[index];

  // A new word is read aloud once (when enabled) and the field takes focus.
  useEffect(() => {
    if (!started || finished || !current) return;
    if (readAloud) speak(current.term);
    inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, index, order]);

  const score = useMemo(() => answers.filter((a) => a.correct).length, [answers]);

  const start = () => {
    setOrder(shuffle(deck.cards));
    setIndex(0); setInput(''); setChecked(null); setAnswers([]); setFinished(false);
    setStarted(true);
    startedAtRef.current = Date.now();
  };

  const submit = () => {
    if (!current || checked || !input.trim()) return;
    const correct = normalizeAnswer(input) === normalizeAnswer(current.term);
    setChecked({ correct });
    setAnswers((prev) => [...prev, { term: current.term, typed: input, correct }]);
    requestAnimationFrame(() => nextRef.current?.focus());
  };

  const next = () => {
    setInput(''); setChecked(null);
    if (index + 1 >= order.length) {
      setFinished(true);
      requestAnimationFrame(() => resultRef.current?.querySelector<HTMLElement>('#result-heading')?.focus());
      if (routes.isStudentRoute) {
        const durationMs = startedAtRef.current ? Date.now() - startedAtRef.current : null;
        apiSend(`/api/flashcards/decks/${deck.id}/attempts`, 'POST', { mode: 'SPELL', score: answers.filter((a) => a.correct).length, total: order.length, durationMs })
          .then(loadBest)
          .catch(() => toast.error('Your spelling result could not be saved'));
      }
      return;
    }
    setIndex((i) => i + 1);
  };

  if (!started) {
    return (
      <ModeIntro title="Spell each term" action={<Button size="lg" onClick={start} className="w-full sm:w-auto">Start · {deck.cards.length} words</Button>}>
        <p className="text-sm text-muted-foreground">You'll see each definition{speechSupported ? ' and hear the word' : ''}. Type the term exactly; capital letters and extra spaces don't count against you.</p>
        {speechSupported ? (
          <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-foreground">
            <input type="checkbox" className="h-4 w-4 accent-[var(--color-academic-teal)]" checked={readAloud} onChange={(e) => setReadAloud(e.target.checked)} />
            Read each word aloud when it appears
          </label>
        ) : (
          <p className="text-sm text-muted-foreground">This browser can't read words aloud, so the definition is your clue.</p>
        )}
        {best && <p className="text-sm text-muted-foreground">Your best: <span className="font-semibold tabular-nums text-foreground">{best.score} / {best.total}</span> ({percent(best.score, best.total)}%)</p>}
      </ModeIntro>
    );
  }

  if (finished) {
    return (
      <div ref={resultRef}>
        <ResultSummary
          heading={score === answers.length ? 'Every word spelled right.' : `${score} of ${answers.length} spelled right.`}
          stats={[
            { label: 'Score', value: `${percent(score, answers.length)}%`, strong: true },
            { label: 'Correct', value: String(score) },
            { label: 'To practise', value: String(answers.length - score) },
            { label: 'Your best', value: best ? `${percent(best.score, best.total)}%` : '—' },
          ]}
          missed={answers.filter((a) => !a.correct).map((a) => ({ term: a.term, given: a.typed, correct: a.term }))}
          missedTitle="Words to practise"
          actions={<>
            <Button onClick={start}>Spell them again</Button>
            <Button variant="ghost" render={<Link to={routes.study} />} nativeButton={false}>Back to the cards</Button>
          </>}
        />
      </div>
    );
  }

  if (!current) return null;
  return (
    <section aria-label={`Word ${index + 1} of ${order.length}`}>
      <div className="flex items-center justify-between pb-2 text-sm">
        <span className="font-semibold tabular-nums text-foreground">Word {index + 1} of {order.length}</span>
        <span className="tabular-nums text-muted-foreground">{score} right so far</span>
      </div>
      <ProgressRule value={index} max={order.length} label="Spelling progress" />
      <div className="mt-4 border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border px-5 py-6 sm:flex-row sm:items-start sm:px-8">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">Definition</p>
            {current.imageUrl && <img src={current.imageUrl} alt="" className="mt-3 max-h-28 w-auto object-contain" />}
            <p className="mt-2 text-lg leading-relaxed text-foreground [overflow-wrap:anywhere]"><MathText>{current.definition}</MathText></p>
          </div>
          {speechSupported && (
            <Button variant="outline" onClick={() => speak(current.term)} className="shrink-0 self-start">
              <Volume2 className="h-4 w-4" aria-hidden="true" /> Hear the word
            </Button>
          )}
        </div>
        <form className="px-5 py-5 sm:px-8" onSubmit={(e) => { e.preventDefault(); if (checked) next(); else submit(); }}>
          <label htmlFor="spell-answer" className="text-sm font-medium text-foreground">Spelling</label>
          <Input
            id="spell-answer"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            readOnly={!!checked}
            aria-readonly={!!checked}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className={`mt-1.5 h-12 text-lg tracking-wide ${checked ? (checked.correct ? 'border-academic-teal bg-accent/40' : 'border-destructive bg-destructive/5') : ''}`}
          />
          <p className="mt-3 min-h-5 text-sm font-medium" aria-live="assertive">
            {checked && (checked.correct
              ? <span className="text-accent-foreground">Correct.</span>
              : <span className="text-destructive">Not quite. It's spelled “{current.term}”.</span>)}
          </p>
        </form>
        <div className="flex justify-end border-t border-border px-5 py-3 sm:px-8">
          {checked
            ? <Button ref={nextRef} onClick={next}>{index + 1 >= order.length ? 'See results' : 'Next word'}</Button>
            : <Button onClick={submit} disabled={!input.trim()}>Check spelling</Button>}
        </div>
      </div>
    </section>
  );
}
