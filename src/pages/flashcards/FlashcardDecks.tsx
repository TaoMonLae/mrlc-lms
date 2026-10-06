import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Copy, Download, MoreHorizontal, Plus, Search, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { apiGet, apiSend } from '../../lib/api';
import { cardsToCsv, downloadCsv } from '../../lib/flashcardCsv';
import { RetryButton, StatePanel } from './shared';

interface DeckRow {
  id: string;
  title: string;
  description: string | null;
  updatedAt: string;
  subject: { id: string; name: string } | null;
  teacherName: string;
  authorName?: string;
  cardCount: number;
  classes?: { id: string; name: string }[];
  shared?: boolean;
}

type Tab = 'mine' | 'community';
type LoadState<T> = { status: 'idle' | 'loading' | 'ready' | 'error'; rows: T[] };

const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export default function FlashcardDecks() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('mine');
  const [mine, setMine] = useState<LoadState<DeckRow>>({ status: 'loading', rows: [] });
  const [community, setCommunity] = useState<LoadState<DeckRow>>({ status: 'idle', rows: [] });
  const [query, setQuery] = useState('');
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DeckRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadMine = () => {
    setMine((s) => ({ ...s, status: 'loading' }));
    apiGet<DeckRow[]>('/api/flashcards/decks')
      .then((rows) => setMine({ status: 'ready', rows: Array.isArray(rows) ? rows : [] }))
      .catch(() => setMine({ status: 'error', rows: [] }));
  };
  const loadCommunity = () => {
    setCommunity((s) => ({ ...s, status: 'loading' }));
    apiGet<DeckRow[]>('/api/flashcards/community')
      .then((rows) => setCommunity({ status: 'ready', rows: Array.isArray(rows) ? rows : [] }))
      .catch(() => setCommunity({ status: 'error', rows: [] }));
  };
  useEffect(loadMine, []);
  useEffect(() => { if (tab === 'community' && community.status === 'idle') loadCommunity(); }, [tab, community.status]);

  const current = tab === 'mine' ? mine : community;
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return current.rows;
    return current.rows.filter((d) => [d.title, d.description, d.subject?.name, d.authorName, d.teacherName].some((v) => v?.toLowerCase().includes(q)));
  }, [current.rows, query]);
  const unassigned = mine.rows.filter((d) => (d.classes?.length ?? 0) === 0).length;

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiSend(`/api/flashcards/decks/${pendingDelete.id}`, 'DELETE');
      setMine((s) => ({ ...s, rows: s.rows.filter((d) => d.id !== pendingDelete.id) }));
      toast.success(`Deleted “${pendingDelete.title}”`);
      setPendingDelete(null);
    } catch (e: any) {
      toast.error(e?.message || 'The deck could not be deleted');
    } finally {
      setDeleting(false);
    }
  };

  const exportDeck = async (deck: DeckRow) => {
    try {
      const full = await apiGet<{ cards: { term: string; definition: string }[] }>(`/api/flashcards/decks/${deck.id}`);
      if (!full.cards?.length) { toast.error('This deck has no cards to export'); return; }
      downloadCsv(`${deck.title.replace(/[^\w\- ]+/g, '') || 'flashcards'}.csv`, cardsToCsv(full.cards));
    } catch (e: any) {
      toast.error(e?.message || 'The deck could not be exported');
    }
  };

  const cloneDeck = async (deck: DeckRow) => {
    setCloningId(deck.id);
    try {
      const res = await apiSend<{ id: string }>(`/api/flashcards/decks/${deck.id}/clone`, 'POST', {});
      toast.success(`Copied “${deck.title}” to your decks`);
      navigate(`/flashcards/${res.id}/edit`);
    } catch (e: any) {
      toast.error(e?.message || 'The deck could not be copied');
    } finally {
      setCloningId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-16 md:pb-0">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Flashcards</h1>
          <p className="mt-1 text-sm text-muted-foreground">Build study decks, assign them to classes and see who is keeping up.</p>
        </div>
        <Button render={<Link to="/flashcards/new" />} nativeButton={false}>
          <Plus className="h-4 w-4" aria-hidden="true" /> New deck
        </Button>
      </div>

      <section className="border border-border bg-card" aria-label="Decks">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-foreground px-4 pt-2 sm:px-5">
          <div role="tablist" aria-label="Deck library" className="-mb-px flex">
            {([['mine', `My decks${mine.status === 'ready' ? ` ${mine.rows.length}` : ''}`], ['community', 'Shared by teachers']] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={`min-h-11 border-b-2 px-3 text-sm font-semibold tabular-nums ${tab === value ? 'border-academic-teal text-accent-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative mb-2 w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search decks" aria-label="Search decks" className="pl-9" />
          </div>
        </div>

        {tab === 'mine' && mine.status === 'ready' && unassigned > 0 && (
          <p className="border-b border-border bg-academic-coral/10 px-4 py-2.5 text-sm text-foreground sm:px-5">
            {unassigned} deck{unassigned === 1 ? ' isn’t' : 's aren’t'} assigned to a class yet, so students can’t see {unassigned === 1 ? 'it' : 'them'}.
          </p>
        )}

        {current.status === 'loading' || current.status === 'idle' ? (
          <div className="divide-y divide-border" aria-busy="true">
            <span className="sr-only">Loading decks…</span>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="h-4 w-1/3 bg-muted motion-safe:animate-pulse" />
                <div className="ml-auto h-4 w-20 bg-muted motion-safe:animate-pulse" />
              </div>
            ))}
          </div>
        ) : current.status === 'error' ? (
          <div className="p-4"><StatePanel tone="error" title="Decks couldn't be loaded" body="Check your connection and try again." action={<RetryButton onClick={tab === 'mine' ? loadMine : loadCommunity} />} /></div>
        ) : current.rows.length === 0 ? (
          <div className="p-4">
            {tab === 'mine' ? (
              <StatePanel
                title="No decks yet"
                body="A deck is a list of terms and definitions. Make one from scratch, import a CSV, or copy one another teacher has shared."
                action={<>
                  <Button render={<Link to="/flashcards/new" />} nativeButton={false}><Plus className="h-4 w-4" aria-hidden="true" /> New deck</Button>
                  <Button variant="outline" onClick={() => setTab('community')}>Browse shared decks</Button>
                </>}
              />
            ) : (
              <StatePanel title="No shared decks yet" body="When a teacher shares a deck, it appears here for you to copy and adapt." />
            )}
          </div>
        ) : rows.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">No decks match “{query}”.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="hidden border-b border-border text-xs font-medium text-muted-foreground md:table-header-group">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-medium">Deck</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Cards</th>
                <th scope="col" className="px-3 py-2.5 font-medium">{tab === 'mine' ? 'Classes' : 'Shared by'}</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Updated</th>
                <th scope="col" className="px-5 py-2.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((deck) => (
                <tr key={deck.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-4 py-3 align-top hover:bg-muted/30 md:table-row md:px-0 md:py-0">
                  <td className="md:px-5 md:py-3.5">
                    <Link to={tab === 'mine' ? `/flashcards/${deck.id}/edit` : `/flashcards/${deck.id}/study`} className="font-semibold text-foreground hover:text-accent-foreground hover:underline [overflow-wrap:anywhere]">
                      {deck.title}
                    </Link>
                    {deck.shared && tab === 'mine' && (
                      <span className="ml-2 inline-flex items-center gap-1 align-middle text-xs text-muted-foreground"><Share2 className="h-3 w-3" aria-hidden="true" /> Shared</span>
                    )}
                    <p className="mt-0.5 line-clamp-1 text-muted-foreground">
                      {[deck.subject?.name, deck.description].filter(Boolean).join(' · ') || 'No description'}
                    </p>
                  </td>
                  <td className="col-start-1 text-xs text-muted-foreground md:px-3 md:py-3.5 md:text-right md:text-sm md:text-foreground md:tabular-nums">
                    <span className="md:hidden">{deck.cardCount} card{deck.cardCount === 1 ? '' : 's'}</span><span className="hidden md:inline">{deck.cardCount}</span>
                  </td>
                  <td className="col-start-1 md:px-3 md:py-3.5">
                    {tab === 'mine' ? (
                      deck.classes && deck.classes.length > 0
                        ? <span className="text-foreground">{deck.classes.map((c) => c.name).join(', ')}</span>
                        : <span className="inline-flex bg-academic-coral/20 px-1.5 py-0.5 text-xs font-semibold text-foreground">Not assigned</span>
                    ) : (
                      <span className="text-foreground">{deck.authorName || deck.teacherName || 'A teacher'}</span>
                    )}
                  </td>
                  <td className="col-start-1 whitespace-nowrap text-xs text-muted-foreground md:px-3 md:py-3.5 md:text-sm md:tabular-nums">
                    <span className="md:hidden">Updated </span>{dateFormat.format(new Date(deck.updatedAt))}
                  </td>
                  <td className="col-start-2 row-span-4 row-start-1 flex items-start justify-end gap-1 md:table-cell md:px-5 md:py-2.5 md:text-right">
                    {tab === 'mine' ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="outline" size="sm" render={<Link to={`/flashcards/${deck.id}/study`} />} nativeButton={false} className="hidden sm:inline-flex">Preview</Button>
                        <Button variant="outline" size="sm" render={<Link to={`/flashcards/${deck.id}/progress`} />} nativeButton={false} className="hidden lg:inline-flex">Progress</Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`More actions for ${deck.title}`} />}>
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem render={<Link to={`/flashcards/${deck.id}/edit`} />}>Edit deck</DropdownMenuItem>
                            <DropdownMenuItem render={<Link to={`/flashcards/${deck.id}/study`} />}>Preview as student</DropdownMenuItem>
                            <DropdownMenuItem render={<Link to={`/flashcards/${deck.id}/progress`} />}>Student progress</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportDeck(deck)}><Download className="h-4 w-4" aria-hidden="true" /> Export CSV</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => setPendingDelete(deck)}>Delete deck…</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="outline" size="sm" render={<Link to={`/flashcards/${deck.id}/study`} />} nativeButton={false} className="hidden sm:inline-flex">Preview</Button>
                        <Button variant="outline" size="sm" onClick={() => cloneDeck(deck)} disabled={cloningId === deck.id}>
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" /> {cloningId === deck.id ? 'Copying…' : 'Copy to my decks'}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <Dialog open={!!pendingDelete} onOpenChange={(open) => { if (!open && !deleting) setPendingDelete(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete “{pendingDelete?.title}”?</DialogTitle>
            <DialogDescription>
              Its {pendingDelete?.cardCount} cards and every student’s progress on them will be removed. This can’t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)} disabled={deleting}>Keep deck</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete deck'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
