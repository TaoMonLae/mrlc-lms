import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiGet } from '../../lib/api';
import { RetryButton, StatePanel, TallyMarks, formatDuration, percent } from './shared';

interface AttemptSummary { score: number; total: number; durationMs: number | null; createdAt: string }
interface StudentProgress {
  id: string;
  name: string;
  studentCode: string;
  known: number;
  bestByMode: { QUIZ?: AttemptSummary; SPELL?: AttemptSummary; MATCH?: AttemptSummary };
  lastActivity: string | null;
}
interface ProgressResponse { totalCards: number; students: StudentProgress[] }

type SortKey = 'name' | 'known' | 'activity';

const dateTime = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function score(a?: AttemptSummary) {
  return a && a.total ? `${percent(a.score, a.total)}%` : '—';
}

export default function FlashcardDeckProgress() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ProgressResponse | null>(null);
  const [deckTitle, setDeckTitle] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [sort, setSort] = useState<SortKey>('known');

  const load = useCallback(() => {
    if (!id) return;
    setStatus('loading');
    Promise.all([
      apiGet<ProgressResponse>(`/api/flashcards/decks/${id}/progress`),
      apiGet<{ title: string }>(`/api/flashcards/decks/${id}`).catch(() => ({ title: '' })),
    ])
      .then(([progress, deck]) => { setData(progress); setDeckTitle(deck.title); setStatus('ready'); })
      .catch(() => setStatus('error'));
  }, [id]);
  useEffect(load, [load]);

  const rows = useMemo(() => {
    const list = [...(data?.students ?? [])];
    if (sort === 'name') list.sort((a, b) => (a.name || a.studentCode).localeCompare(b.name || b.studentCode));
    if (sort === 'known') list.sort((a, b) => a.known - b.known);
    if (sort === 'activity') list.sort((a, b) => (a.lastActivity ? Date.parse(a.lastActivity) : 0) - (b.lastActivity ? Date.parse(b.lastActivity) : 0));
    return list;
  }, [data, sort]);

  const total = data?.totalCards ?? 0;
  const notStarted = (data?.students ?? []).filter((s) => !s.lastActivity).length;
  const allKnown = (data?.students ?? []).filter((s) => total > 0 && s.known >= total).length;
  const average = data && data.students.length && total ? Math.round(data.students.reduce((sum, s) => sum + percent(s.known, total), 0) / data.students.length) : 0;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-10">
      <div>
        <Link to="/flashcards" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-accent-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Flashcard library
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Student progress</h1>
        {deckTitle && <p className="mt-1 text-sm text-muted-foreground">{deckTitle} · {total} card{total === 1 ? '' : 's'}</p>}
      </div>

      {status === 'loading' ? (
        <div className="h-64 border border-border bg-card" aria-busy="true"><span className="sr-only">Loading progress…</span></div>
      ) : status === 'error' || !data ? (
        <StatePanel tone="error" title="Progress couldn't be loaded" body="Check your connection and try again." action={<RetryButton onClick={load} />} />
      ) : data.students.length === 0 ? (
        <StatePanel
          title="No students yet"
          body="Assign this deck to a class and each student's progress will appear here."
          action={<Button variant="outline" render={<Link to={`/flashcards/${id}/edit`} />} nativeButton={false}>Assign to a class</Button>}
        />
      ) : (
        <>
          <p className="border-y border-foreground py-3 text-sm text-muted-foreground">
            <span className="text-foreground"><strong className="text-lg font-semibold tabular-nums">{data.students.length}</strong> student{data.students.length === 1 ? '' : 's'}</span>
            <span className="mx-2" aria-hidden="true">·</span>
            on average <strong className="font-semibold tabular-nums text-foreground">{average}%</strong> of cards known
            <span className="mx-2" aria-hidden="true">·</span>
            <strong className="font-semibold tabular-nums text-foreground">{allKnown}</strong> know every card
            {notStarted > 0 && (<>
              <span className="mx-2" aria-hidden="true">·</span>
              <span className="bg-academic-coral/20 px-1.5 py-0.5 font-semibold text-foreground"><span className="tabular-nums">{notStarted}</span> not started</span>
            </>)}
          </p>

          <section className="border border-border bg-card" aria-labelledby="progress-table">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-foreground px-5 py-3">
              <h2 id="progress-table" className="text-base font-semibold text-foreground">Students</h2>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                Sort by
                <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-9 border border-input bg-card px-2 text-sm text-foreground">
                  <option value="known">Fewest cards known</option>
                  <option value="activity">Least recent activity</option>
                  <option value="name">Name</option>
                </select>
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-left text-sm">
                <thead className="border-b border-border text-xs font-medium text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-5 py-2.5 font-medium">Student</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Cards known</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Quiz best</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Spelling best</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Match best</th>
                    <th scope="col" className="px-5 py-2.5 font-medium">Last studied</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30">
                      <th scope="row" className="px-5 py-3 font-semibold text-foreground">
                        {s.name || s.studentCode}
                        {s.name && <span className="block text-xs font-normal text-muted-foreground tabular-nums">{s.studentCode}</span>}
                      </th>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <TallyMarks total={total} known={Math.min(s.known, total)} learning={0} label={`${s.known} of ${total} known`} className="w-32 max-w-[8rem] flex-wrap" />
                          <span className="tabular-nums text-foreground">{s.known}/{total}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-foreground">{score(s.bestByMode.QUIZ)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-foreground">{score(s.bestByMode.SPELL)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-foreground">
                        {s.bestByMode.MATCH ? (
                          <>
                            {s.bestByMode.MATCH.durationMs != null ? formatDuration(s.bestByMode.MATCH.durationMs) : '—'}
                            <span className="block text-xs text-muted-foreground">{s.bestByMode.MATCH.total - s.bestByMode.MATCH.score} mistakes</span>
                          </>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-3 tabular-nums text-muted-foreground">
                        {s.lastActivity ? dateTime.format(new Date(s.lastActivity)) : <span className="inline-flex bg-academic-coral/20 px-1.5 py-0.5 text-xs font-semibold text-foreground">Not started</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
