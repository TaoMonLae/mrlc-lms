import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiGet } from '../../lib/api';
import { MathText } from '@/src/components/MathText';

/* ─────────────────────────────────────────────────────────────────────────────
   Flashcards: shared pieces for the index-card register.
   Every study mode sits in one DeckShell (title, author, mode tabs), and every
   place a card's state appears uses the same TallyMarks: teal = known,
   coral = still learning, rule = not yet marked.
   ──────────────────────────────────────────────────────────────────────────── */

export interface FlashCard { id: string; term: string; definition: string; imageUrl?: string | null }
export interface DeckDetail {
  id: string;
  title: string;
  description: string | null;
  teacherName?: string;
  authorName?: string;
  subject: { id: string; name: string } | null;
  cards: FlashCard[];
}
export type MasteryState = 'KNOWN' | 'LEARNING';
export type MasteryMap = Record<string, MasteryState | string>;

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Ignores case, surrounding space and repeated inner spaces; nothing looser. */
export function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/** One deck is reachable from two places: the teacher preview and a student's assigned deck. */
export function useDeckRoutes(id: string | undefined) {
  const location = useLocation();
  const isStudentRoute = location.pathname.startsWith('/student/');
  const base = isStudentRoute ? `/student/flashcards/${id}` : `/flashcards/${id}`;
  return {
    isStudentRoute,
    list: isStudentRoute ? '/student/flashcards' : '/flashcards',
    study: isStudentRoute ? base : `${base}/study`,
    quiz: `${base}/quiz`,
    match: `${base}/match`,
    spell: `${base}/spell`,
  };
}

export function useDeck(id: string | undefined) {
  const [deck, setDeck] = useState<DeckDetail | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    if (!id) return;
    setStatus('loading');
    setDeck(null);
    apiGet<DeckDetail>(`/api/flashcards/decks/${id}`)
      .then((data) => { setDeck({ ...data, cards: data.cards || [] }); setStatus('ready'); })
      .catch((error: any) => { setMessage(error?.message || ''); setStatus('error'); });
  }, [id]);

  useEffect(load, [load]);
  return { deck, status, message, reload: load };
}

/* ── Tally marks: the signature mark for a card's state ───────────────────── */

const TALLY_LIMIT = 48;

export function TallyMarks({
  total,
  known,
  learning,
  label,
  className = '',
}: { total: number; known: number; learning: number; label?: string; className?: string }) {
  const fresh = Math.max(0, total - known - learning);
  const summary = label ?? `${known} known, ${learning} still learning, ${fresh} not yet marked, of ${total} cards`;
  if (total <= 0) return null;
  if (total > TALLY_LIMIT) {
    // Large decks: the same three states as proportional runs of one rule.
    return (
      <div className={`flex h-2.5 w-full overflow-hidden ${className}`} role="img" aria-label={summary}>
        <span className="h-full bg-academic-teal" style={{ width: `${(known / total) * 100}%` }} />
        <span className="h-full bg-academic-coral" style={{ width: `${(learning / total) * 100}%` }} />
        <span className="h-full flex-1 bg-border" />
      </div>
    );
  }
  const marks = [
    ...Array.from({ length: known }, () => 'bg-academic-teal'),
    ...Array.from({ length: learning }, () => 'bg-academic-coral'),
    ...Array.from({ length: fresh }, () => 'bg-border'),
  ];
  return (
    <div className={`flex items-end gap-[3px] ${className}`} role="img" aria-label={summary}>
      {marks.map((tone, i) => (
        <span key={i} className={`block h-3.5 w-[3px] shrink-0 ${tone} ${(i + 1) % 5 === 0 ? 'mr-1' : ''}`} />
      ))}
    </div>
  );
}

export function masteryCounts(cards: FlashCard[], mastery: MasteryMap) {
  let known = 0;
  let learning = 0;
  for (const card of cards) {
    if (mastery[card.id] === 'KNOWN') known++;
    else if (mastery[card.id] === 'LEARNING') learning++;
  }
  return { known, learning, fresh: cards.length - known - learning };
}

/* ── Progress rule (2px, under the control bar) ──────────────────────────── */

export function ProgressRule({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      className="h-0.5 w-full bg-border"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <div className="h-full bg-academic-teal transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ── States ──────────────────────────────────────────────────────────────── */

export function DeckSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading deck…</span>
      <div className="space-y-3 border-b border-border pb-4">
        <div className="h-7 w-2/3 bg-muted motion-safe:animate-pulse" />
        <div className="h-4 w-1/3 bg-muted motion-safe:animate-pulse" />
        <div className="flex gap-6 pt-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-5 w-16 bg-muted motion-safe:animate-pulse" />)}</div>
      </div>
      <div className="h-72 w-full border border-border bg-card" />
    </div>
  );
}

