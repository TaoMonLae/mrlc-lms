import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { apiGet, apiSend } from '../../lib/api';
import { useAuth } from '../../providers/AuthProvider';
import { MathText } from '@/src/components/MathText';
import {
  DeckGate, DeckShell, ProgressRule, StatePanel, TallyMarks,
  masteryCounts, pad2, shuffle, useDeck, useDeckRoutes, useReducedMotion,
  type DeckDetail, type FlashCard, type MasteryMap,
} from './shared';

type RegisterFilter = 'ALL' | 'LEARNING' | 'KNOWN';

export default function StudentFlashcardStudy() {
  const { id } = useParams<{ id: string }>();
  const routes = useDeckRoutes(id);
  const { deck, status, reload } = useDeck(id);
  return (
    <DeckGate status={status} deck={deck} reload={reload} listUrl={routes.list}>
      {(loaded) => <StudyRegister key={loaded.id} deck={loaded} routes={routes} />}
    </DeckGate>
  );
}

function StudyRegister({ deck, routes }: { deck: DeckDetail; routes: ReturnType<typeof useDeckRoutes> }) {
  const { user } = useAuth();
  // Mastery belongs to a student; a teacher previewing their own deck has none.
  const isStudent = user?.role === 'STUDENT';
  const reducedMotion = useReducedMotion();
  const [order, setOrder] = useState<FlashCard[]>(deck.cards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mastery, setMastery] = useState<MasteryMap>({});
  const [onlyLearning, setOnlyLearning] = useState(false);
  const [savingMastery, setSavingMastery] = useState(false);
  const [filter, setFilter] = useState<RegisterFilter>('ALL');
  const stageRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isStudent) return;
    apiGet<MasteryMap>(`/api/flashcards/decks/${deck.id}/mastery`)
      .then((m) => setMastery(m || {}))
      .catch(() => toast.error('Your saved progress could not be loaded'));
  }, [deck.id, isStudent]);

  const current = order[index];
  const counts = useMemo(() => masteryCounts(deck.cards, mastery), [deck.cards, mastery]);
  const deckNumber = useMemo(() => new Map(deck.cards.map((card, i) => [card.id, i + 1])), [deck.cards]);

  const move = (delta: number) => {
    setFlipped(false);
    setIndex((i) => Math.min(Math.max(i + delta, 0), Math.max(order.length - 1, 0)));
  };
  const cardsFor = (learningOnly: boolean) => (learningOnly ? deck.cards.filter((c) => mastery[c.id] !== 'KNOWN') : deck.cards);
  const reshuffle = () => { setFlipped(false); setIndex(0); setOrder((prev) => shuffle(prev)); };
  const restartInOrder = () => { setFlipped(false); setIndex(0); setOrder(cardsFor(onlyLearning)); };
  const toggleOnlyLearning = () => {
    const next = !onlyLearning;
    setOnlyLearning(next);
    setFlipped(false);
    setIndex(0);
    setOrder(cardsFor(next));
  };
  const jumpTo = (cardId: string) => {
    let position = order.findIndex((c) => c.id === cardId);
    if (position < 0) {
      setOnlyLearning(false);
      setOrder(deck.cards);
      position = deck.cards.findIndex((c) => c.id === cardId);
    }
    setFlipped(false);
    setIndex(Math.max(position, 0));
    stageRef.current?.focus({ preventScroll: true });
    stageRef.current?.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  const markMastery = async (state: 'KNOWN' | 'LEARNING') => {
    if (!current || savingMastery) return;
    const cardId = current.id;
    const previous = mastery[cardId];
    setSavingMastery(true);
    setMastery((prev) => ({ ...prev, [cardId]: state }));
    try {
      await apiSend(`/api/flashcards/cards/${cardId}/mastery`, 'PUT', { status: state });
    } catch {
      setMastery((prev) => {
        const next = { ...prev };
        if (previous) next[cardId] = previous; else delete next[cardId];
        return next;
      });
      toast.error('Your mark could not be saved. Check your connection and try again.');
      return;
    } finally {
      setSavingMastery(false);
    }
    if (onlyLearning && state === 'KNOWN') {
      setFlipped(false);
      setOrder((prev) => {
        const next = prev.filter((card) => card.id !== cardId);
        setIndex((i) => Math.min(i, Math.max(0, next.length - 1)));
        return next;
      });
    } else if (index < order.length - 1) {
      move(1);
    }
  };

  // Space/Enter flips, arrows move. Typing in a field or using a control is left alone.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!order.length || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const onStage = target === stageRef.current;
      if (!onStage && target?.closest('button, a, input, textarea, select, [role="tab"], [contenteditable="true"]')) return;
      if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); setFlipped((v) => !v); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.length]);

  const registerRows = deck.cards.filter((card) => {
    if (filter === 'ALL') return true;
    if (filter === 'KNOWN') return mastery[card.id] === 'KNOWN';
    return mastery[card.id] !== 'KNOWN';
  });

  const masteryAside = isStudent && deck.cards.length > 0 ? (
    <div className="w-full max-w-[17rem] sm:w-auto">
      <TallyMarks total={deck.cards.length} known={counts.known} learning={counts.learning} />
      <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
        <span className="font-semibold text-foreground">{counts.known}</span> known · {counts.learning} still learning · {counts.fresh} new
      </p>
    </div>
  ) : undefined;

  return (
    <DeckShell deck={deck} routes={routes} aside={masteryAside}>
      {deck.cards.length === 0 ? (
        <StatePanel title="This deck has no cards yet" body="When your teacher adds cards, they'll appear here." />
      ) : order.length === 0 ? (
        <StatePanel
          title="You know every card in this deck"
          body="Take the quiz to check, or study the whole deck again."
          action={<Button variant="outline" onClick={toggleOnlyLearning}>Study all cards</Button>}
        />
      ) : (
        <section aria-label="Study cards">
          {/* The stage: an index card with its number in the ledger margin. */}
          <div className="grid grid-cols-[3rem_minmax(0,1fr)] border border-border bg-card sm:grid-cols-[4.5rem_minmax(0,1fr)]">
            <div className="flex flex-col items-center border-r border-academic-coral/60 py-5" aria-hidden="true">
              <span className="text-xl font-semibold tabular-nums tracking-tight text-foreground sm:text-2xl">{pad2(deckNumber.get(current.id) ?? index + 1)}</span>
              {isStudent && mastery[current.id] && (
                <span className={`mt-2 block h-4 w-[3px] ${mastery[current.id] === 'KNOWN' ? 'bg-academic-teal' : 'bg-academic-coral'}`} />
              )}
            </div>
            <button
              ref={stageRef}
              type="button"
              onClick={() => setFlipped((f) => !f)}
              aria-describedby="stage-hint"
              className="group relative min-h-[18rem] w-full text-left outline-none [perspective:1400px] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 sm:min-h-[20rem]"
            >
              <span className="sr-only">{flipped ? 'Showing the definition. Press to show the term.' : 'Showing the term. Press to show the definition.'}</span>
              <div
                className={`relative h-full min-h-[inherit] w-full [transform-style:preserve-3d] ${reducedMotion ? '' : 'transition-transform duration-300 ease-out'}`}
                style={{ transform: flipped && !reducedMotion ? 'rotateY(180deg)' : undefined }}
              >
                <Face side="Term" hidden={flipped} reducedMotion={reducedMotion}>
                  {current.imageUrl && <img src={current.imageUrl} alt="" className="max-h-36 w-auto object-contain" />}
                  <p className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl [overflow-wrap:anywhere]"><MathText>{current.term}</MathText></p>
                </Face>
                <Face side="Definition" hidden={!flipped} back reducedMotion={reducedMotion}>
                  <p className="max-w-[60ch] text-lg leading-relaxed text-foreground sm:text-xl [overflow-wrap:anywhere]"><MathText>{current.definition}</MathText></p>
                </Face>
              </div>
            </button>
          </div>

          {/* One control bar: navigation, order, and the student's tally. */}
          <div className="flex flex-wrap items-center gap-2 border-x border-b border-border bg-card px-2 py-2 sm:px-3">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="Previous card" onClick={() => move(-1)} disabled={index === 0}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="min-w-[4.5rem] text-center text-sm font-semibold tabular-nums text-foreground" aria-live="polite">
                {index + 1} / {order.length}
              </span>
              <Button variant="ghost" size="icon" aria-label="Next card" onClick={() => move(1)} disabled={index === order.length - 1}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex items-center gap-1 border-l border-border pl-2">
              <Button variant="ghost" size="icon" aria-label="Shuffle cards" title="Shuffle cards" onClick={reshuffle}>
                <Shuffle className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Restart in deck order" title="Restart in deck order" onClick={restartInOrder}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
            {isStudent && (
              <div className="ml-auto flex w-full gap-2 sm:w-auto">
                <TallyButton tone="learning" pressed={mastery[current.id] === 'LEARNING'} count={counts.learning} disabled={savingMastery} onClick={() => markMastery('LEARNING')}>
                  Still learning
                </TallyButton>
                <TallyButton tone="known" pressed={mastery[current.id] === 'KNOWN'} count={counts.known} disabled={savingMastery} onClick={() => markMastery('KNOWN')}>
                  Know it
                </TallyButton>
              </div>
            )}
          </div>
          <ProgressRule value={index + 1} max={order.length} label="Cards studied this round" />
          <p id="stage-hint" className="mt-2 text-xs text-muted-foreground">
            Tap the card or press Space to flip. Use the arrow keys to move between cards.
          </p>
          {isStudent && counts.known > 0 && (
            <label className="mt-3 inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm text-foreground">
              <input type="checkbox" className="h-4 w-4 accent-[var(--color-academic-teal)]" checked={onlyLearning} onChange={toggleOnlyLearning} />
              Skip cards I know
            </label>
          )}
        </section>
      )}

      {deck.cards.length > 0 && (
        <section className="mt-10" aria-labelledby="register-heading">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-foreground pb-2">
            <h2 id="register-heading" className="text-lg font-semibold tracking-tight text-foreground">All cards</h2>
            {isStudent && (
              <div role="radiogroup" aria-label="Show cards" className="flex border border-border bg-card">
                {([['ALL', `All ${deck.cards.length}`], ['LEARNING', `Not known ${deck.cards.length - counts.known}`], ['KNOWN', `Known ${counts.known}`]] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={filter === value}
                    onClick={() => setFilter(value)}
                    className={`min-h-9 border-r border-border px-3 text-sm font-medium tabular-nums last:border-r-0 ${filter === value ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {registerRows.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">{filter === 'KNOWN' ? 'No cards marked as known yet.' : 'Nothing left to learn here.'}</p>
          ) : (
            <ol className="divide-y divide-border border-b border-border bg-card">
              {registerRows.map((card) => {
                const state = mastery[card.id];
                const isCurrent = card.id === current?.id;
                return (
                  <li key={card.id}>
                    <button
                      type="button"
                      onClick={() => jumpTo(card.id)}
                      aria-current={isCurrent ? 'true' : undefined}
                      className={`grid w-full grid-cols-[3rem_minmax(0,1fr)] gap-y-1 py-3 pr-4 text-left transition-colors hover:bg-accent/40 sm:grid-cols-[4.5rem_minmax(0,14rem)_minmax(0,1fr)_6.5rem] sm:items-baseline ${isCurrent ? 'bg-accent/50' : ''}`}
                    >
                      <span className="row-span-2 flex items-start justify-center gap-1.5 pt-0.5 text-sm font-semibold tabular-nums text-muted-foreground sm:row-span-1">
                        {pad2(deckNumber.get(card.id) ?? 0)}
                      </span>
                      <span className="font-semibold text-foreground [overflow-wrap:anywhere]"><MathText>{card.term}</MathText></span>
                      <span className="text-sm text-muted-foreground [overflow-wrap:anywhere] sm:pl-4"><MathText>{card.definition}</MathText></span>
                      {isStudent && (
                        <span className="col-start-2 flex items-center gap-1.5 text-xs font-medium sm:col-start-auto sm:justify-end">
                          <span aria-hidden="true" className={`block h-3.5 w-[3px] ${state === 'KNOWN' ? 'bg-academic-teal' : state === 'LEARNING' ? 'bg-academic-coral' : 'bg-border'}`} />
                          <span className={state === 'KNOWN' ? 'text-accent-foreground' : state === 'LEARNING' ? 'text-foreground' : 'text-muted-foreground'}>
                            {state === 'KNOWN' ? 'Known' : state === 'LEARNING' ? 'Still learning' : 'New'}
                          </span>
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      )}
    </DeckShell>
  );
}

function Face({
  side, hidden, back = false, reducedMotion, children,
}: { side: string; hidden: boolean; back?: boolean; reducedMotion: boolean; children: React.ReactNode }) {
  // With reduced motion the faces swap in place; otherwise they turn.
  if (reducedMotion && hidden) return null;
  return (
    <div
      aria-hidden={hidden}
      className={`flex min-h-[inherit] w-full flex-col items-center justify-center gap-4 px-6 py-10 text-center sm:px-10 ${reducedMotion ? '' : 'absolute inset-0 overflow-y-auto [backface-visibility:hidden]'}`}
      style={!reducedMotion && back ? { transform: 'rotateY(180deg)' } : undefined}
    >
      <span className="absolute left-4 top-3 text-xs font-medium text-muted-foreground">{side}</span>
      {children}
    </div>
  );
}

function TallyButton({
  tone, pressed, count, disabled, onClick, children,
}: { tone: 'known' | 'learning'; pressed: boolean; count: number; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  const mark = tone === 'known' ? 'bg-academic-teal' : 'bg-academic-coral';
  const pressedStyle = tone === 'known'
    ? 'border-academic-teal bg-accent text-accent-foreground'
    : 'border-academic-coral bg-academic-coral/12 text-foreground';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 border px-3.5 text-sm font-semibold transition-colors disabled:opacity-60 sm:flex-none ${pressed ? pressedStyle : 'border-input bg-card text-foreground hover:bg-muted'}`}
    >
      <span aria-hidden="true" className={`block h-4 w-[3px] ${mark}`} />
      {children}
      <span className="tabular-nums text-muted-foreground" aria-label={`${count} cards`}>{count}</span>
    </button>
  );
}
