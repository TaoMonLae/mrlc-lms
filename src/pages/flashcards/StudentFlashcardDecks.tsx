import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { apiGet } from '../../lib/api';
import { RetryButton, StatePanel, TallyMarks } from './shared';

interface DeckRow {
  id: string;
  title: string;
  description: string | null;
  updatedAt: string;
  subject: { id: string; name: string } | null;
  teacherName: string;
  authorName?: string;
  cardCount: number;
  knownCount: number;
}

export default function StudentFlashcardDecks() {
  const [decks, setDecks] = useState<DeckRow[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = () => {
    setStatus('loading');
    apiGet<DeckRow[]>('/api/flashcards/my-decks')
      .then((d) => { setDecks(Array.isArray(d) ? d : []); setStatus('ready'); })
      .catch(() => setStatus('error'));
  };
  useEffect(load, []);

  const totalCards = decks.reduce((sum, d) => sum + d.cardCount, 0);
  const totalKnown = decks.reduce((sum, d) => sum + Math.min(d.knownCount, d.cardCount), 0);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Flashcards</h1>
          <p className="mt-1 text-sm text-muted-foreground">Decks your teachers assigned to your class.</p>
        </div>
        {status === 'ready' && totalCards > 0 && (
          <p className="text-sm text-muted-foreground tabular-nums">
            <span className="text-lg font-semibold text-foreground">{totalKnown}</span> of {totalCards} cards known
          </p>
        )}
      </div>

      {status === 'loading' ? (
        <div className="divide-y divide-border border border-border bg-card" aria-busy="true">
          <span className="sr-only">Loading your decks…</span>
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2 px-5 py-5">
              <div className="h-5 w-1/2 bg-muted motion-safe:animate-pulse" />
              <div className="h-3 w-1/3 bg-muted motion-safe:animate-pulse" />
            </div>
          ))}
        </div>
      ) : status === 'error' ? (
        <StatePanel tone="error" title="Your decks couldn't be loaded" body="Check your connection and try again." action={<RetryButton onClick={load} />} />
      ) : decks.length === 0 ? (
        <StatePanel title="No decks assigned yet" body="When a teacher assigns a flashcard deck to your class, it will appear here." />
      ) : (
        <ol className="divide-y divide-border border-y border-foreground bg-card">
          {decks.map((d) => {
            const known = Math.min(d.knownCount, d.cardCount);
            const toLearn = d.cardCount - known;
            return (
              <li key={d.id} className="grid gap-3 px-4 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,15rem)] sm:gap-6 sm:px-5">
                <div className="min-w-0">
                  <Link to={`/student/flashcards/${d.id}`} className="group inline-flex items-baseline gap-2 text-lg font-semibold tracking-tight text-foreground hover:text-accent-foreground">
                    <span className="[overflow-wrap:anywhere] group-hover:underline">{d.title}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 translate-y-0.5 text-muted-foreground group-hover:text-accent-foreground" aria-hidden="true" />
                  </Link>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {[d.subject?.name, `${d.cardCount} card${d.cardCount === 1 ? '' : 's'}`, `by ${d.authorName || d.teacherName || 'your teacher'}`].filter(Boolean).join(' · ')}
                  </p>
                  {d.description && <p className="mt-2 line-clamp-2 text-sm text-foreground">{d.description}</p>}
                  <nav aria-label={`Practise ${d.title}`} className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
                    <Link className="inline-flex min-h-9 items-center text-accent-foreground hover:text-foreground" to={`/student/flashcards/${d.id}/quiz`}>Quiz</Link>
                    <Link className="inline-flex min-h-9 items-center text-accent-foreground hover:text-foreground" to={`/student/flashcards/${d.id}/match`}>Match</Link>
                    <Link className="inline-flex min-h-9 items-center text-accent-foreground hover:text-foreground" to={`/student/flashcards/${d.id}/spell`}>Spell</Link>
                  </nav>
                </div>
                {d.cardCount > 0 && (
                  <div className="sm:pt-1.5">
                    <TallyMarks total={d.cardCount} known={known} learning={0} label={`${known} of ${d.cardCount} cards known`} />
                    <p className="mt-1.5 text-sm tabular-nums text-muted-foreground">
                      {toLearn === 0 ? <span className="font-semibold text-accent-foreground">All {d.cardCount} known</span> : <><span className="font-semibold text-foreground">{known}</span> known · {toLearn} to learn</>}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