export function StatePanel({
  title,
  body,
  action,
  tone = 'neutral',
}: { title: string; body?: ReactNode; action?: ReactNode; tone?: 'neutral' | 'error' }) {
  return (
    <div
      className={`border bg-card px-6 py-10 text-center ${tone === 'error' ? 'border-destructive/40' : 'border-border'}`}
      role={tone === 'error' ? 'alert' : undefined}
    >
      <p className="text-base font-semibold text-foreground">{title}</p>
      {body && <div className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{body}</div>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function RetryButton({ onClick, label = 'Try again' }: { onClick: () => void; label?: string }) {
  return (
    <Button variant="outline" onClick={onClick}>
      <RefreshCw className="h-4 w-4" aria-hidden="true" /> {label}
    </Button>
  );
}

/** Loading, failed and empty decks, handled the same way in every mode. */
export function DeckGate({
  status,
  deck,
  reload,
  listUrl,
  minCards = 1,
  modeName,
  children,
}: {
  status: 'loading' | 'ready' | 'error';
  deck: DeckDetail | null;
  reload: () => void;
  listUrl: string;
  minCards?: number;
  modeName?: string;
  children: (deck: DeckDetail) => ReactNode;
}) {
  if (status === 'loading') return <DeckSkeleton />;
  if (status === 'error' || !deck) {
    return (
      <div className="mx-auto max-w-2xl">
        <StatePanel
          tone="error"
          title="This deck couldn't be opened"
          body="It may have been removed, or it isn't assigned to your class. Check your connection and try again."
          action={<><RetryButton onClick={reload} /><Button variant="ghost" render={<Link to={listUrl} />} nativeButton={false}>Back to flashcards</Button></>}
        />
      </div>
    );
  }
  return <>{children(deck)}</>;
}

/* ── Deck shell: one header for every mode ──────────────────────────────── */

export function DeckShell({
  deck,
  routes,
  aside,
  children,
}: {
  deck: DeckDetail;
  routes: ReturnType<typeof useDeckRoutes>;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const tabs = [
    { to: routes.study, label: 'Flashcards', end: true },
    { to: routes.quiz, label: 'Quiz' },
    { to: routes.match, label: 'Match' },
    { to: routes.spell, label: 'Spell' },
  ];
  const author = deck.authorName || deck.teacherName;
  return (
    <div className="mx-auto w-full max-w-4xl pb-24 md:pb-12">
      <header className="border-b border-foreground">
        <Link
          to={routes.list}
          className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-accent-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {routes.isStudentRoute ? 'My flashcards' : 'Flashcard library'}
        </Link>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground [overflow-wrap:anywhere]">{deck.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {deck.cards.length} card{deck.cards.length === 1 ? '' : 's'}
              {deck.subject ? ` · ${deck.subject.name}` : ''}
              {author ? ` · by ${author}` : ''}
            </p>
          </div>
          {aside}
        </div>
        <nav aria-label="Study modes" className="-mb-px mt-4 flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `inline-flex min-h-11 shrink-0 items-center border-b-2 px-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-academic-teal text-accent-foreground'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <div className="mt-6">{children}</div>
    </div>
  );
}

/* ── Results: one summary layout for Quiz, Match and Spell ───────────────── */

export function ResultSummary({
  heading,
  stats,
  missed,
  missedTitle,
  actions,
}: {
  heading: string;
  stats: { label: string; value: string; strong?: boolean }[];
  missed?: { term: string; given: string; correct: string }[];
  missedTitle?: string;
  actions: ReactNode;
}) {
  return (
    <section aria-labelledby="result-heading" className="border border-border bg-card">
      <div className="border-b border-foreground px-5 py-4 sm:px-6">
        <h2 id="result-heading" className="text-xl font-semibold tracking-tight text-foreground" tabIndex={-1}>{heading}</h2>
      </div>
      <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b border-border px-5 py-4 sm:px-6">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-baseline gap-2">
            <dt className="text-sm text-muted-foreground">{stat.label}</dt>
            <dd className={`tabular-nums tracking-tight text-foreground ${stat.strong ? 'text-3xl font-semibold' : 'text-base font-semibold'}`}>{stat.value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap gap-2 border-b border-border px-5 py-4 sm:px-6">{actions}</div>
      {missed && missed.length > 0 && (
        <div className="px-5 py-4 sm:px-6">
          <h3 className="text-sm font-semibold text-foreground">{missedTitle ?? 'To review'}</h3>
          <ol className="mt-2 divide-y divide-border border-y border-border">
            {missed.map((item, i) => (
              <li key={i} className="grid gap-1 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-4">
                <span className="font-medium text-foreground [overflow-wrap:anywhere]"><MathText>{item.term}</MathText></span>
                <span className="text-muted-foreground [overflow-wrap:anywhere]">
                  <span className="text-destructive">You: {item.given ? <MathText>{item.given}</MathText> : 'no answer'}</span>
                  <span className="mx-1.5" aria-hidden="true">·</span>
                  <span className="text-foreground">Answer: <MathText>{item.correct}</MathText></span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

    </section>
  );
}

export function ModeIntro({ title, children, action }: { title: string; children: ReactNode; action: ReactNode }) {
  return (
    <section className="border border-border bg-card" aria-labelledby="mode-intro">
      <div className="border-b border-foreground px-5 py-4 sm:px-6">
        <h2 id="mode-intro" className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      </div>
      <div className="space-y-4 px-5 py-5 sm:px-6">{children}</div>
      <div className="border-t border-border px-5 py-4 sm:px-6">{action}</div>
    </section>
  );
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener?.('change', onChange);
    return () => query.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}
